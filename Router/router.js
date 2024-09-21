const Database_Connection = require("../Database_Connection/Db.js");
Database_Connection();                                                //---- DATABASE_CONNECTION  ----//
const express = require("express");
const app = express();
const NodeCache = require("node-cache");
const cache = new NodeCache();
const router = express.Router();
const cloudinary = require("../Cloudinary/Cloudinary_Details.js");   //----  CLOUDINARY      ----//
const User = require("../Schema/User.Schema.js");                   //----   USER_SCHEMA    ----//
const Blog_Schema = require("../Schema/Blog_Detail.Schema.js");    //----   BLOG_SCHEMA    ----//
const Comment=require("../Schema/Comment_Schema.js")
const Middleware_fun = require("../middleware/Auth_User.js");    //----   MIDDLEWARE     ----//
const multer = require("multer");
const compression = require("compression");
app.use(compression());
app.use(compression({ filter: shouldCompress }));

function shouldCompress(req, res) {
  if (req.headers['x-no-compression']) {
    // Don't compress responses with this request header
    return false;
  }
  // Compress all other responses
  return compression.filter(req, res);
}


const fs = require("fs");
// open AI
const MODEL_NAME = process.env.MODEL_NAME;
const API_KEY_GEMINI = process.env.API_KEY_GEMINI;
const axios = require("axios");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const numSaltRounds = 8; 
const {
  loginValidator,
  createValidator,
} = require("../Validator/Express_Validator.js");

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "font-src 'self' https://fonts.gstatic.com");
  next();
});
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "style-src 'self' https://fonts.googleapis.com");
  next();
});

const cors = require("cors");
app.use(express.json());
app.use(cors({
  origin: "https://musingsss.netlify.app/"}));//----  STORAGE FUNCTION    ----//

  const express_validator = require("express-validator");

const validationResult = express_validator.validationResult;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Uploads will be stored in the 'uploads/' directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

//----  GETIMAGE FUNCTION    ----//

const getImage = async (customData, count) => {
  try {
    const result = await cloudinary.api.resources({
      type: "upload",
      context: true,
      tags: Object.values(customData),
      max_results: 1, // Retrieve only the most recent image
      sort_by: "created_at", // Sort by creation date in descending order
      direction: "desc", // Sort in descending order
      transformation: [
        { width: 250, crop: "scale" }, // Apply width and crop transformation
        { quality: 20 }, // Set image quality to 35
        { fetch_format: "low" } // Automatically select optimal format
      ] 
    }); 

    // Check if there are any matching images
    if (result.resources.length > 0) {
      const mostRecentImage = result.resources[0];
      console.log("Most recent image:", mostRecentImage.url);
      return mostRecentImage.url; // Return the URL of the most recent image
    } else {
      console.log("No images found.");
      return null;
    }
  } catch (error) {
    console.error("Error fetching images:", error);
    throw error;
  }
};



//----  SIGNUP REQUEST    ----//
 
router.post("/signup", createValidator, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const Encrypted_Password = await bcryptjs.hash(password, numSaltRounds);

    const userDetails = new User({
      name,
      email,
      password,
      hashpassword: Encrypted_Password,
    });

    let savedUser = await userDetails.save();

    const UserId = userDetails.id;
    const Username = userDetails.name;
    let data = {
      id: UserId,
      name: Username,
    };

    let token = jwt.sign(data, PRIVATE_KEY, { expiresIn: '1h' }); // Token expires in 1 hour

    res.json({ data:token ,username:Username,userid:UserId });
  } catch (error) {
    console.log("Error occurred:", error);
    res.status(500).send("An error occurred");
  }
});

//----  SIGNIN REQUEST    ----//

router.post("/signin", loginValidator, async (req, res) => {
  try {
    const errors = validationResult(req);
    console.log(errors);
    if (!errors.isEmpty()) {
      // in case request params meet the validation criteria
      return res.send(errors);
    }
    const { email, password } = req.body;
    let users = await User.findOne({ email: email });
    console.log(users);

    if (users) {
      let user_password = users.password;
      let user_name=users.name;
      const result = user_password == password ? true : false;
      console.log(result);

      if (result) {
        const UserId = users.id;
        const Username = users.name;
        let data = {
          id: UserId,
          name: Username,
        };

        let token = jwt.sign(data, PRIVATE_KEY);

        res.json({ data:token  ,username:user_name,userid:UserId });
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

router.post("/blogdetail",Middleware_fun,upload.single("image"),async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded." });
      }

      const User_id = req.user;
      const User_name = req.name;

      const { title, tag, description } = req.body;

      const customData = {
        user_id: `${User_id}`,
        category: "profile",
      };

      const imageUrl = req.file.path;

      cloudinary.uploader.upload(
        imageUrl,
        {
          context: customData,
        },
        async (error, result) => {
          if (error) {
            console.error("Error uploading image:", error);
            return res.status(500).json({ message: "An error occurred" });
          } else {
            const imageUrl = await getImage(customData);
            const blogDetail = new Blog_Schema({
              user: User_id,
              name: User_name,
              title,
              tag,
              description,
              image: imageUrl,
            });

            const savedBlogDetail = await blogDetail.save();

            fs.unlink(req.file.path, (err) => {
              if (err) {
                console.error("Error deleting image:", err);
              } else {
                console.log("Image deleted successfully");
              }
            });
            res.status(201).json({ blogdetail: savedBlogDetail });
          }
        }
      );
    } catch (error) {
      console.error("Error occurred:", error);
      res.status(500).send("An error occurred");
    }
  }
);

const cacheMiddleware = (req, res, next) => {
  const key = req.originalUrl || req.url;
  const cachedData = cache.get(key);
  if (cachedData) {
    res.json(cachedData);
    return;
  }
  res.sendResponse = res.json;
  res.json = (body) => {
    cache.set(key, body, 60); // Cache for 60 seconds
    res.sendResponse(body);
  };
  next();
};

//----   ALL_DATA REQUEST   ----//

router.post("/get", Middleware_fun, async (req, res) => {
  try {
    let id = req.user;

    let finalname = "none";
    if (id != "none") {
      username = await User.find({ _id: id });
      finalname = username.name;
      console.log(username.name);
    }
    console.log(id);
    const sortedBlogs = await Blog_Schema.find({ user: id })
      .sort({ date: -1 })
      .exec();

    console.log(sortedBlogs);

    res.json({ userblog: sortedBlogs, user: finalname });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).send("An error occurred");
  }
});



// all the blog post
router.post("/allpost", cacheMiddleware,Middleware_fun, async (req, res) => {
  try {
    let userid = req.user;
    let finalname = "none";

    if (userid !== "none") {
      const user = await User.findById(userid);
      if (user) {
        finalname = user.name;
      }
    }

    const sortedBlogs = await Blog_Schema.find().sort({ date: -1 }).exec();

    res.json({ userblog: sortedBlogs, username: finalname });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).send("An error occurred");
  }
});

// -----  DELETE  REQUEST    -----//

const deleteImageFromCloudinary = async (publicId) => {
  try {
    // Delete the image using the public ID
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(result);
  } catch (error) {
    console.error('Error deleting image:', error);
  }
};


router.delete("/:id", async (req, res) => {
  try {
    // Find the blog post in the database
    const id = req.params.id;
    const blogPost = await Blog_Schema.findOne({ _id: id });
  
    // Extract the public ID from the URL (assuming the URL is stored in a field called imageUrl)
    const url = blogPost.image;
    const publicId = url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'));
    
    // Delete the image from Cloudinary
    await deleteImageFromCloudinary(publicId); 
    const deletepost = await Blog_Schema.deleteOne({ _id: id });
   
    res.json({success:true})
  } catch (error) {
    console.error('Error fetching blog post or deleting image:', error);
    res.json({success:false})
  }});

// -----  UPDATE  REQUEST    -----//

router.get('/blog/:id', async (req, res) => {
  try {
    const blogId = req.params.id;

    // Fetch blog by ID and populate the user field
    const blog = await Blog_Schema.findById(blogId)
      .populate('user', 'name')  // Only include 'name' from user
      .exec();

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Fetch comments related to the blog and populate user field
    const comments = await Comment.find({ blog: blogId })
      .populate('user', 'name')  // Only include 'name' from user
      .exec();

    // Construct the response
    const response = {
      blog: {
        _id: blog._id,
        name: blog.name,
        title: blog.title,
        tag: blog.tag,
        description: blog.description,
        image: blog.image,
        date: blog.date,
        likes: blog.likes.length,  // Count the number of likes
        dislikes: blog.dislikes.length,  // Count the number of dislikes
        comments: comments.map(comment => ({
          _id: comment._id,
          text: comment.text,
          date: comment.date,
          likes: comment.likes.length,  // Count the number of likes
          dislikes: comment.dislikes.length,  // Count the number of dislikes
          user: comment.user // Include the name of the user who commented
        }))
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching blog by ID:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
// Update a comment
router.put('/:id', Middleware_fun, async (req, res) => {
  try {
    const { text } = req.body;
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // Check if the user is the author of the comment
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    comment.text = text;
    const updatedComment = await comment.save();
    res.json({ comment: updatedComment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// genereate Ai text function

async function improveText(prompt, text) {
  try {
    const response = await axios.post(
      `https://api.openai.com/v1/text-tools/${MODEL_NAME}/improve`,
      {
        prompt: prompt,
        text: text,
        model: MODEL_NAME,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY_GEMINI}`,
        },
      }
    );

    return response.data.data.improved_text;
  } catch (error) {
    console.error("Error improving text:", error);
    throw error;
  }
}

// Generate Ai Text

router.post("/newpost", async (req, res) => {
  try {
    const { title, tag, description } = req.body;
    const prompt =
      "Improve the title blog post: , improve the english , looks more attractive ,creative and professional";

    // Integrate with OpenAI to improve title, tag, and description
    const improvedTitle = await improveText(prompt, title);
    const improvedTag = await improveText(prompt, tag);
    const improvedDescription = await improveText(prompt, description);

    // You can proceed with saving the post to the database with the improved text
    res
      .status(201)
      .json({
        title: improvedTitle,
        tag: improvedTag,
        description: improvedDescription,
      });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).send("An error occurred");
  }
});

const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

// Initialize Google Generative AI client
const genAI = new GoogleGenerativeAI(API_KEY_GEMINI); // Replace API_KEY with your actual API key

// Example post request handler


// -----  EDIT COMMENT REQUEST  ----- //
// ----- UPDATE COMMENT REQUEST ----- //
router.put('/comment/:id', Middleware_fun, async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user;
    const { text } = req.body;

    // Find the comment
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if the user is the author of the comment
    if (comment.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this comment' });
    }

    // Update the comment text
    comment.text = text;
    await comment.save();

    res.status(200).json({ message: 'Comment updated successfully', comment });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ message: 'An error occurred' });
  }
});


// -----  DELETE COMMENT REQUEST  ----- //
// ----- DELETE COMMENT REQUEST ----- //
// Delete a comment
router.delete('/comment/:id', Middleware_fun, async (req, res) => {
  try {
    // Find and populate comment
    const comment = await Comment.findById(req.params.id).populate('user');
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // Ensure req.user is set and comment.user is populated
    if (!req.user || !comment.user) {
      return res.status(400).json({ message: 'User or comment not found' });
    }
 
    // Check if the user is the author of the comment
    if (comment.user._id.toString() !== req.user.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Use findByIdAndDelete to remove the comment
    await Comment.findByIdAndDelete(req.params.id);

    res.json({ message: 'Comment removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate({
        path: 'comments',
        populate: { path: 'user', select: 'name' }  // Populate user details
      });

    res.json({ blog });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.post("/generateText", async (req, res) => {
  try {
    const { title, tag, description } = req.body;
    const str = await generateCreativeText(title, tag, description);

    // Split the string by '\n\n'
    let sections = str.split("\n\n");

    // Extract title, tag, and description
    let generatedTitle = sections[0].replace("**Title:** ", "");
    let generatedTag = sections[1].replace("**Tag:** ", "");
    let generatedDescription = sections[2].replace("**Description:** ", "");

    res
      .status(200)
      .json({ generatedTitle, generatedTag, generatedDescription });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});
router.post("/like", Middleware_fun, async (req, res) => {
  try {
    const { blogId } = req.body;
    const userId = req.user;

    if (!userId || userId === "none") {
      return res.status(401).json({ message: 'Unauthorized user' });
    }

    const blogPost = await Blog_Schema.findById(blogId);

    if (!blogPost) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    const alreadyLiked = blogPost.likes.includes(userId);
    const alreadyDisliked = blogPost.dislikes.includes(userId);

    if (alreadyLiked) {
      // Remove like and decrement likes count
      blogPost.likes = blogPost.likes.filter(id => id.toString() !== userId.toString());
      if (alreadyDisliked) {
        // If disliked, remove dislike
        blogPost.dislikes = blogPost.dislikes.filter(id => id.toString() !== userId.toString());
      }
    } else {
      // Add like and increment likes count
      blogPost.likes.push(userId);
      if (alreadyDisliked) {
        // If disliked, remove dislike
        blogPost.dislikes = blogPost.dislikes.filter(id => id.toString() !== userId.toString());
      }
    }

    await blogPost.save();
    res.status(200).json({
      message: 'Blog updated',
      blog: {
        _id: blogPost._id,
        likes: blogPost.likes.length,
        dislikes: blogPost.dislikes.length,
      },
    });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).send("An error occurred");
  }
});

router.post('/comment', Middleware_fun, async (req, res) => {
  try {
    console.log('Request user:', req.user);  // Check if user is set

    const { blogId, text } = req.body;
    const userId = req.user; // Ensure userId is correctly retrieved from req.user

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized user' });
    }

    if (!blogId || !text) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create and save the new comment
    const newComment = new Comment({
      blog: blogId,
      user: userId,
      text
    });

    await newComment.save();
    console.log("Comment saved");

    // Optional: Update the blog post to include the new comment
    // const blogPost = await Blog_Schema.findById(blogId);
    // if (blogPost) {
    //   blogPost.comments.push(newComment._id);
    //   await blogPost.save();
    // }

    res.status(201).json({ comment: newComment });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).json({ message: 'An error occurred', error: error.message });
  }
});


router.post("/like-dislike-comment", Middleware_fun, async (req, res) => {
  try {
    const { commentId, type } = req.body;
    const userId = req.user;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const alreadyLiked = comment.likes.includes(userId);
    const alreadyDisliked = comment.dislikes.includes(userId);

    if (type === 'like') {
      if (alreadyLiked) {
        comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
      } else {
        comment.likes.push(userId);
        if (alreadyDisliked) {
          comment.dislikes = comment.dislikes.filter(id => id.toString() !== userId.toString());
        }
      }
    } else if (type === 'dislike') {
      if (alreadyDisliked) {
        comment.dislikes = comment.dislikes.filter(id => id.toString() !== userId.toString());
      } else {
        comment.dislikes.push(userId);
        if (alreadyLiked) {
          comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
        }
      }
    }

    await comment.save();
    res.status(200).json({
      comment: {
        _id: comment._id,
        likes: comment.likes.length,
        dislikes: comment.dislikes.length,
        text: comment.text, // Ensure text is included
        date: comment.date, // Ensure date is included
      },
    });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).send("An error occurred");
  }
});

router.get("/notifications", Middleware_fun, async (req, res) => {
  try {
    const userId = req.user;

    const notifications = await Notification.find({ user: userId }).sort({ date: -1 });

    res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).send("An error occurred");
  }
});

router.put('/update/:id', Middleware_fun, async (req, res) => {
  const blogId = req.params.id;
  const { title, tag, description} = req.body;

  try {
    // Find the blog post by ID
    const blog = await Blog_Schema.findById(blogId);

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Check if the logged-in user is the author of the blog
    if (blog.user.toString() !== req.user.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this blog' });
    }

    // Update the blog fields
    blog.title = title || blog.title;
    blog.tag = tag || blog.tag;
    blog.description = description || blog.description;
    // Set the updated date to current time

    // Save the updated blog
    const updatedBlog = await blog.save();

    res.json({
      message: 'Blog updated successfully',
      blog: updatedBlog
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Function to generate creative text
async function generateCreativeText(title, tag, description) {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
      temperature: 0.9,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    };

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    const parts = [
      {
        text: `
        Title: ${title}
        Tag: ${tag}
        Description: ${description}

        Generate a creative and attractive content based on the provided title, tag, and description.
        title not more than 10 words.
        tag should be one word.
        description should professional, attractive not more than 50 words.
        give me the title ,tag,description sperately so i can easily figure out 
        `,
      },
    ];

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig,
      safetySettings,
    });

    const response = result.response;

    return response.text();
  } catch (error) {
    console.error("Error generating creative text:", error);
    throw error;
  }
}

module.exports = router;
