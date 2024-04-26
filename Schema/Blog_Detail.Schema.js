const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Blog_Detail = new Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog_User'
  },
  name:{
    type:String,
    required: true
  },
     title:{
      type:String,
      required: true
    },
     tag:{
      type:String,
      required: true
    }, 
     description:{
      type:String,
      required: true
    }, 
     image:{
      type:String,
      required: true
    },
  

    });

    const Blog_Schema = mongoose.model('Blog_Detail', Blog_Detail);
    module.exports = Blog_Schema;
    