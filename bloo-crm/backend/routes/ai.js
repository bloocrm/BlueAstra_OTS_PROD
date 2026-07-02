/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   AI INSIGHTS API
   - CRM assistant chat
   - Duplicate lead detection + merge (rule-based, no AI needed)
   - Email sentiment/intent/follow-up analysis (LLM + heuristic fallback)
   - Follow-up email drafting (LLM + template fallback)
   ===================================================== */

const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const Client = require('../models/Client');
const { verifyToken } = require('../middleware/auth');

// Optional models — loaded defensively so AI still works if any is absent
function tryModel(name) { try { return require('../models/' + name); } catch (e) { return null; } }
const Meeting = tryModel('Meeting');
const Email = tryModel('Email');
const Employee = tryModel('Employee');
const Vendor = tryModel('Vendor');
const Grievance = tryModel('Grievance');
const WorkflowTask = tryModel('WorkflowTask');
const Approval = tryModel('Approval');
const LeaveApplication = tryModel('LeaveApplication');

router.use(verifyToken);

// ---------- Whole-CRM context snapshot (compact, token-efficient) ----------
async function buildCrmContext(userId) {
  const safe = async (p) => { try { return await p; } catch (e) { return null; } };
  const countBy = (arr, key) => arr.reduce((o, x) => { const k = x[key] || 'unknown'; o[k] = (o[k] || 0) + 1; return o; }, {});

  const [clients, leads, meetings, emailCount, employees, vendors, grievances, tasks, approvals, leaves] = await Promise.all([
    safe(Client.find({ userId, deletedAt: null }).select('status investmentPreference riskProfile name company').limit(1000).lean()) || [],
    safe(Lead.find({ userId, deletedAt: null }).select('status source company name createdAt').limit(1000).lean()) || [],
    Meeting ? (safe(Meeting.find({ userId }).select('startTime status clientName').sort({ startTime: -1 }).limit(50).lean()) || []) : [],
    Email ? (safe(Email.countDocuments({ userId, deletedAt: null })) || 0) : 0,
    Employee ? (safe(Employee.find({ userId }).select('status department').limit(500).lean()) || []) : [],
    Vendor ? (safe(Vendor.find({ userId }).select('name status revenue performance risk').limit(200).lean()) || []) : [],
    Grievance ? (safe(Grievance.find({ userId }).select('status').lean()) || []) : [],
    WorkflowTask ? (safe(WorkflowTask.find({ userId }).select('status').lean()) || []) : [],
    Approval ? (safe(Approval.find({ userId }).select('status type').lean()) || []) : [],
    LeaveApplication ? (safe(LeaveApplication.find({ userId }).select('status').lean()) || []) : []
  ]);

  const cl = clients || [], ld = leads || [];
  const leadFunnel = countBy(ld, 'status');
  const converted = leadFunnel.converted || 0;
  const conversionRate = ld.length ? Math.round((converted / ld.length) * 100) : 0;
  const vendorRevenue = (vendors || []).map(v => ({
    name: v.name,
    revenue: ['q1', 'q2', 'q3', 'q4'].reduce((s, q) => s + ((v.revenue && v.revenue[q]) || 0), 0),
    perf: Math.round(['q1', 'q2', 'q3', 'q4'].reduce((s, q) => s + ((v.performance && v.performance[q]) || 0), 0) / 4),
    risk: Math.round(['q1', 'q2', 'q3', 'q4'].reduce((s, q) => s + ((v.risk && v.risk[q]) || 0), 0) / 4)
  }));

  const data = {
    clients: { total: cl.length, byStatus: countBy(cl, 'status'), byInvestmentPreference: countBy(cl, 'investmentPreference'), byRiskProfile: countBy(cl, 'riskProfile') },
    leads: { total: ld.length, funnel: leadFunnel, conversionRate, bySource: countBy(ld, 'source') },
    meetings: { total: (meetings || []).length, recent: (meetings || []).slice(0, 5).map(m => ({ title: m.title, client: m.clientName, when: m.startTime })) },
    emailsStored: emailCount || 0,
    employees: { total: (employees || []).length, byStatus: countBy(employees || [], 'status') },
    vendors: { total: (vendors || []).length, topByRevenue: vendorRevenue.sort((a, b) => b.revenue - a.revenue).slice(0, 5) },
    openGrievances: (grievances || []).filter(g => g.status !== 'resolved').length,
    openTasks: (tasks || []).filter(t => t.status !== 'done').length,
    pendingApprovals: (approvals || []).filter(a => a.status === 'pending').length,
    pendingLeave: (leaves || []).filter(l => l.status === 'pending').length
  };

  const summary = `CRM snapshot: ${data.clients.total} clients (${JSON.stringify(data.clients.byStatus)}); `
    + `${data.leads.total} leads, funnel ${JSON.stringify(data.leads.funnel)}, conversion ${conversionRate}%; `
    + `${data.meetings.total} meetings; ${data.emailsStored} stored emails; `
    + `${data.employees.total} employees (${JSON.stringify(data.employees.byStatus)}); `
    + `${data.vendors.total} vendors (top revenue: ${data.vendors.topByRevenue.map(v => v.name + ' $' + v.revenue).join(', ') || 'none'}); `
    + `${data.openGrievances} open grievances, ${data.openTasks} open tasks, ${data.pendingApprovals} pending approvals.`;

  return { data, summary };
}

// ---------- OpenAI helper (returns text, or null on any failure) ----------
async function callOpenAI(messages, { json = false, maxTokens = 500 } = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages,
        max_tokens: maxTokens,
        temperature: 0.4,
        ...(json ? { response_format: { type: 'json_object' } } : {})
      })
    });
    if (!resp.ok) { console.warn('OpenAI', resp.status, (await resp.text()).slice(0, 160)); return null; }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) { console.warn('OpenAI call failed:', e.message); return null; }
}

// ---------- Assistant chat ----------
router.post('/chat', async (req, res) => {
  const msg = (req.body && req.body.message || '').toString().trim();
  if (!msg) return res.status(400).json({ error: 'message is required' });

  let ctxSummary = '';
  try { ctxSummary = (await buildCrmContext(req.userId)).summary; } catch (e) {}
  const system = `You are the Bloo CRM in-app assistant for Blue Astra Technologies. You can see the user's live CRM data and help with clients, leads, email/Outlook, meetings, calendar, HR/Employee Dashboard, vendors, leave/approvals — and give data-grounded advice on conversion and sales opportunities. Be concise and practical. For a bug, suggest a hard refresh (Ctrl+Shift+R); for urgent help, Customer Care at 1-800-CALL-BLOO-CRM.\n\nLIVE CRM DATA: ${ctxSummary}`;
  const ai = await callOpenAI([{ role: 'system', content: system }, { role: 'user', content: msg }], { maxTokens: 450 });
  if (ai) return res.json({ status: 'success', reply: ai, source: 'ai' });

  // Fallback: keyword help
  const m = msg.toLowerCase();
  let reply = 'I can help with clients, leads, email, meetings, HR and vendors. ';
  if (m.includes('email') || m.includes('outlook')) reply = 'For email: open the Email section, click Connect on Microsoft Outlook, and sign in on Microsoft\'s page. Emails then sync into the Email Client. If they don\'t appear, hard-refresh (Ctrl+Shift+R) and click Sync.';
  else if (m.includes('client') || m.includes('lead')) reply = 'Add clients/leads from their tabs — records are saved to the cloud and reload on login. Use the AI Duplicate Detection here to find and merge duplicate leads.';
  else if (m.includes('meeting') || m.includes('invite')) reply = 'Start a meeting from the Meeting Room; invites email a join link. If an invite is missing, check the recipient\'s spam folder.';
  else if (m.includes('broken') || m.includes('empty') || m.includes('not work')) reply = 'Try a hard refresh: Ctrl+Shift+R. If a section stays empty, contact Customer Care at 1-800-CALL-BLOO-CRM.';
  else reply += 'Ask me about a specific area, or call Customer Care at 1-800-CALL-BLOO-CRM.';
  res.json({ status: 'success', reply, source: 'fallback' });
});

// ---------- Whole-CRM strategic insights ----------
router.get('/insights', async (req, res) => {
  let ctx;
  try { ctx = await buildCrmContext(req.userId); }
  catch (e) { return res.status(500).json({ error: 'Failed to read CRM data', message: e.message }); }

  const prompt = `You are a sales & growth strategist analyzing a financial-advisory CRM's live data (JSON below). Blue Astra sells CRM plans (basic, swift-ai-plus, rocket-ai-plus) and advisory services. Return STRICT JSON with keys:
conversionTips (array of 3-5 concrete, data-driven ways to improve lead->client conversion),
upsellOpportunities (array of 3-5 specific opportunities to get existing clients to buy more / upgrade plans / new services, referencing the data),
riskFlags (array of issues to watch, e.g. clogged approvals, risky vendors, disengaged leads),
actionItems (array of prioritized next actions),
headline (1 sentence summarizing the biggest opportunity).
CRM DATA:
${JSON.stringify(ctx.data)}`;

  const ai = await callOpenAI([{ role: 'system', content: 'You are a precise CRM growth strategist. Output only JSON.' }, { role: 'user', content: prompt }], { json: true, maxTokens: 900 });
  if (ai) { try { return res.json({ status: 'success', source: 'ai', context: ctx.data, insights: JSON.parse(ai) }); } catch (_) {} }

  // Fallback: rule-based insights from the snapshot
  const d = ctx.data;
  const insights = { conversionTips: [], upsellOpportunities: [], riskFlags: [], actionItems: [], headline: '' };
  const f = d.leads.funnel || {};
  if ((f.new || 0) > 0) insights.conversionTips.push(`You have ${f.new} new leads not yet qualified — qualify them within 48 hours to lift conversion.`);
  if ((f.negotiating || 0) > 0) insights.conversionTips.push(`${f.negotiating} leads are negotiating — prioritize these for closing this week.`);
  if (d.leads.conversionRate < 30 && d.leads.total > 0) insights.conversionTips.push(`Conversion is ${d.leads.conversionRate}%. Add a structured follow-up cadence and log every touchpoint.`);
  if ((d.clients.byStatus.active || 0) > 0) insights.upsellOpportunities.push(`${d.clients.byStatus.active} active clients — offer a plan upgrade (swift-ai-plus / rocket-ai-plus) or a portfolio review.`);
  if ((d.clients.byStatus.prospect || 0) > 0) insights.upsellOpportunities.push(`${d.clients.byStatus.prospect} prospects — nurture with targeted content to move them to active.`);
  if (d.vendors.topByRevenue.some(v => v.risk >= 50)) insights.riskFlags.push('One or more vendors have a high risk index — review contracts/BCP.');
  if (d.openGrievances > 0) insights.riskFlags.push(`${d.openGrievances} open grievances — resolve to protect retention.`);
  if (d.pendingApprovals > 0) insights.riskFlags.push(`${d.pendingApprovals} approvals pending — unclog the workflow.`);
  insights.actionItems.push('Follow up with the highest-intent leads today.');
  if ((d.clients.byStatus.active || 0) > 0) insights.actionItems.push('Send an upgrade/upsell offer to top active clients.');
  insights.headline = d.leads.total ? `Focus on your ${(f.negotiating||0)+(f.interested||0)} warm leads and upsell your ${d.clients.byStatus.active||0} active clients.` : 'Add leads and clients to unlock tailored growth insights.';
  res.json({ status: 'success', source: 'fallback', context: d, insights });
});

// ---------- Duplicate detection (leads) ----------
function norm(s) { return (s || '').toString().trim().toLowerCase(); }
function digits(s) { return (s || '').toString().replace(/\D/g, ''); }
function editDistance(a, b) {
  a = a || ''; b = b || '';
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[m][n];
}
function nameSim(a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b) return 0;
  const d = editDistance(a, b);
  return Math.round((1 - d / Math.max(a.length, b.length)) * 100);
}

router.get('/duplicates', async (req, res) => {
  try {
    const leads = await Lead.find({ userId: req.userId, deletedAt: null }).select('name email phone company status createdAt').lean();
    const pairs = [];
    for (let i = 0; i < leads.length; i++) {
      for (let j = i + 1; j < leads.length; j++) {
        const a = leads[i], b = leads[j];
        const reasons = [];
        let score = 0;
        if (a.email && norm(a.email) === norm(b.email)) { score = Math.max(score, 98); reasons.push('identical email'); }
        if (a.phone && digits(a.phone) && digits(a.phone) === digits(b.phone)) { score = Math.max(score, 95); reasons.push('identical phone'); }
        const ns = nameSim(a.name, b.name);
        if (ns >= 85) { score = Math.max(score, ns); reasons.push(`very similar names (${ns}%)`); }
        else if (ns >= 70 && a.company && norm(a.company) === norm(b.company)) { score = Math.max(score, 80); reasons.push(`similar names + same company`); }
        if (score >= 70) {
          pairs.push({
            score,
            explanation: `These two lead records likely refer to the same person: ${reasons.join(', ')}.`,
            recommendMerge: score >= 80,
            primary: { id: a._id, name: a.name, email: a.email, phone: a.phone, company: a.company, status: a.status },
            secondary: { id: b._id, name: b.name, email: b.email, phone: b.phone, company: b.company, status: b.status }
          });
        }
      }
    }
    pairs.sort((x, y) => y.score - x.score);
    res.json({ status: 'success', count: pairs.length, duplicates: pairs.slice(0, 50) });
  } catch (e) { res.status(500).json({ error: 'Duplicate detection failed', message: e.message }); }
});

// ---------- Merge two leads ----------
router.post('/merge', async (req, res) => {
  try {
    const { primaryId, secondaryId } = req.body || {};
    if (!primaryId || !secondaryId || primaryId === secondaryId) return res.status(400).json({ error: 'primaryId and secondaryId are required and must differ' });
    const primary = await Lead.findOne({ _id: primaryId, userId: req.userId, deletedAt: null });
    const secondary = await Lead.findOne({ _id: secondaryId, userId: req.userId, deletedAt: null });
    if (!primary || !secondary) return res.status(404).json({ error: 'Lead(s) not found' });

    // Fill blanks on primary from secondary
    ['email', 'phone', 'company', 'jobTitle', 'source', 'notes', 'industry', 'businessType', 'location'].forEach(f => {
      if (!primary[f] && secondary[f]) primary[f] = secondary[f];
    });
    primary.notes = [primary.notes, secondary.notes].filter(Boolean).join('\n---\n') || primary.notes;
    await primary.save();
    secondary.deletedAt = new Date();
    await secondary.save();

    res.json({ status: 'success', merged: primary, message: `Merged into ${primary.name}` });
  } catch (e) { res.status(500).json({ error: 'Merge failed', message: e.message }); }
});

// ---------- Email analysis ----------
router.post('/analyze-email', async (req, res) => {
  const text = (req.body && req.body.text || '').toString().trim();
  if (!text) return res.status(400).json({ error: 'Email text is required' });

  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Today is ${today}. Analyze this email from a client to a financial advisor. Return STRICT JSON with keys:
summary (1 sentence, e.g. "Client intends to revisit in September."),
sentiment ("positive"|"neutral"|"negative"),
intent (short phrase),
followUpDate (YYYY-MM-DD or null; infer from phrases like "after Q4 ends", "in September"),
priority ("Low"|"Medium"|"High"),
actionItems (array of short strings).
Email:
"""${text.slice(0, 3000)}"""`;
  const ai = await callOpenAI([{ role: 'system', content: 'You are a precise sales-email analyst. Output only JSON.' }, { role: 'user', content: prompt }], { json: true, maxTokens: 400 });
  if (ai) { try { return res.json({ status: 'success', source: 'ai', analysis: JSON.parse(ai) }); } catch (_) {} }

  // Heuristic fallback
  res.json({ status: 'success', source: 'fallback', analysis: heuristicEmail(text) });
});

function heuristicEmail(text) {
  const t = text.toLowerCase();
  const pos = ['great', 'interested', 'looking forward', 'excited', 'happy', 'let\'s', 'reconnect', 'proceed', 'yes'];
  const neg = ['not interested', 'unfortunately', 'concern', 'delay', 'cancel', 'no longer', 'unhappy', 'disappointed'];
  let score = 0; pos.forEach(w => { if (t.includes(w)) score++; }); neg.forEach(w => { if (t.includes(w)) score -= 2; });
  const sentiment = score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
  const urgent = /(asap|urgent|immediately|today|tomorrow|end of day)/.test(t);
  // crude date inference
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  let followUpDate = null;
  const now = new Date();
  const qMatch = t.match(/after\s+q([1-4])/);
  if (qMatch) { const qEndMonth = [3, 6, 9, 12][+qMatch[1] - 1]; followUpDate = `${now.getFullYear()}-${String(qEndMonth % 12 + 1).padStart(2, '0')}-15`; }
  else { for (let i = 0; i < months.length; i++) if (t.includes(months[i])) { let y = now.getFullYear(); if (i < now.getMonth()) y++; followUpDate = `${y}-${String(i + 1).padStart(2, '0')}-15`; break; } }
  const actionItems = [];
  if (/proposal|quote|pricing/.test(t)) actionItems.push('Send proposal / pricing');
  if (/meeting|call|schedule/.test(t)) actionItems.push('Schedule a meeting/call');
  if (followUpDate) actionItems.push('Follow up on ' + followUpDate);
  return {
    summary: sentiment === 'positive' ? 'Client shows interest and intends to re-engage.' : sentiment === 'negative' ? 'Client raised a concern or is disengaging.' : 'Client sent an informational update.',
    sentiment, intent: sentiment === 'positive' ? 'Re-engage / proceed' : 'Review',
    followUpDate, priority: urgent ? 'High' : (sentiment === 'positive' ? 'Medium' : 'Low'),
    actionItems: actionItems.length ? actionItems : ['Review and respond']
  };
}

// ---------- Follow-up email drafting ----------
router.post('/draft-email', async (req, res) => {
  const b = req.body || {};
  const ctx = {
    name: b.name || 'the client', industry: b.industry || '', age: b.age || '',
    investmentInterests: b.investmentInterests || '', portfolio: b.portfolio || '',
    previousMeetings: b.previousMeetings || '', priorConversations: b.priorConversations || '',
    goal: b.goal || 'schedule a follow-up and continue the conversation'
  };
  const prompt = `Draft a warm, professional follow-up email from a financial advisor to their client. Use only the provided context; do not invent facts. Keep it under 180 words, with a subject line.
Context:
- Client name: ${ctx.name}
- Industry: ${ctx.industry}
- Age: ${ctx.age}
- Investment interests: ${ctx.investmentInterests}
- Portfolio: ${ctx.portfolio}
- Previous meetings: ${ctx.previousMeetings}
- Prior conversations: ${ctx.priorConversations}
- Goal of this email: ${ctx.goal}`;
  const ai = await callOpenAI([{ role: 'system', content: 'You write concise, personable client follow-up emails.' }, { role: 'user', content: prompt }], { maxTokens: 400 });
  if (ai) return res.json({ status: 'success', source: 'ai', draft: ai });

  // Fallback template
  const bits = [ctx.investmentInterests && `your interest in ${ctx.investmentInterests}`, ctx.previousMeetings && `our recent discussion`, ctx.portfolio && `your portfolio`].filter(Boolean);
  const draft = `Subject: Following up — next steps

Dear ${ctx.name},

Thank you for your time. I wanted to follow up${bits.length ? ' regarding ' + bits.join(', ') : ''}. I'd be glad to ${ctx.goal}.

Please let me know a time that works for you, and I'll make the arrangements.

Warm regards,
Your Advisor`;
  res.json({ status: 'success', source: 'fallback', draft });
});

module.exports = router;
