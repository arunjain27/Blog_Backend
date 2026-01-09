const Database_Connection = require("../Database_Connection/Db.js");
Database_Connection(); //---- DATABASE_CONNECTION  ----//

const API_KEY_GEMINI = process.env.API_KEY_GEMINI;

const express = require("express");
const router = express.Router();
const NodeCache = require("node-cache");
const cache = new NodeCache();
const cloudinary = require("../Cloudinary/Cloudinary_Details.js");
const User = require("../Schema/User.Schema.js");
const Blog_Schema = require("../Schema/Blog_Detail.Schema.js");
const Comment = require("../Schema/Comment_Schema.js");
const Middleware_fun = require("../middleware/Auth_User.js");
const multer = require("multer");
const { Readable } = require("stream");

const MODEL_NAME = process.env.MODEL_NAME;
const axios = require("axios");
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const numSaltRounds = 8;

const {
  loginValidator,
  createValidator,
} = require("../Validator/Express_Validator.js");

const express_validator = require("express-validator");
const validationResult = express_validator.validationResult;

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
    let token = jwt.sign(data, PRIVATE_KEY);
    res.json({ data: token, username: Username, userid: UserId });
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
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    let users = await User.findOne({ email: email });

    if (users) {
      console.log('users - ', users);
      let user_password = users.password;
      let user_name = users.name;
      const result = user_password == password ? true : false;
      if (result) {
        const UserId = users.id;
        const Username = users.name;
        let data = {
          id: UserId,
          name: Username,
        };
        let token = jwt.sign(data, PRIVATE_KEY);
        res.json({ data: token, username: user_name, userid: UserId });
      } else {
        res.status(401).json({ message: "incorrect password" });
      }
    } else {
      res.status(404).json({ message: "not a valid user. Sign in properly." });
    }
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).send("An error occurred");
  }
});

//----   BLOG_DETAIL REQUEST   ----//
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post(
  "/blogdetail",
  Middleware_fun,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded." });
      }
      const { title, tag, description } = req.body;
      if (!title || !description || !tag) {
        return res.status(400).json({ message: "All fields are required." });
      }
      const stream = new Readable();
      stream.push(req.file.buffer);
      stream.push(null);

      const uploadStream = cloudinary.uploader.upload_stream(
        { secure: true, transformation: [{ width: 800, crop: "limit" }] },
        async (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            return res
              .status(500)
              .json({ message: "Image upload failed", error: error.message });
          }
          const blogDetail = new Blog_Schema({
            user: req.user,
            name: req.name,
            title,
            tag,
            description,
            image: result.secure_url,
          });

          try {
            const savedBlogDetail = await blogDetail.save();
            res.status(201).json({ blogdetail: savedBlogDetail });
          } catch (err) {
            console.error("Error saving blog detail:", err);
            res
              .status(500)
              .json({
                message: "Failed to save blog detail",
                error: err.message,
              });
          }
        }
      );

      stream.pipe(uploadStream);
    } catch (error) {
      console.error("Error in blogdetail route:", error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error: error.message });
    }
  }
);

// Cache middleware
const cacheMiddleware = (req, res, next) => {
  const key = req.originalUrl || req.url;
  const cachedData = cache.get(key);
  if (cachedData) {
    return res.json(cachedData);
  }
  res.sendResponse = res.json;
  res.json = (body) => {
    cache.set(key, body, 60);
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
    }
    const sortedBlogs = await Blog_Schema.find({ user: id })
      .sort({ date: -1 })
      .exec();
    res.json({ userblog: sortedBlogs, user: finalname });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).send("An error occurred");
  }
});

// all the blog post with pagination support
router.post("/allpost", Middleware_fun, async (req, res) => {
  try {
    let userid = req.user;
    let finalname = "none";

    if (userid !== "none") {
      const user = await User.findById(userid);
      if (user) {
        finalname = user.name;
      }
    }
    
    // Pagination support
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 12;
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const totalBlogs = await Blog_Schema.countDocuments();
    const totalPages = Math.ceil(totalBlogs / limit);
    
    // Fetch paginated blogs
    const sortedBlogs = await Blog_Schema.find()
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    
    res.json({ 
      userblog: sortedBlogs, 
      username: finalname,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalBlogs: totalBlogs,
        hasMore: page < totalPages
      }
    });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).send("An error occurred");
  }
});

// -----  DELETE  REQUEST    -----//
const deleteImageFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error deleting image:", error);
  }
};

// Get popular posts (most liked)
router.get("/popular", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const popularBlogs = await Blog_Schema.find()
      .sort({ "likes.length": -1, date: -1 })
      .limit(limit)
      .select("_id title image tag date name likes")
      .exec();
    res.json({ blogs: popularBlogs });
  } catch (error) {
    console.error("Error fetching popular posts:", error);
    res.status(500).json({ message: "Error fetching popular posts" });
  }
});

// Get categories/tags
router.get("/categories", async (req, res) => {
  try {
    const categories = await Blog_Schema.distinct("tag");
    res.json({ categories: categories.filter(Boolean) });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Error fetching categories" });
  }
});

// Get blogs by tag/category
router.post("/category/:tag", Middleware_fun, async (req, res) => {
  try {
    const tag = req.params.tag;
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 12;
    const skip = (page - 1) * limit;
    
    const totalBlogs = await Blog_Schema.countDocuments({ tag: tag });
    const totalPages = Math.ceil(totalBlogs / limit);
    
    const blogs = await Blog_Schema.find({ tag: tag })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    
    res.json({
      userblog: blogs,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalBlogs: totalBlogs,
        hasMore: page < totalPages
      }
    });
  } catch (error) {
    console.error("Error fetching posts by category:", error);
    res.status(500).json({ message: "Error fetching posts by category" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const blogPost = await Blog_Schema.findOne({ _id: id });

    const url = blogPost.image;
    const publicId = url.substring(
      url.lastIndexOf("/") + 1,
      url.lastIndexOf(".")
    );

    await deleteImageFromCloudinary(publicId);
    const deletepost = await Blog_Schema.deleteOne({ _id: id });

    res.json({ success: true });
  } catch (error) {
    console.error("Error fetching blog post or deleting image:", error);
    res.json({ success: false });
  }
});

// -----  UPDATE  REQUEST    -----//
router.get("/blog/:id", async (req, res) => {
  try {
    const blogId = req.params.id;
    const blog = await Blog_Schema.findById(blogId)
      .populate("user", "name")
      .exec();

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    const comments = await Comment.find({ blog: blogId })
      .populate("user", "name")
      .exec();
    const response = {
      blog: {
        _id: blog._id,
        name: blog.name,
        title: blog.title,
        tag: blog.tag,
        description: blog.description,
        image: blog.image,
        date: blog.date,
        likes: blog.likes.length,
        dislikes: blog.dislikes.length,
        comments: comments.map((comment) => ({
          _id: comment._id,
          text: comment.text,
          date: comment.date,
          likes: comment.likes.length,
          dislikes: comment.dislikes.length,
          user: comment.user,
        })),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching blog by ID:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put("/:id", Middleware_fun, async (req, res) => {
  try {
    const { text } = req.body;
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    comment.text = text;
    const updatedComment = await comment.save();
    res.json({ comment: updatedComment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/newpost", async (req, res) => {
  try {
    const { title, tag, description } = req.body;
    const prompt =
      "Improve the title blog post: , improve the english , looks more attractive ,creative and professional";

    const improvedTitle = await improveText(prompt, title);
    const improvedTag = await improveText(prompt, tag);
    const improvedDescription = await improveText(prompt, description);

    res.status(201).json({
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

const genAI = new GoogleGenerativeAI(API_KEY_GEMINI);

router.put("/comment/:id", Middleware_fun, async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user;
    const { text } = req.body;
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    if (comment.user.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this comment" });
    }
    comment.text = text;
    await comment.save();
    res.status(200).json({ message: "Comment updated successfully", comment });
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({ message: "An error occurred" });
  }
});

router.delete("/comment/:id", Middleware_fun, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id).populate("user");
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (!req.user || !comment.user) {
      return res.status(400).json({ message: "User or comment not found" });
    }
    if (comment.user._id.toString() !== req.user.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await Comment.findByIdAndDelete(req.params.id);

    res.json({ message: "Comment removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate({
      path: "comments",
      populate: { path: "user", select: "name" },
    });

    res.json({ blog });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/generateText", async (req, res) => {
  try {
    console.log("=== API KEY CHECK ===");
console.log("API_KEY_GEMINI from env:", process.env.API_KEY_GEMINI);
console.log("API_KEY_GEMINI length:", process.env.API_KEY_GEMINI?.length);
console.log("====================");
    const { title, tag, description } = req.body;
    
    // Validate input
    if (!title || !tag || !description) {
      return res.status(400).json({ 
        error: "Missing required fields: title, tag, or description" 
      });
    }
    
    const str = await generateCreativeText(title, tag, description);

    let sections = str.split("\n\n");

    let generatedTitle = sections[0].replace("**Title:** ", "").replace("**Title:**", "").trim();
    let generatedTag = sections[1].replace("**Tag:** ", "").replace("**Tag:**", "").trim();
    let generatedDescription = sections[2].replace("**Description:** ", "").replace("**Description:**", "").trim();

    res.status(200).json({ 
      generatedTitle, 
      generatedTag, 
      generatedDescription 
    });
  } catch (error) {
    console.error("Error in /generateText route:", error);
    res.status(500).json({ 
      error: "Failed to generate text",
      message: error.message,
      details: "Please check your API key and quota limits"
    });
  }
});
router.post("/like", Middleware_fun, async (req, res) => {
  try {
    const { blogId } = req.body;
    const userId = req.user;

    if (!userId || userId === "none") {
      return res.status(401).json({ message: "Unauthorized user" });
    }
    const blogPost = await Blog_Schema.findById(blogId);
    if (!blogPost) {
      return res.status(404).json({ message: "Blog post not found" });
    }
    const alreadyLiked = blogPost.likes.includes(userId);
    const alreadyDisliked = blogPost.dislikes.includes(userId);
    if (alreadyLiked) {
      blogPost.likes = blogPost.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
      if (alreadyDisliked) {
        blogPost.dislikes = blogPost.dislikes.filter(
          (id) => id.toString() !== userId.toString()
        );
      }
    } else {
      blogPost.likes.push(userId);
      if (alreadyDisliked) {
        blogPost.dislikes = blogPost.dislikes.filter(
          (id) => id.toString() !== userId.toString()
        );
      }
    }

    await blogPost.save();
    res.status(200).json({
      message: "Blog updated",
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

router.post("/comment", Middleware_fun, async (req, res) => {
  try {
    const { blogId, text } = req.body;
    const userId = req.user;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized user" });
    }

    if (!blogId || !text) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const newComment = new Comment({
      blog: blogId,
      user: userId,
      text,
    });

    await newComment.save();
    
    // Populate user field before sending response
    const populatedComment = await Comment.findById(newComment._id)
      .populate("user", "name")
      .exec();
    
    res.status(201).json({ 
      comment: populatedComment
    });
  } catch (error) {
    console.error("Error occurred:", error);
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
});

router.post("/like-dislike-comment", Middleware_fun, async (req, res) => {
  try {
    const { commentId, type } = req.body;
    const userId = req.user;
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    const alreadyLiked = comment.likes.includes(userId);
    const alreadyDisliked = comment.dislikes.includes(userId);

    if (type === "like") {
      if (alreadyLiked) {
        comment.likes = comment.likes.filter(
          (id) => id.toString() !== userId.toString()
        );
      } else {
        comment.likes.push(userId);
        if (alreadyDisliked) {
          comment.dislikes = comment.dislikes.filter(
            (id) => id.toString() !== userId.toString()
          );
        }
      }
    } else if (type === "dislike") {
      if (alreadyDisliked) {
        comment.dislikes = comment.dislikes.filter(
          (id) => id.toString() !== userId.toString()
        );
      } else {
        comment.dislikes.push(userId);
        if (alreadyLiked) {
          comment.likes = comment.likes.filter(
            (id) => id.toString() !== userId.toString()
          );
        }
      }
    }

    await comment.save();
    res.status(200).json({
      comment: {
        _id: comment._id,
        likes: comment.likes.length,
        dislikes: comment.dislikes.length,
        text: comment.text,
        date: comment.date,
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

    const notifications = await Notification.find({ user: userId }).sort({
      date: -1,
    });

    res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).send("An error occurred");
  }
});

router.put("/update/:id", Middleware_fun, async (req, res) => {
  const blogId = req.params.id;
  const { title, tag, description } = req.body;

  try {
    const blog = await Blog_Schema.findById(blogId);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    if (blog.user.toString() !== req.user.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this blog" });
    }
    blog.title = title || blog.title;
    blog.tag = tag || blog.tag;
    blog.description = description || blog.description;
    const updatedBlog = await blog.save();
    res.json({
      message: "Blog updated successfully",
      blog: updatedBlog,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
async function generateCreativeText(title, tag, description) {
  try {
    console.log("Starting content generation...");
    
    // Use gemini-1.5-flash (stable and reliable)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview"
    });

    const prompt = `Generate creative blog content based on these inputs:

Title: ${title}
Tag: ${tag}  
Description: ${description}

Create improved versions following these rules:
- Title: Maximum 10 words, catchy and professional
- Tag: Single word only
- Description: 30-50 words, engaging and professional

Return ONLY in this exact format:
**Title:** [improved title here]

**Tag:** [single tag word here]

**Description:** [improved description here]`;

    console.log("Calling Gemini API...");
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    console.log("Generated text:", text);
    return text;
    
  } catch (error) {
    console.error("Error generating creative text:", error);
    console.error("Error message:", error.message);
    throw error;
  }
}
module.exports = router;