const User = require("../model/user.model");
const jwt = require('jsonwebtoken');

///////////// user authenticated /////////////////////////////
exports.isAuthenticatedUser = async (req, res, next) => {
    const token  = req.cookies.token ;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    try {
        const decodedData = jwt.verify(token, process.env.SECRET);
        const user = await User.findById(decodedData.id);
        if (!user) {
          return res.status(401).json({ message: 'User not found' });
        }
        req.user = user;
        next();
    } catch (error) {
      res.status(401).json({ message: 'Invalid token' });
    }
};
