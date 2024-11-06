// controllers/userController.js

const User = require("../model/user.model");

////// user following //////
exports.followUser = async (req, res) => {
    try {
        const { id } = req.body;
        const currentUserId = req.user.id;

        const userToFollow = await User.findById(id);
        if (!userToFollow) {
            return res.status(404).json({ success: false, message: "User to follow not found" });
        }

        if (currentUserId === id) {
            return res.status(400).json({ success: false, message: "You cannot follow yourself" });
        }

        if (userToFollow.followers.includes(currentUserId)) {
            return res.status(400).json({ success: false, message: "You are already following this user" });
        }

    
        if (userToFollow.isPrivate) {
            
            // Check if a follow request is already sent
            const existingRequest = userToFollow.followRequests.find(req => req.userId.toString() === currentUserId);
            if (existingRequest) {
                return res.status(400).json({ success: false, message: "Follow request already sent" });
            }

            // Send follow request
            await User.findByIdAndUpdate(id, {
                $addToSet: { followRequests: { userId: currentUserId, status: 'pending' } }
            });

            return res.status(200).json({ success: true, message: "Follow request sent" });
        }

        // If the user is public, follow them directly
        if (userToFollow.followers.includes(currentUserId)) {
            return res.status(400).json({ success: false, message: "You are already following this user" });
        }

        await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: id } });
        await User.findByIdAndUpdate(id, { $addToSet: { followers: currentUserId } });

        res.status(200).json({ success: true, message: "Successfully followed the user" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}; //////// user following //////

exports.unfollowUser = async (req, res) => {
    try {
        const { id } = req.body;
        const currentUserId = req.user.id;

        const userToUnfollow = await User.findById(id);
        if (!userToUnfollow) {
            return res.status(404).json({ success: false, message: "User to unfollow not found" });
        }
        
        if (currentUserId === id) {
            return res.status(400).json({ success: false, message: "You cannot unfollow yourself " });
        }

        if (!userToUnfollow.followers.includes(currentUserId)) {
            return res.status(400).json({ success: false, message: "You are not following this user" });
        }

        await User.findByIdAndUpdate(currentUserId, { $pull: { following: id } });
        await User.findByIdAndUpdate(id, { $pull: { followers: currentUserId } });

        res.status(200).json({ success: true, message: "Successfully unfollowed the user" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}; ////// user unfollowing //////

exports.getAllFollowing = async (req, res) => {
    try {
        const { id } = req.body; // User ID for whom we want to get the following list
        const currentUserId = req.user.id;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Allow the user to view their own following list
        if (id === currentUserId) {
            const following = await User.find({ _id: { $in: user.following } })
            return res.status(200).json({ success: true, total: following.length, data: following });
        }

        // If the user is private, check if the current user is a follower
        if (user.isPrivate && !user.followers.includes(currentUserId)) {
            return res.status(403).json({ success: false, message: "This user has a private account. You need to follow them to see their following." });
        }

        // Fetch the following users
        const following = await User.find({ _id: { $in: user.following } })

        res.status(200).json({ success: true, total: following.length, data: following });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}; //////// get all following //////

exports.getAllFollowers = async (req, res) => {
    try {
        const { id } = req.body; // User ID for whom we want to get the followers list
        const currentUserId = req.user.id;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Allow the user to view their own followers list
        if (id === currentUserId) {
            const followers = await User.find({ _id: { $in: user.followers } })
            return res.status(200).json({ success: true, total: followers.length, data: followers });
        }

        // If the user is private, check if the current user is a follower
        if (user.isPrivate && !user.followers.includes(currentUserId)) {
            return res.status(403).json({ success: false, message: "This user has a private account. You need to follow them to see their followers." });
        }

        // Fetch the followers
        const followers = await User.find({ _id: { $in: user.followers } })

        res.status(200).json({ success: true, total: followers.length, data: followers });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}; //////// get all followers //////


// exports.respondToFollowRequest = async (req, res) => {
//     try {
//         const { requestUserId, accept } = req.body; // Accept or reject follow request
//         const currentUserId = req.user.id;

//         const user = await User.findById(currentUserId);
//         const request = user.followRequests.find(req => req.userId.toString() === requestUserId);
        
//         if (!user || !request) {
//             return res.status(404).json({ success: false, message: "Follow request not found" });
//         }

//         if (accept) {
//             // Accept the follow request
//             await User.findByIdAndUpdate(currentUserId, {
//                 $pull: { followRequests: { userId: requestUserId } },
//                 $addToSet: { followers: requestUserId }
//             });
//             await User.findByIdAndUpdate(requestUserId, {
//                 $addToSet: { following: currentUserId }
//             });

//             return res.status(200).json({ success: true, message: "Follow request accepted" });
//         } else {
//             // Reject the follow request
//             await User.findByIdAndUpdate(currentUserId, {
//                 $pull: { followRequests: { userId: requestUserId } }
//             });

//             return res.status(200).json({ success: true, message: "Follow request rejected" });
//         }
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ success: false, message: "Internal server error" });
//     }
// }; //////////// accept and reject follow request

exports.acceptFollowRequest = async (req, res) => {
    try {
        const { reqUserId } = req.body; // ID of the user who sent the follow request
        const currentUserId = req.user.id;

        const user = await User.findById(currentUserId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        if (user.followRequests.length === 0) {
            return res.status(404).json({ success: false, message: "No follow requests found." });
        }
        
        const requestIndex = user.followRequests.findIndex(req => req.userId.toString() === reqUserId);
        if (requestIndex === -1) {
            return res.status(404).json({ success: false, message: "Follow request not found." });
        }

        // Accept the follow request
        const followRequest = user.followRequests[requestIndex];
        await User.findByIdAndUpdate(currentUserId, {
            $addToSet: { followers: followRequest.userId },
            $pull: { followRequests: { userId: reqUserId } } // Remove the follow request using reqUserId
        });
        await User.findByIdAndUpdate(followRequest.userId, {
            $addToSet: { following: currentUserId }
        });

        res.status(200).json({ success: true, message: "Follow request accepted." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};////// only accept follow request for private account

exports.rejectFollowRequest = async (req, res) => {
    try {
        const { reqUserId } = req.body; // ID of the user whose follow request is being rejected
        const currentUserId = req.user.id;

        const user = await User.findById(currentUserId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        if (user.followRequests.length === 0) {
            return res.status(404).json({ success: false, message: "No follow requests found." });
        }
        const requestIndex = user.followRequests.findIndex(req => req.userId.toString() === reqUserId);
        if (requestIndex === -1) {
            return res.status(404).json({ success: false, message: "Follow request not found." });
        }

        // Reject the follow request
        await User.findByIdAndUpdate(currentUserId, {
            $pull: { followRequests: { userId: reqUserId } } // Remove the follow request using reqUserId
        });

        res.status(200).json({ success: true, message: "Follow request rejected." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}; /// only reject follow request for private account

exports.getAllFollowRequests = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const user = await User.findById(currentUserId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        if(!user.isPrivate){
            return res.status(404).json({ success: false, message: "Only private account can get follow requests." });
        }
        if (user.followRequests.length === 0) {
            return res.status(404).json({ success: false, message: "No follow requests found." });
        }
        const followRequests = user.followRequests;
        res.status(200).json({ success: true, followRequests });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}; //// get all follow requests
