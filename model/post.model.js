const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    content: {
        type: String,
        required: false // Optional for text posts or captions
    },
    media: {
        type: String, // URL to the media (image or video)
        required: true
    },
    mediaType: {
        type: String,
        enum: ['image', 'reel'],
        required: false
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        content: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    hashtags: [{
        type: String
    }],
    tags: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    visibility: {
        type: String,
        enum: ['public', 'private', 'following'],
        default: 'public'
    },
    shareCount: {
        type: Number,
        default: 0
    },
    addLocation: {
        type: String,
        default: false
    },
    views: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });



const Post = mongoose.model('Post', postSchema);

module.exports = Post;
