const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const fileUpload = require('express-fileupload');
const path = require('path');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const server = require('./database/database');
const user = require('./router/user.router');
const follow = require('./router/follow.router');
const post = require('./router/post.router');

const app = express();

/////////// rate limit
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});


// Load environment variables
dotenv.config({ path: 'config/config.env' });

// Middleware setup
app.use('/profile', express.static(path.join(__dirname, '/profile')));
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(helmet());
app.use(limiter);
app.use(compression());
app.use(fileUpload());  



// / Routes
app.use('/api/v1', user)
app.use('/api/v1', follow)
app.use('/api/v1', post)

// Database connection
server().then(() => {
    console.log("Database Connected Successfully");
}).catch(err => {
    console.error("Database Connection Error:", err);
});


// Start server
app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
