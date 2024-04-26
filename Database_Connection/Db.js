const mongoose = require('mongoose');

function Database_Connection() {
    console.log("in the connect"); 
    mongoose.connect('mongodb://127.0.0.1:27017/Blog_Site')
        .then(() => console.log("The Database Is Connected"))
        .catch(err => console.log("Database Is Not Connected:", err));
}

module.exports = Database_Connection;
