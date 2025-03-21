const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
  originalName: String,
  userPrompt: String,
  extractedText: String,
  summary: String,
  messages: [messageSchema],
  category: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('chats', chatSchema);
