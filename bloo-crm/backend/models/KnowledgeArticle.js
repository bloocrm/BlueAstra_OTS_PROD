/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const generateArticleId = () => `KB-${uuidv4().split('-')[0].toUpperCase()}`;

// Curated, org-wide knowledge repository (shared across advisors).
const knowledgeSchema = new mongoose.Schema(
  {
    articleId: { type: String, unique: true, index: true, default: generateArticleId },
    category: { type: String, trim: true, index: true },      // domain, e.g. "Wealth Management"
    subcategory: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: '' },
    content: { type: String, default: '' },
    keywords: { type: [String], default: [], index: true },
    industry: { type: String, default: 'Financial Advisory' },
    difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' },
    relatedArticles: { type: [String], default: [] },
    createdBy: { type: String, default: 'AI' },
    embedding: { type: [Number], default: [], select: false } // semantic vector (optional)
  },
  { timestamps: true }
);

// Full-text index for fast keyword retrieval over thousands of articles
knowledgeSchema.index({ title: 'text', summary: 'text', content: 'text', keywords: 'text', category: 'text', subcategory: 'text' });
knowledgeSchema.index({ category: 1, difficulty: 1 });

module.exports = mongoose.model('KnowledgeArticle', knowledgeSchema);
