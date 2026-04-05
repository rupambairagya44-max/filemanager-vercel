const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const { Readable } = require('stream');
const { GridFSBucket } = require('mongodb');
const FileNode = require('../models/FileNode');

// Use memory storage — files go to GridFS, not disk
const upload = multer({ storage: multer.memoryStorage() });

// Helper: Check DB connection
const checkDB = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database is not connected');
  }
};

// Helper: get GridFS bucket
const getBucket = () => {
  checkDB();
  return new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
};
  }
};

// GET all files and folders
router.get('/', async (req, res) => {
  try {
    checkDB();
    
    // Use lean() for better performance - returns plain JS objects, not Mongoose docs
    const files = await FileNode.find()
      .lean()
      .timeout(10000)
      .exec();
    
    res.json(files);
  } catch (err) {
    console.error('Files fetch error:', err.message);
    
    if (err.message.includes('not connected')) {
      return res.status(503).json({ error: 'Database is not connected. Please try again.' });
    }
    
    if (err.name === 'MongooseError' || err.message.includes('timeout')) {
      return res.status(503).json({ error: 'Database timeout. Please try again.' });
    }
    
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// POST create folder (Admin only)
router.post('/folder', async (req, res) => {
  try {
    const { name, parentId, ownerId } = req.body;
    
    if (!name || !ownerId) {
      return res.status(400).json({ error: 'Name and owner ID are required' });
    }
    
    const newFolder = new FileNode({
      name,
      type: 'folder',
      parentId: parentId || null,
      ownerId
    });
    await newFolder.save();
    res.json(newFolder);
  } catch (err) {
    console.error('Create folder error:', err);
    res.status(500).json({ error: 'Failed to create folder' });
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
    checkDB();
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const node = await FileNode.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true, runValidators: true }
    ).timeout(10000);
    
    if (!node) return res.status(404).json({ error: 'File not found' });
    res.json(node);
  } catch (err) {
    console.error('Rename error:', err.message);
    
    if (err.message.includes('not connected')) {
      return res.status(503).json({ error: 'Database is not connected. Please try again.' });
    }
    
    if (err.message.includes('timeout')) {
      return res.status(503).json({ error: 'Database timeout. Please try again.' });
    }
    
    res.status(500).json({ error: 'Failed to rename' });
  }
});

// DELETE node — removes from GridFS too
router.delete('/:id', async (req, res) => {
  try {
    checkDB();
    
    const node = await FileNode.findById(req.params.id).timeout(10000);
    if (!node) return res.status(404).json({ error: 'File not found' });

    // Delete file from GridFS if it has a gridfsId
    if (node.type === 'file' && node.gridfsId) {
      try {
        const bucket = getBucket();
        await bucket.delete(new mongoose.Types.ObjectId(node.gridfsId));
        console.log('GridFS file deleted:', node.gridfsId);
      } catch (e) {
        console.warn('GridFS delete warning:', e.message);
        // Continue even if GridFS delete fails
      }
    }

    await FileNode.findByIdAndDelete(req.params.id).timeout(10000);
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err.message);
    
    if (err.message.includes('not connected')) {
      return res.status(503).json({ error: 'Database is not connected. Please try again.' });
    }
    
    if (err.message.includes('timeout')) {
      return res.status(503).json({ error: 'Database timeout. Please try again.' });
    }
    
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// GET download/preview file from GridFS
router.get('/download/:id', async (req, res) => {
  try {
    checkDB();
    
    const node = await FileNode.findById(req.params.id).timeout(10000);
    if (!node || node.type !== 'file') return res.status(404).json({ error: 'File not found' });

    if (!node.gridfsId) {
      return res.status(404).json({ error: 'File data is unavailable. It may have been deleted.' });
    }

    try {
      const bucket = getBucket();
      const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(node.gridfsId));

      res.set('Content-Type', node.mimeType || 'application/octet-stream');
      res.set('Content-Disposition', `inline; filename="${node.name}"`);

      downloadStream.pipe(res);

      downloadStream.on('error', (err) => {
        console.error('Download stream error:', err.message);
        if (!res.headersSent) {
          res.status(404).json({ error: 'File not found in storage' });
        }
      });
    } catch (gridfsErr) {
      console.error('GridFS error:', gridfsErr.message);
      res.status(500).json({ error: 'Failed to download file' });
    }

  } catch (err) {
    console.error('Download error:', err.message);
    
    if (err.message.includes('not connected')) {
      return res.status(503).json({ error: 'Database is not connected. Please try again.' });
    }
    
    if (err.message.includes('timeout')) {
      return res.status(503).json({ error: 'Database timeout. Please try again.' });
    }
    
    res.status(500).json({ error: 'Failed to download file' });
  }
});

module.exports = router;
