const app = require('express');
const router = app.Router()    
//////////////////////////////
const { followUser, acceptFollowRequest, rejectFollowRequest, unfollowUser, getAllFollowRequests, getAllFollowing, getAllFollowers } = require('../controller/follow.controller');
const { isAuthenticatedUser } = require('../middleware/auth');

router.post("/follow", isAuthenticatedUser, followUser);
router.post("/unfollow", isAuthenticatedUser, unfollowUser);

router.get("/following", isAuthenticatedUser, getAllFollowing);
router.get("/followers", isAuthenticatedUser, getAllFollowers);

////// for private account
router.post("/follow/accept-request", isAuthenticatedUser, acceptFollowRequest );
router.post("/follow/reject-request", isAuthenticatedUser, rejectFollowRequest );

//// get all follow requests
router.get("/follow-requests", isAuthenticatedUser, getAllFollowRequests );



module.exports  = router;