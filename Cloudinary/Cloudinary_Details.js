const cloudinary = require('cloudinary').v2;
const CLOUD_NAME="ddwsgkubk";
const API_KEY="633358693563128";
const API_SECRET="R589QNOzVoPNRWFKQSE6RvD8XTU";
cloudinary.config({
  cloud_name: `${CLOUD_NAME}`,
  api_key: `${API_KEY}`,
  api_secret: `${API_SECRET}`,
});


module.exports = cloudinary;
