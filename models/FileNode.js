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

module.exports = mongoose.model('FileNode', fileNodeSchema);
