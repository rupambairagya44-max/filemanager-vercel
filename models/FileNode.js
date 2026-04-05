const mongoose = require('mongoose');

const fileNodeSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  type:       { type: String, enum: ['file', 'folder'], required: true },
  mimeType:   { type: String, default: '' },
  // For Vercel: files stored in MongoDB GridFS, gridfsId holds the ObjectId
  gridfsId:   { type: mongoose.Schema.Types.ObjectId, default: null },
  // Legacy local diskPath (ignored on Vercel)
  diskPath:   { type: String, default: '' },
  parentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'FileNode', default: null },
  ownerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  size:       { type: Number, default: 0 },
}, { timestamps: true });

// Indexes for faster queries
fileNodeSchema.index({ parentId: 1 });
fileNodeSchema.index({ ownerId: 1 });
fileNodeSchema.index({ type: 1 });
fileNodeSchema.index({ parentId: 1, ownerId: 1 }); // Compound index
fileNodeSchema.index({ name: 'text' }); // Full-text search

module.exports = mongoose.model('FileNode', fileNodeSchema);
