/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Curated starter knowledge articles across the advisory domains.
*/
module.exports = [
  {
    category: 'Sales & Business Development', subcategory: 'Objection Handling',
    title: 'Handling Fee Objections',
    summary: 'A framework for responding when a prospect pushes back on advisory fees or AUM pricing.',
    content: 'When a client objects to fees, reframe from cost to value. 1) Acknowledge the concern. 2) Quantify the value: tax savings, risk reduction, behavioral coaching, and time saved. 3) Compare net-of-fee outcomes vs. going it alone. 4) Offer tiered options (basic / swift-ai-plus / rocket-ai-plus). 5) Use a concrete example: a 1% fee that prevents one panic-sell in a downturn often pays for years of advice. Avoid discounting reflexively — anchor on outcomes.',
    keywords: ['fees', 'pricing', 'wealth management', 'AUM', 'objections'], difficulty: 'Intermediate'
  },
  {
    category: 'Wealth Management', subcategory: 'Retirement',
    title: 'Retirement Strategies for Business Owners (50+)',
    summary: 'Retirement planning levers for a 50-something business owner with concentrated wealth.',
    content: 'Business owners near retirement often have wealth concentrated in the business. Strategy: 1) Diversify gradually — do not hold 80%+ net worth in one illiquid asset. 2) Maximize tax-advantaged plans (defined-benefit / cash-balance plans allow large deductible contributions for older owners). 3) Plan the exit: succession, ESOP, or third-party sale, each with different tax timing. 4) Build a 3-5 year liquidity bridge. 5) Coordinate estate and insurance for wealth transfer. For a 52-year-old owner, cash-balance plans plus a phased liquidity plan are often the highest-impact moves.',
    keywords: ['retirement', 'business owner', 'cash-balance', 'succession', 'diversification'], difficulty: 'Advanced'
  },
  {
    category: 'Investment Products', subcategory: 'Fundamentals',
    title: 'ETFs vs. Mutual Funds',
    summary: 'Key differences to explain to clients: cost, tax efficiency, trading, and transparency.',
    content: 'ETFs generally offer lower expense ratios, intraday trading, and greater tax efficiency (in-kind creation/redemption reduces capital gains distributions). Mutual funds price once daily and may distribute gains. Active mutual funds can add value in inefficient asset classes but at higher cost. For most core allocations, low-cost index ETFs are the default; use active/mutual funds selectively.',
    keywords: ['ETF', 'mutual funds', 'expense ratio', 'tax efficiency'], difficulty: 'Beginner'
  },
  {
    category: 'Financial Planning', subcategory: 'Tax',
    title: 'Tax-Efficient Wealth Transfer Strategies',
    summary: 'Techniques to transfer wealth to heirs while minimizing estate and gift tax.',
    content: 'Core tools: annual gift exclusions, lifetime exemption use, irrevocable trusts (SLATs, GRATs, ILITs), and step-up in basis planning. Fund an ILIT to pay estate taxes with life insurance. Use GRATs in low-interest environments to shift appreciation. Consider 529 superfunding for education. Always coordinate with the client\'s attorney and CPA; document intent and review after any tax-law change.',
    keywords: ['estate', 'gift tax', 'trusts', 'GRAT', 'ILIT', 'wealth transfer'], difficulty: 'Advanced'
  },
  {
    category: 'Stock Markets & Trading', subcategory: 'Risk',
    title: 'Assessing Portfolio Concentration Risk',
    summary: 'How to identify and talk about concentration and drawdown risk in a client portfolio.',
    content: 'Flag any single position above ~10% of the portfolio, sector bets above ~25%, and correlation clusters. Quantify downside: historical max drawdown, and a stress scenario (e.g., -30% equity shock). Talking points: single-stock idiosyncratic risk, tax cost of unwinding vs. hedging (collars, exchange funds), and staged diversification. Frame it around the client\'s goals and time horizon, not market timing.',
    keywords: ['risk', 'concentration', 'drawdown', 'diversification', 'portfolio'], difficulty: 'Intermediate'
  },
  {
    category: 'Compliance & Regulation', subcategory: 'Suitability',
    title: 'Suitability & Best-Interest Documentation',
    summary: 'What to document to meet best-interest / suitability obligations for a recommendation.',
    content: 'For each recommendation, record: the client profile (goals, risk tolerance, time horizon, liquidity needs), the options considered, why the chosen option is in the client\'s best interest, costs and conflicts disclosed, and client acknowledgment. Keep contemporaneous notes. Review at defined intervals and after material life events. Never make a recommendation you cannot document a reasonable basis for.',
    keywords: ['compliance', 'suitability', 'best interest', 'documentation', 'Reg BI'], difficulty: 'Intermediate'
  },
  {
    category: 'Client Communication', subcategory: 'Meetings',
    title: 'Structuring a Quarterly Review Meeting',
    summary: 'A repeatable agenda that keeps quarterly reviews focused and valuable.',
    content: 'Agenda: 1) Life update — any changes in goals, income, family. 2) Portfolio review vs. plan, not vs. the index. 3) Progress toward goals (retirement funding ratio, etc.). 4) One proactive idea (tax, rebalance, savings rate). 5) Action items with owners and dates. End by confirming next steps in writing. Lead with the client\'s goals; keep performance in context of the plan.',
    keywords: ['client communication', 'quarterly review', 'agenda', 'meetings'], difficulty: 'Beginner'
  },
  {
    category: 'Marketing & Brochures', subcategory: 'Content',
    title: 'Brochure: Tax-Efficient Wealth Transfer',
    summary: 'Outline and messaging for a client-facing brochure on wealth transfer strategies.',
    content: 'Structure: Cover (headline: "Pass on more of what you\'ve built"). Section 1: Why planning matters (taxes and probate can erode legacies). Section 2: Core strategies (gifting, trusts, life insurance) in plain language. Section 3: A simple case study with before/after. Section 4: Next steps + disclosures. Keep jargon low, use one strong visual per section, and include a compliance-approved disclaimer.',
    keywords: ['marketing', 'brochure', 'wealth transfer', 'content', 'estate'], difficulty: 'Beginner'
  },
  {
    category: 'Meeting Intelligence', subcategory: 'Follow-up',
    title: 'Turning a Meeting Transcript into Follow-ups',
    summary: 'How to convert a recorded meeting transcript into minutes, action items, and a follow-up email.',
    content: 'From a transcript: 1) Extract decisions and commitments (who/what/when). 2) Summarize in 3-5 bullets. 3) Identify the client\'s stated intent and sentiment. 4) Draft a follow-up email that restates the value, confirms next steps, and proposes dates. 5) Log action items to the workflow. The CRM\'s AI tools can auto-generate minutes, transcript, and a draft follow-up from a recording.',
    keywords: ['meeting', 'transcript', 'follow-up', 'action items', 'AI'], difficulty: 'Intermediate'
  },
  {
    category: 'AI Prompt Library', subcategory: 'Prompts',
    title: 'Prompt: Portfolio Risk Talking Points',
    summary: 'A reusable prompt to generate client-ready talking points about portfolio risk.',
    content: 'Prompt: "You are a financial advisor. Given this portfolio {holdings, weights, sectors}, summarize the top 3 risks in plain language, quantify a plausible downside scenario, and give 3 talking points I can use with the client to discuss diversification without triggering panic. Keep it under 200 words." Tips: always feed real holdings, ask for plain language, and request talking points rather than jargon.',
    keywords: ['AI', 'prompt', 'portfolio', 'risk', 'talking points'], difficulty: 'Intermediate'
  },
  {
    category: 'Internal SOPs & Training', subcategory: 'Onboarding',
    title: 'SOP: New Client Onboarding Checklist',
    summary: 'Standard operating procedure for onboarding a new advisory client.',
    content: 'Steps: 1) Collect KYC and risk profile. 2) Open accounts and verify funding. 3) Deliver ADV/disclosures and obtain signatures. 4) Build the initial plan and IPS. 5) Schedule the kickoff meeting. 6) Set up CRM record, communication preferences, and review cadence. 7) Send a welcome email. Owner: advisor + ops. Target: complete within 10 business days.',
    keywords: ['SOP', 'onboarding', 'training', 'checklist', 'KYC'], difficulty: 'Beginner'
  },
  {
    category: 'Research & Market Intelligence', subcategory: 'Macro',
    title: 'Framing Market Volatility for Clients',
    summary: 'How to discuss market volatility and avoid client behavioral mistakes.',
    content: 'Volatility is the price of long-term returns, not a signal to act. Use history: markets recover; missing the best days devastates returns. Reinforce the plan, rebalance opportunistically, and consider tax-loss harvesting. Talking points: time in the market beats timing, diversification cushions shocks, and the plan already assumed downturns. Document the conversation.',
    keywords: ['research', 'market', 'volatility', 'behavioral', 'macro'], difficulty: 'Intermediate'
  }
];
