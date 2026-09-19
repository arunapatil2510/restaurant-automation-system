const mongoose = require('mongoose');

const KnowledgeDocSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['policy', 'allergen', 'timing', 'general', 'menu'],
      default: 'general',
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    keywords: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('KnowledgeDoc', KnowledgeDocSchema);
