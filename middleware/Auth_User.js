var jwt = require('jsonwebtoken');
let private_key=process.env.PRIVATE_KEY;
const Blog_Schema = require('../Schema/Blog_Detail.Schema');  
const checkToken = (req, res, next) => {
 
     let token = req.header('auth-token')
     
      if(token){

     let decoded = jwt.verify(token, private_key);
     
   
     req.user=decoded.id;   
     req.name=decoded.name;  
      }
      else{
          req.user="none"; 
          req.name="none";  
      }
     next();

}


module.exports=checkToken