const Database_Connection = require("../Database_Connection/Db.js");
Database_Connection(); //----  DATABASE_CONNECTION    ----//
const express = require("express");
const app = express();
const NodeCache = require("node-cache");
const cache = new NodeCache();
const router = express.Router();
const cloudinary = require("../Cloudinary/Cloudinary_Details.js"); //----  CLOUDINARY    ----//
const User = require("../Schema/User.Schema.js"); //----   USER_SCHEMA    ----//
const Blog_Schema = require("../Schema/Blog_Detail.Schema.js"); //----   BLOG_SCHEMA    ----//
const Middleware_fun = require("../middleware/Auth_User.js"); //----   MIDDLEWARE    ----//
const multer = require("multer");
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
app.use(cors());
//----  STORAGE FUNCTION    ----//
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

    let token = jwt.sign(data,PRIVATE_KEY);

    res.json({ data: token });
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

        res.json({ data:token  ,username:user_name });
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

    const sortedBlogs = await Blog_Schema.find().sort({ date: -1 }).exec();

    res.json({ userblog: sortedBlogs, username: finalname });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).send("An error occurred");
  }
});

// -----  DELETE  REQUEST    -----//

router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    console.log(id);

    const delete_Element = await Blog_Schema.deleteOne({ _id: id });
    res.send(delete_Element);
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).send("An error occurred");
  }
});

// -----  UPDATE  REQUEST    -----//

router.put("/update/:id", async (req, res) => {
  try {
    console.log(req.params.id);
    const Obj_Id = await Blog_Schema.findOne({ _id: req.params.id });

    if (!Obj_Id) {
      res.send("NO OBJECT IS EXIST FOR UPDATE");
    }
    const { title, tag, description } = req.body;

    if (title) {
      Obj_Id.title = title;
    }
    if (tag) {
      Obj_Id.description = description;
    }

    if (description) {
      Obj_Id.description = description;
    }

    const update = await Blog_Schema.updateOne({ _id: req.params.id }, Obj_Id);
    res.send(update);
  } catch (error) {}
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
