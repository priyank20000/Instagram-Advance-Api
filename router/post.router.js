const app = require('express');
const router = app.Router()    
//////////////////////////////
const { createPost, getAllPosts, getAllReels, getPost, likePost } = require('../controller/post.controller');
const { isAuthenticatedUser } = require('../middleware/auth');

router.post("/post", isAuthenticatedUser, createPost);

router.get("/getAllPosts", isAuthenticatedUser, getAllPosts);
router.get("/getAllReels", isAuthenticatedUser, getAllReels);

router.get("/getPost", isAuthenticatedUser, getPost );


//////////////////like post 

router.post("/post/like", isAuthenticatedUser, likePost );

module.exports  = router;