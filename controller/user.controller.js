const User = require("../model/user.model");
const sendToken = require("../utils/jwtToken");
const sendEmail = require("../utils/sendEmail");
const device = require('device');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const Post = require("../model/post.model");

exports.register = async (req, res) => {
    try {
        const { name, email, password, comformPassword, username, isPrivate } = req.body;

        // Input validation
        if (!name || !email || !password || !comformPassword || !username) {
            return res.status(400).json({ message: "Please fill all the fields" });
        }

        // Check for existing user
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Validate email and password
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.toLowerCase())) {
            return res.status(400).json({ message: 'Invalid email address' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }
        if (password !== comformPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        if(name.length < 2 || name.length > 20){
            return res.status(400).json({ message: 'Name must be between 2 and 20 characters long' });
        }

        if(username.length < 4 || username.length > 20){
            return res.status(400).json({ message: 'Username must be between 4 and 20 characters long' });
        }
        // Validate username
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ message: "Username already exists" });
        }

        // Get device info
        const ua = req.headers['user-agent'];
        const deviceInfo = device(ua);
        // Map device types to your enum
        const deviceTypeMap = {
            'phone': 'mobile',  // Assuming 'phone' is a common output, map it to 'mobile'
            'tablet': 'tablet',
            'desktop': 'desktop'
        };
        
        const validDeviceType = deviceTypeMap[deviceInfo.type] || 'desktop'; // Default to 'desktop'

        // Create new user
        const newUser = await User.create({
            name,
            email,
            password,
            username,
            isPrivate,
            isVerified: true,
            devices: [{
                deviceId: ua,          // You can use user-agent as device ID
                deviceType: validDeviceType
            }]
        });

        // Send email notification
        await sendEmail({
            email: email,
            subject: 'Registration Successful',
            message: `Welcome, ${username}! Your registration was successful.`,
        });

        // Send JWT token
        sendToken(newUser, 201, res, "User created successfully");
        
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}; /// register

exports.login =  async (req,res,next) =>{
    const { email, password , username } = req.body;

    if (!email && !username || !password ) return res.status(200).json({ success: false, message: "Please fill all the fields" });
    try{
        const user = await User.findOne( { $or: [{ email }, { username }] } );
        if(!user){
            return res.status(200).json({ success: false, message: "Email or Username  combination is invalid" });
        }
        if (!user || user.isDeleted) {
            return res.status(404).json({ success: false, message: "User not found or account is deleted" });
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if(!isPasswordMatch){
            return res.status(200).json({ success: false, message: "Password combination is invalid" });
        }
        
        const userWithoutPassword = { ...user._doc };
        delete userWithoutPassword.password;
        sendToken(user, 200, res, "Login successful");
    }catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}  ////// login

//// logout 

exports.profile = async (req, res) => {
    try {
        const { name, username, bio, socialMediaLinks } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found!" });
        }
       
        if (req.files && req.files.image) {
            const uploadedFile = req.files.image;
            const fileSizeInMB = uploadedFile.size / (1024 * 1024); // Convert bytes to MB
            
            if (fileSizeInMB > 2) {
                return res.status(400).json({ success: false, message: 'Image size exceeds 2 MB' });
            }

            const allowedImageTypes = /jpeg|jpg|png/;
            if (!allowedImageTypes.test(uploadedFile.mimetype)) {
                return res.status(400).json({ success: false, message: 'Invalid image format. Only jpeg, jpg, and png are allowed.' });
            }

            const oldImagePath = user.profilePicture ? path.join(__dirname, `../${user.profilePicture.replace(/^.*\/\/[^\/]+/, '')}`) : null;
            const newFileName = `${Date.now()}_${uploadedFile.name}`;
            const newImagePath = path.join(__dirname, `../profile/user-media/${newFileName}`);

            // Move the uploaded file to the new path
            await uploadedFile.mv(newImagePath);

            // Update the user image URL
            const imageUrl = `${req.protocol}://${req.get('host')}/profile/user-media/${newFileName}`;
            user.profilePicture = imageUrl;

            // Delete the old image if it exists and is different
            if (oldImagePath && oldImagePath !== newImagePath) {
                await fs.unlink(oldImagePath).catch(err => {
                    console.error("Failed to delete old image:", err);
                });
            }
        }
        
        if (bio !== undefined) {
            if(bio.length > 160){
                return res.status(400).json({ message: 'Bio must be less than 160 characters long' });
            }
            user.bio = bio;
        } 
        if (socialMediaLinks !== undefined) user.socialMediaLinks = socialMediaLinks;
        if (name !== undefined) {
            if(name.length < 2 || name.length > 20){
                return res.status(400).json({ message: 'Name must be between 2 and 20 characters long' });
            }
            user.name = name;
        } 
        if (username !== undefined) {
            if(username.length < 4 || username.length > 20){
                return res.status(400).json({ message: 'Username must be between 4 and 20 characters long' });
            }
            // Validate username
            const existingUsername = await User.findOne({ username });
            if (existingUsername) {
                return res.status(400).json({ message: "Username already exists" });
            }
            user.username = username;
            
        }  

        user.updatedAt = new Date();
        await user.save();

        res.status(200).json({
            success: true,
            message: "Profile updated successfully"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}; /// profile

exports.getUserById = async (req, res) => {
    try {
        const currentUserId = req.user.id; // Get the current user's ID
        const userIdToFetch = req.body.id; // Get the user ID to fetch

        // Validate the user ID from the request body
        if (!userIdToFetch) {
            return res.status(400).json({ success: false, message: "User ID is required." });
        }

        const user = await User.findById(userIdToFetch)
            .populate('followers')
            .populate('following')
            .populate('post');

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const postCount = await Post.countDocuments({ user: userIdToFetch });
        // If the current user is viewing their own profile, return full details
        if (currentUserId === userIdToFetch) {
            return res.status(200).json({
                success: true,
                followers: user.followers ? user.followers.length : 0,
                following: user.following ? user.following.length : 0,
                posts: postCount,
                data: user
            });
        }

        // If the user is private
        if (user.isPrivate) {
            // Check if the current user's ID is in the user's followers
            const isFollower = user.followers.some(follower => follower._id.toString() === currentUserId);

            if (isFollower) {
                // Follower, return full details
                return res.status(200).json({
                    success: true,
                    followers: user.followers ? user.followers.length : 0,
                    following: user.following ? user.following.length : 0,
                    posts: postCount,
                    data: user
                });
            } else {
                // Not a follower, return limited details
                return res.status(200).json({
                    success: true,
                    data: {
                        name: user.name,
                        username: user.username,
                        bio: user.bio || "No bio available",
                        profilePicture: user.profilePicture || "No profile picture available",
                        followers: user.followers ? user.followers.length : 0,
                        following: user.following ? user.following.length : 0,
                        posts: postCount
                    }
                });
            }
        }

        // If the user is public, return full user data
        res.status(200).json({
            success: true,
            followers: user.followers ? user.followers.length : 0,
            following: user.following ? user.following.length : 0,
            posts: postCount,
            data: user,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}; // get user







