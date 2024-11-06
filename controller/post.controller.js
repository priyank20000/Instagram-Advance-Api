const Post = require("../model/post.model");
const User = require("../model/user.model");
const path = require('path');
const sharp = require('sharp');

exports.createPost = async (req, res) => {
    const { content, visibility, tags } = req.body;
    let mediaType = '';
    let mediaUrl = '';

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        // Check if media is uploaded
        if (req.files && req.files.media) {
            const uploadedFile = req.files.media;
            const fileSizeInMB = uploadedFile.size / (1024 * 1024); // Convert bytes to MB

            // Determine media type based on MIME type
            if (/jpeg|jpg|png/.test(uploadedFile.mimetype)) {
                mediaType = 'image';
                if (fileSizeInMB > 10) {
                    return res.status(400).json({ success: false, message: 'Image size exceeds 10 MB' });
                }
                // Validate image aspect ratio
                const image = sharp(uploadedFile.data);
                const { width, height } = await image.metadata();
                if (width !== height) {
                    return res.status(400).json({ success: false, message: 'Image must be square (1:1 aspect ratio).' });
                }
            } else if (/mp4/.test(uploadedFile.mimetype)) {
                mediaType = 'reel';
                if (fileSizeInMB > 50) {
                    return res.status(400).json({ success: false, message: 'Video size exceeds 50 MB' });
                }
            } else {
                return res.status(400).json({ success: false, message: 'Invalid media format. Only jpeg, jpg, png, and mp4 are allowed.' });
            }

            // Create the file name and path based on media type
            const newFileName = `${Date.now()}_${uploadedFile.name}`;
            const mediaPath = path.join(__dirname, `../profile/user-post-media/${mediaType === 'image' ? 'user-image' : 'user-reel'}/${newFileName}`);

            // Move the uploaded file to the new path
            await uploadedFile.mv(mediaPath);

            // Update the media URL
            mediaUrl = `${req.protocol}://${req.get('host')}/profile/user-post-media/${mediaType === 'image' ? 'user-image' : 'user-reel'}/${newFileName}`;

        } else {
            return res.status(400).json({ success: false, message: 'No media file uploaded.' });
        }

        // Prepare the post data
        const newPostData = await Post.create({
            user: user._id,
            content: content || '',  // Default to empty if no content is provided
            media: mediaUrl,         // URL of the uploaded media
            mediaType,               // Media type (image/reel)
            visibility: visibility || 'public',  // Default to 'public' if not specified
            tags: tags || [],         // Default to empty array if no tags are provided
        });
        if (!newPostData) {
            return res.status(400).json({ success: false, message: 'Failed to create post.' });
        }

        res.status(201).json({
            success: true,
            message: "Post created successfully",
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};


exports.getAllPosts = async (req, res) => {
    try {
        const { id } = req.body;
        const currentUserId = req.user.id;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        const posts = await Post.find({ user: user._id });
        if (!posts) {
            return res.status(404).json({ success: false, message: "Posts not found!" });
        }
        const imagePosts = posts.map(post => {
            // Check if the 'mediaType' matches 'image' and if the post belongs to the current user
            if (post.mediaType === 'image') {
                return post.toObject();  // Convert to plain object to return it
            }
            return null;  // Skip posts that don't match the conditions
        }).filter(post => post !== null); 
        if (id === currentUserId) {
            // const imagePosts = posts.flatMap(post => 
            //     post.post.filter(item => item.mediaType === 'image')
            // );
            
            return res.status(200).json({
                success: true,
                data: imagePosts
            });
        }
        // If the user is private, check if the current user is a follower
        if (user.isPrivate && !user.followers.includes(currentUserId)) {
            return res.status(403).json({ success: false, message: "This user has a private account. You need to follow them to see their Posts." });
        }

        res.status(200).json({ success: true, data: imagePosts });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

exports.getAllReels = async (req, res) => {
    try {
        const { id } = req.body; // The ID of the user whose reels are being fetched
        const currentUserId = req.user.id; // Current logged-in user's ID
        
        // Step 1: Find the user whose posts we want to fetch
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        // Step 2: Fetch all posts for this user (this will include posts with 'post' array)
        const posts = await Post.find({ user: user._id });
        if (!posts.length) {
            return res.status(404).json({ success: false, message: "No posts found!" });
        }

        // Step 3: Filter out posts where mediaType === 'reel' from each Post document
        const reelPosts = posts.map(post => {
            // Check if the 'mediaType' matches 'image' and if the post belongs to the current user
            if (post.mediaType === 'reel' ) {
                return post.toObject();  // Convert to plain object to return it
            }
            return null;  // Skip posts that don't match the conditions
        }).filter(post => post !== null); 

        // Step 4: Check if the current user is the same as the user whose posts are being fetched
        if (id === currentUserId) {
            return res.status(200).json({
                success: true,
                data: reelPosts  // Return the reel posts for the logged-in user
            });
        }

        // Step 5: Handle private account visibility (If the account is private, check if the user is a follower)
        if (user.isPrivate && !user.followers.includes(currentUserId)) {
            return res.status(403).json({
                success: false,
                message: "This user has a private account. You need to follow them to see their Reels."
            });
        }

        // Step 6: Return the filtered posts (reel posts) for public or approved users (followers)
        res.status(200).json({
            success: true,
            data: reelPosts  // Return the filtered reel posts
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.getPost = async (req, res) => { 
    try {
        const currentUserId = req.user.id;
        const post = await Post.findById(req.body.id).populate('user').populate('comments').populate('likes');
        if (!post) {
            return res.status(200).json({
                success:false,
                message:"Product Not Found"
            })
        }
        if (currentUserId === post.user.id) {
            post.views += 1;
            await post.save();
            return res.status(200).json({
                success: true,
                data: post
            });
        }
        // Check if the post's user is private and if the current user is not a follower
        if (post.user.isPrivate && !post.user.followers.includes(currentUserId)) {
            return res.status(403).json({ success: false, message: "This user has a private account. You need to follow them to see this post." });
        }
        post.views += 1;
        await post.save();
        res.status(200).json({
            success:true,
            data: post
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

///////// like 
exports.likePost = async (req, res) => {
    try {
        const { postId } = req.body; // Get post ID from the request body
        const userId = req.user.id; // Get the ID of the user liking/unliking the post

        // Validate input
        if (!postId) {
            return res.status(400).json({ success: false, message: "Post ID is required." });
        }

        // Find the post by ID
        const post = await Post.findOne({ "post._id": postId });
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found!" });
        }

        // Find the specific post item within the post array
        const postItem = post.post.id(postId);

        // Check if the user has already liked the post
        const isLiked = postItem.likes && postItem.likes.includes(userId);

        // If already liked, unlike the post
        if (isLiked) {
            postItem.likes = postItem.likes.filter(like => like.toString() !== userId);
            await post.save();

            return res.status(200).json({
                success: true,
                message: "Post unliked successfully",
                likesCount: postItem.likes.length // Return the updated likes count
            });
        }

        // If not liked, check visibility rules for private accounts
        if (postItem.visibility === 'private') {
            const isFollower = post.user.followers.includes(userId);
            if (!isFollower) {
                return res.status(403).json({ success: false, message: "You must follow this user to like their post." });
            }
        }

        // Add the user to the likes array
        if (!postItem.likes) {
            postItem.likes = []; // Initialize likes array if it doesn't exist
        }
        postItem.likes.push(userId);
        await post.save();

        return res.status(200).json({
            success: true,
            message: "Post liked successfully",
            likesCount: postItem.likes.length // Return the updated likes count
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};




