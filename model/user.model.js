// models/user.js
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const validator = require("validator");

const followRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { timestamps: true });

const userSchema = new mongoose.Schema({
    name:{
        type: String,
        required: false
    }, //done
    username: {
        type: String,
        required: false
    }, //done
    email: {
        type: String,
        required: false,
        validate: [validator.isEmail, "Please Enter a valid Email"]
    }, //done 
    password: {
        type: String,
        required: false
    }, ///done 
    profilePicture: {
        type: String,
        required: false
    }, // done
    bio: {
        type: String,
        // maxlength: 160,
        required: false
    }, // done
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // mein samna vala ko follow keru uska deta
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], /// samna vala na mujha follow kiya hai uska data
    followRequests: [followRequestSchema],
    isVerified: { type: Boolean, default: false }, // done  
    isPrivate: { type: Boolean, default: false }, //done
    accountType: { type: String, enum: ['personal', 'business'], default: 'personal' },  //done 
    businessDetails: {
        businessName: { type: String },
        businessCategory: { type: String },
        contactInfo: { type: String },
    }, // setting
    status: { type: String, enum: ['online', 'offline'], default: 'offline' },
    lastActive: { type: Date },
    isStatus: { type: Boolean, default: false }, // true = online,offline = show staqus and last active , false = hide status and last active
    socialMediaLinks: {
        facebook: { type: String },
        twitter: { type: String },
        instagram: { type: String },
        linkedin: { type: String },
        youtube: { type: String },
        other: { type: String },
    }, //done
    devices: [{
        deviceId: { type: String, required: true },
        deviceType: { type: String, enum: ['mobile', 'tablet', 'desktop'], required: true },
        lastActive: { type: Date, default: Date.now }
        // location: {
        //     type: {
        //     type: String, // 'Point' for GeoJSON
        //     enum: ['Point'],
        //     default: 'Point',
        //     },
        //     coordinates: {
        //     type: [Number], // [longitude, latitude]
        //     default: [0, 0], // Default to [0, 0] or null
        //     },
        // }, 
    }], //done
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    isDeleted: { type: Boolean, default: false }
},
{ timestamps:true }
);

// userSchema.methods.updateDeviceLocation = async function (deviceId, longitude, latitude) {
//     const device = this.devices.find(d => d.deviceId === deviceId);
    
//     if (device) {
//         device.location.coordinates = [longitude, latitude];
//         device.lastActive = Date.now();
//     } else {
//         // If the device does not exist, you can either do nothing or handle it as needed
//         console.log('Device not found');
//     }
    
//     await this.save();
// };
  // Method to add/update device
userSchema.methods.updateDevice = async function (deviceId, deviceType) {
    const deviceIndex = this.devices.findIndex(device => device.deviceId === deviceId);
    
    if (deviceIndex > -1) {
      // Device exists, update lastActive
      this.devices[deviceIndex].lastActive = Date.now();
    } else {
      // New device, push to the array
      this.devices.push({ deviceId, deviceType, lastActive: Date.now() });
    }
    
    await this.save();
};
//JwT Token 
userSchema.methods.getJWTToken = function (){
    return jwt.sign({
        id: this.id,
        email: this.email  
    }, process.env.SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    })
}
///////////password hase ////////
userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});
// Compare Password

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};
  

// Generating Password Reset Token
userSchema.methods.getResetPasswordToken = function () {
    // Generating Token
    const resetToken = crypto.randomBytes(20).toString("hex");
  
    // Hashing and adding resetPasswordToken to userSchema
    this.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
  
    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
  
    return resetToken;
};


const User = mongoose.model('User', userSchema);

module.exports = User;
