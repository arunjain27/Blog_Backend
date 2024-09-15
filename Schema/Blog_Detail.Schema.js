const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Blog_Detail = new Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog_User'
  },
  name: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  tag: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  updated: {
    type: Date,
    default: Date.now // Default to the current date/time
  },
  likes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Blog_User' // Array of users who liked the blog
  }],
  dislikes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Blog_User' // Array of users who disliked the blog
  }],
  comments: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Comment' // Array of comments
  }]
});

// Adding indexes for performance
Blog_Detail.index({ user: 1 });
Blog_Detail.index({ date: -1 });

const Blog_Schema = mongoose.model('Blog_Detail', Blog_Detail);
module.exports = Blog_Schema;
