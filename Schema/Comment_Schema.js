const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Comment_Schema = new Schema({
  blog: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog_Detail', // Reference to the blog post
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog_User', // Reference to the user who made the comment
    required: true
  },
  text: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  likes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Blog_User' // Array of users who liked the comment
  }],
  dislikes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Blog_User' // Array of users who disliked the comment
  }]
});

Comment_Schema.index({ blog: 1, date: -1 });

const Comment = mongoose.model('Comment', Comment_Schema);
module.exports = Comment;
