/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   KNOWLEDGE REPOSITORY API
   Searchable, curated knowledge base + RAG AI answering.
   Full-text retrieval (indexed, scales to thousands) + optional
   embedding rerank; grounded GPT answers with citations.
   ===================================================== */

const express = require('express');
const router = express.Router();
const KB = require('../models/KnowledgeArticle');
const { verifyToken, requirePermission } = require('../middleware/auth');

router.use(verifyToken);
router.use(requirePermission('knowledge'));

// ---- OpenAI helpers (graceful: return null if unavailable) ----
async function embed(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small', input: String(text || '').slice(0, 8000) })
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.data && d.data[0] && d.data[0].embedding || null;
  } catch (e) { return null; }
}
async function chat(messages, maxTokens = 700) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini', messages, max_tokens: maxTokens, temperature: 0.3 })
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.choices && d.choices[0] && d.choices[0].message.content || null;
  } catch (e) { return null; }
}
function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return (na && nb) ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}
function articleText(a) {
  return [a.title, a.category, a.subcategory, (a.keywords || []).join(' '), a.summary, a.content].filter(Boolean).join('\n');
}

// ---- Create ----
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ error: 'title is required' });
    const doc = {
      category: b.category || 'General', subcategory: b.subcategory || '',
      title: b.title.trim(), summary: b.summary || '', content: b.content || '',
      keywords: Array.isArray(b.keywords) ? b.keywords : String(b.keywords || '').split(',').map(s => s.trim()).filter(Boolean),
      industry: b.industry || 'Financial Advisory', difficulty: b.difficulty || 'Intermediate',
      relatedArticles: b.relatedArticles || [], createdBy: b.createdBy || req.userName || 'User'
    };
    const emb = await embed(articleText(doc));
    if (emb) doc.embedding = emb;
    const article = await KB.create(doc);
    res.status(201).json({ status: 'success', article: { ...article.toObject(), embedding: undefined } });
  } catch (e) { res.status(500).json({ error: 'Failed to create article', message: e.message }); }
});

// ---- Browse / search ----
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;

    let articles;
    if (q) {
      // Text index retrieval (scales), then optional embedding rerank
      articles = await KB.find({ ...filter, $text: { $search: q } }, { score: { $meta: 'textScore' } })
        .select('+embedding').sort({ score: { $meta: 'textScore' } }).limit(60).lean();
      if (!articles.length) {
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        articles = await KB.find({ ...filter, $or: [{ title: rx }, { summary: rx }, { keywords: rx }] }).select('+embedding').limit(60).lean();
      }
      const qEmb = await embed(q);
      if (qEmb) {
        articles.forEach(a => { a._sim = a.embedding && a.embedding.length ? cosine(qEmb, a.embedding) : 0; });
        articles.sort((x, y) => (y._sim || 0) - (x._sim || 0));
      }
      articles = articles.slice(0, 25);
    } else {
      articles = await KB.find(filter).sort({ updatedAt: -1 }).limit(50).lean();
    }
    const clean = articles.map(a => ({ articleId: a.articleId, category: a.category, subcategory: a.subcategory, title: a.title, summary: a.summary, difficulty: a.difficulty, keywords: a.keywords, updatedAt: a.updatedAt }));
    res.json({ status: 'success', count: clean.length, articles: clean });
  } catch (e) { res.status(500).json({ error: 'Search failed', message: e.message }); }
});

// ---- Category facets (for browse UI) ----
router.get('/categories', async (req, res) => {
  try {
    const rows = await KB.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    res.json({ status: 'success', total: rows.reduce((s, r) => s + r.count, 0), categories: rows.map(r => ({ category: r._id, count: r.count })) });
  } catch (e) { res.status(500).json({ error: 'Failed', message: e.message }); }
});

// ---- RAG ask (retrieve + grounded answer) ----
router.post('/ask', async (req, res) => {
  try {
    const question = (req.body && req.body.question || '').trim();
    if (!question) return res.status(400).json({ error: 'question is required' });

    // Retrieve candidates
    let cands = await KB.find({ $text: { $search: question } }, { score: { $meta: 'textScore' } })
      .select('+embedding').sort({ score: { $meta: 'textScore' } }).limit(40).lean();
    if (!cands.length) cands = await KB.find({}).select('+embedding').sort({ updatedAt: -1 }).limit(40).lean();

    const qEmb = await embed(question);
    if (qEmb) { cands.forEach(a => a._sim = a.embedding && a.embedding.length ? cosine(qEmb, a.embedding) : 0); cands.sort((x, y) => (y._sim || 0) - (x._sim || 0)); }
    const top = cands.slice(0, 6);

    const context = top.map((a, i) => `[${i + 1}] ${a.title} (${a.category})\n${a.summary}\n${(a.content || '').slice(0, 1200)}`).join('\n\n');
    const sources = top.map(a => ({ articleId: a.articleId, title: a.title, category: a.category }));

    const answer = await chat([
      { role: 'system', content: 'You are an expert financial-advisory knowledge assistant for Blue Astra. Answer the advisor using ONLY the provided knowledge-base excerpts; cite them inline like [1], [2]. If the excerpts do not cover it, say so and give best-practice general guidance. Be concise and practical.' },
      { role: 'user', content: `Knowledge base excerpts:\n${context || '(none found)'}\n\nQuestion: ${question}` }
    ], 800);

    if (answer) return res.json({ status: 'success', source: 'ai', answer, sources });

    // Fallback: return the top matches as a reading list
    const fallback = top.length
      ? 'AI answering is unavailable right now. Here are the most relevant knowledge articles:\n' + top.map((a, i) => `${i + 1}. ${a.title} — ${a.summary}`).join('\n')
      : 'No matching knowledge articles found. Try different keywords or add articles to the repository.';
    res.json({ status: 'success', source: 'fallback', answer: fallback, sources });
  } catch (e) { res.status(500).json({ error: 'Ask failed', message: e.message }); }
});

// ---- Get one (full content) ----
router.get('/:articleId', async (req, res) => {
  const a = await KB.findOne({ articleId: req.params.articleId }).lean();
  if (!a) return res.status(404).json({ error: 'Article not found' });
  delete a.embedding;
  res.json({ status: 'success', article: a });
});

// ---- Update / delete ----
router.put('/:articleId', async (req, res) => {
  try {
    const b = req.body || {};
    const upd = {};
    ['category', 'subcategory', 'title', 'summary', 'content', 'industry', 'difficulty', 'relatedArticles'].forEach(f => { if (b[f] !== undefined) upd[f] = b[f]; });
    if (b.keywords !== undefined) upd.keywords = Array.isArray(b.keywords) ? b.keywords : String(b.keywords).split(',').map(s => s.trim()).filter(Boolean);
    const a = await KB.findOneAndUpdate({ articleId: req.params.articleId }, upd, { new: true });
    if (!a) return res.status(404).json({ error: 'Article not found' });
    const emb = await embed(articleText(a)); if (emb) { a.embedding = emb; await a.save(); }
    res.json({ status: 'success', article: { ...a.toObject(), embedding: undefined } });
  } catch (e) { res.status(500).json({ error: 'Update failed', message: e.message }); }
});
router.delete('/:articleId', async (req, res) => {
  const a = await KB.findOneAndDelete({ articleId: req.params.articleId });
  if (!a) return res.status(404).json({ error: 'Article not found' });
  res.json({ status: 'success', message: 'Article deleted' });
});

// ---- Seed curated starter articles (idempotent by title) ----
const SEED = require('./knowledge-seed');
router.post('/seed', async (req, res) => {
  try {
    let inserted = 0;
    for (const s of SEED) {
      const exists = await KB.findOne({ title: s.title }).lean();
      if (exists) continue;
      const emb = await embed(articleText(s));
      await KB.create({ ...s, createdBy: 'AI', embedding: emb || [] });
      inserted++;
    }
    const total = await KB.countDocuments({});
    res.json({ status: 'success', inserted, total });
  } catch (e) { res.status(500).json({ error: 'Seed failed', message: e.message }); }
});

module.exports = router;
