const auth="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1YWUzZTU0MGM4YTYzMjU4ODRlNDcwYSIsImlhdCI6MTcwNTkxODAzNn0.mZ3-OlWjqVmp8w_HaLOO28WEjc0NM-P-COP3uaR6YIw"
const Database_Connection = require('../Database_Connection/Db.js');
Database_Connection()                                                   //----  DATABASE_CONNECTION    ----//  
const express = require('express');
const app=express();
const router = express.Router();
const cloudinary = require('../Cloudinary/Cloudinary_Details.js');     //----  CLOUDINARY    ----//  
const User = require('../Schema/User.Schema.js');                      //----   USER_SCHEMA    ----// 
const Blog_Schema = require('../Schema/Blog_Detail.Schema.js');        //----   BLOG_SCHEMA    ----// 
const Middleware_fun = require('../middleware/Auth_User.js');          //----   MIDDLEWARE    ----// 
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcryptjs=require('bcryptjs')
const private_key = "iamarunjain";
const numSaltRounds = 8;
const {loginValidator,createValidator}=require('../Validator/Express_Validator.js')
const cors =require('cors');
app.use(express.json()); 
app.use(cors());
//----  STORAGE FUNCTION    ----//  
const express_validator = require('express-validator')


const validationResult=express_validator.validationResult; 
 
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');            // Uploads will be stored in the 'uploads/' directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

 
//----  GETIMAGE FUNCTION    ----//  


const getImage = async (customData,count) => {
  
  const searchExpression = Object.entries(customData)
    .map(([key, value]) => `context.${key}=${value}`)
    .join(' AND ');

  try {
    const result = await cloudinary.search
      .expression(searchExpression)
      .sort_by('created_at', 'desc')
      .max_results(1) // Retrieve only the most recent image
      .execute();

    // Check if there are any matching images
    if (result.resources.length > 0) {
      const mostRecentImage = result.resources[0];
      console.log('Most recent image:', mostRecentImage.url);
         
      } else {
      console.log('No images found.');
      return null;
    }
      const imageUrls = result.resources.map((resource) => resource.url);
        console.log(imageUrls);
       
          return  imageUrls;
       
           
      
         
           
  } 
  catch (error) {
    console.error('Error searching for images:', error);
    throw error;
  }
 

};
  
 //----  SIGNUP REQUEST    ----//  

 router.post('/signup', createValidator, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const Encrypted_Password = await bcryptjs.hash(password, numSaltRounds);

    const userDetails = new User({
      name,
      email,
      password: Encrypted_Password,
    });

    let savedUser = await userDetails.save();

    const UserId = userDetails.id;

    let data = {
      id: UserId,
    };

    let token = jwt.sign(data, private_key);

    res.json({data:token});
  } catch (error) {
    console.log("Error occurred:", error);
    res.status(500).send("An error occurred");
  }
});


 //----  SIGNIN REQUEST    ----//  

router.post('/signin',loginValidator, async (req, res) => {
  try {
    const errors = validationResult(req);
    console.log(errors)
    if (!errors.isEmpty()) {
     
      // in case request params meet the validation criteria
      return res.send(errors)
    }
    const { email, password } = req.body;
    let users = await User.findOne({ email: email });
   
    if (users) {
      let user_password = users.password;
      const result = await bcryptjs.compare(password, user_password);
  
      if (result) {
        const UserId = users.id;

          let data = {
          id: UserId,
       };

    let token = jwt.sign(data, private_key);

    res.json({data:token});
    
      } else {
        res.send("incorrect password");
      }
    } else {
      res.send("not a valid user. Sign in properly.");
    }
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).send("An error occurred");
  }
});



//----   BLOG_DETAIL REQUEST   ----//  

router.post('/blogdetail', Middleware_fun, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    let User_id = req.user;

    console.log(req.file.path);
    console.log("User __ id ", User_id);

    const { title, tag, description } = req.body;

    const customData = {
      user_id: `${User_id}`,
      category: 'profile'
    };

    const imageUrl = req.file.path;

    console.log(imageUrl);
    cloudinary.uploader.upload(`${imageUrl}`, {
      context: customData,
    }, async (error, result) => {
      if (error) {
        console.error('Error uploading image:', error);
        return res.status(500).send('An error occurred');
      } else {
        console.log('Image uploaded:', result);
        let count = 0;
        let imageUrls = await getImage(customData, count);
        let imageUrl = await getImage( customData, count);
        let imageUrl3 = await getImage(customData, count);

        console.log(imageUrl[0]);
        console.log(imageUrls[0]);
        console.log(imageUrl3[0]);
        
        return ;
        const blogDetail = new Blog_Schema({
          user: User_id,
          title,
          tag,
          description,
          image: `${imageUrl[0]}` // Store the image URL in the database
        });
 
        const savedBlogDetail = await blogDetail.save();
        let users = await Blog_Schema.find({ user: User_id });
        console.log(users);

        res.status(201).json({ blogdetail: savedBlogDetail });
      } 
    });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).send("An error occurred");
  }
});



//----   ALL_DATA REQUEST   ----//


router.post('/get', Middleware_fun, async (req, res) => {
  try {
    let id = req.user;

     console.log(id) 
     const User_blog= await Blog_Schema.find({user:id},{title:1,tag:1,description:1}); 
     console.log(User_blog)
    res.send(User_blog)
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).send("An error occurred");
  } 
});


// -----  DELETE  REQUEST    -----//
  

router.delete(`/:id`,async (req, res) => {
  
   console.log(req.params);
   let id=req.params.id;
   console.log(id);
   
  const delete_Element= await Blog_Schema.deleteOne( { id: req.params.value } )
   res.send(delete_Element)
   
});   
 

// -----  UPDATE  REQUEST    -----//


router.put('/update/:id', async (req, res) => {
 
try{
 console.log(req.params.id); 
 const Obj_Id= await Blog_Schema.findOne({_id:req.params.id}); 
 
 if(!Obj_Id)
 {
  res.send("NO OBJECT IS EXIST FOR UPDATE")
 }
 const {title,tag,description} = req.body;
 

 if(title)
 {
     Obj_Id.title=title;
 }
 if(tag)
 {
  Obj_Id.description=description;
 }
 
 if(description)
 {
  Obj_Id.description=description;
 }
 
 const update= await Blog_Schema.updateOne({_id:req.params.id},Obj_Id); 
 res.send(update)
}catch(error){

  }

});   





module.exports = router;
