const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

let bucket;

mongoose.connection.once('open', () => {
  bucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'uploads'
  });
  console.log('GridFS bucket ready');
});

const getBucket = () => {
  if (!bucket) throw new Error('GridFS bucket not initialized');
  return bucket;
};

module.exports = { getBucket };
