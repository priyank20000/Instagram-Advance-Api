const sendToken = async (user,statusCode,res,message) =>{
    const token = user.getJWTToken();
    user.token = token
    await user.save()
    const options = {
        expires: new Date(
            Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
        ),
        httpOnly:true
    }
    res.status(statusCode).cookie('token',token,options).json({
        success: true,
        message:message,
        token
    })
}

  

module.exports = sendToken