var jwt = require('jsonwebtoken');
let private_key=process.env.PRIVATE_KEY;
const checkToken = (req, res, next) => {
    let token = req.header('auth-token');
  
  
    if (token) {
      try {
        let decoded = jwt.verify(token, private_key);
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
  
    next();
  };
  

module.exports=checkToken