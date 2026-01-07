require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 8000;
const cors = require('cors');
const Routes = require('./Router/router.js');

// ===== CRITICAL: CORS MUST COME FIRST =====
app.use(
  cors({
    origin: ['http://localhost:3000', 'https://your-frontend-domain.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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