const mongoose  = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({path: "./config/config.env"});

async function server(){
    await mongoose.connect(process.env.MONGO_URI);
}

module.exports = server;
server();