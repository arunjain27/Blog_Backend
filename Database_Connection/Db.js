const mongoose = require('mongoose');
const BASE_URL=process.env.BASE_URL
function Database_Connection() {
    console.log("in the connect"); 
    mongoose.connect(`${BASE_URL}`)
        .then(() => console.log("The Database Is Connected"))
        .catch(err => console.log("Database Is Not Connected:", err));
}

module.exports = Database_Connection;
 