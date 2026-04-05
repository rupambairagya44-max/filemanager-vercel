const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const { Readable } = require('stream');
const { GridFSBucket } = require('mongodb');
const FileNode = require('../models/FileNode');

// Use memory storage — files go to GridFS, not disk
const upload = multer({ storage: multer.memoryStorage() });

// Helper: get GridFS bucket
const getBucket = () => {
  return new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
};

// GET all files and folders
router.get('/', async (req, res) => {
  try {
    const files = await FileNode.find();
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create folder (Admin only)
router.post('/folder', async (req, res) => {
  try {
    const { name, parentId, ownerId } = req.body;
    const newFolder = new FileNode({
      name,
      type: 'folder',
      parentId: parentId || null,
      ownerId
    });
    await newFolder.save();
    res.json(newFolder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST upload file → stored in MongoDB GridFS (works on Vercel)
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { parentId, ownerId } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const bucket = getBucket();

    // Convert buffer to readable stream
    const readableStream = new Readable();
    readableStream.push(req.file.buffer);
    readableStream.push(null);

    // Upload to GridFS
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype
    });

    readableStream.pipe(uploadStream);

    uploadStream.on('finish', async () => {
      const newFile = new FileNode({
        name: req.file.originalname,
        type: 'file',
        mimeType: req.file.mimetype,
        gridfsId: uploadStream.id,
        size: req.file.size,
        parentId: parentId === 'null' || !parentId ? null : parentId,
        ownerId
      });
      await newFile.save();
      res.json(newFile);
    });

    uploadStream.on('error', (err) => {
      console.error('GridFS upload error:', err);
      res.status(500).json({ error: 'File upload to GridFS failed' });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT rename node
router.put('/rename/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const node = await FileNode.findByIdAndUpdate(req.params.id, { name }, { new: true });
    res.json(node);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE node — removes from GridFS too
router.delete('/:id', async (req, res) => {
  try {
    const node = await FileNode.findById(req.params.id);
    if (!node) return res.status(404).json({ error: 'Not found' });

    // Delete file from GridFS if it has a gridfsId
    if (node.type === 'file' && node.gridfsId) {
      try {
        const bucket = getBucket();
        await bucket.delete(new mongoose.Types.ObjectId(node.gridfsId));
      } catch (e) {
        console.warn('GridFS delete warning:', e.message);
      }
    }

    await FileNode.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET download/preview file from GridFS
router.get('/download/:id', async (req, res) => {
  try {
    const node = await FileNode.findById(req.params.id);
    if (!node || node.type !== 'file') return res.status(404).json({ error: 'File not found' });

    if (!node.gridfsId) {
      return res.status(404).json({ error: 'File has no GridFS ID. It may have been uploaded before migration.' });
    }

    const bucket = getBucket();
    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(node.gridfsId));

    res.set('Content-Type', node.mimeType || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${node.name}"`);

    downloadStream.pipe(res);

    downloadStream.on('error', () => {
      res.status(404).json({ error: 'File not found in GridFS' });
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
