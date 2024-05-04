const auth="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1YWNlNDkwOGNkMTkyM2Q0MGQ5ZGFjNCIsImlhdCI6MTcwNTgyOTUyMH0.F8Ov1JLbzNSNJ13-PSTF3QGZm88guuSQ9mFNu1166BM"

require('dotenv').config();

const express = require('express');             //----   EXPRESS    ----// 
const app = express();
const port = process.env.port || 8000;                              //----   PORT    ----// 
const cors =require('cors'); 

 
const Routes = require('./Router/router.js');   //----   ROUTER    ----// 

app.use(express.json());
//----   ROUTER    ----// 
app.use(cors());
app.use('/', Routes);


//----   LISTEN THE PORT    ----// 

app.listen(port, () => {
console.log(`Server is running on port ${port}`);
});
