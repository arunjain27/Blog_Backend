var jwt = require('jsonwebtoken');
let private_key=process.env.PRIVATE_KEY;
const Blog_Schema = require('../Schema/Blog_Detail.Schema');  
const checkToken = (req, res, next) => {
    let token = req.header('auth-token');
  
    console.log('Token received:', token);
  
    if (token) {
      try {
        let decoded = jwt.verify(token, private_key);
        console.log('Decoded token:', decoded);
        req.user = decoded.id;   
        req.name = decoded.name;  
      } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
    } else {
      req.user = "none"; 
      req.name = "none";  
    }
  
    console.log('Request user:', req.user);
    next();
  };
  

module.exports=checkToken