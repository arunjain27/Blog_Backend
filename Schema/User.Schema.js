const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const User_Detail = new Schema({
    name: {
        type: String,
        required: [true, 'Enter the correct name'] 
       
      },
      email: {
        type:String,
        required: [true, 'Enter the correct name'],
         unique: true,
    
      },
      password: {
        type: String,
        required: [true, 'Enter the correct name'] 
       
      
      },
      hashpassword: {
        type: String,
        required: [true, 'Enter the correct name'] 
       
      
      },
      eventDate: {
        type: Date, // Corrected type definition
        default: new Date().toString() // Setting a default value (if needed)
      }
    });

     const User_Schema = mongoose.model('Blog_User', User_Detail);

    module.exports=User_Schema