require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 8000;
const cors = require('cors');
const Routes = require('./Router/router.js');

// ===== CRITICAL: CORS MUST COME FIRST =====
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'auth-token'],
    credentials: true,
  })
);

// Body parsers come AFTER CORS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', Routes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});