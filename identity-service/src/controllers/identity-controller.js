import RefreshToken from "../models/RefreshToken.js";
import User from "../models/User.js";
import generateTokens from "../utils/generateToken.js";
import logger from "../utils/logger.js"
import { validateLogin, validateRegistration } from "../utils/validation.js";


//user registration
export const registerUser=async(req,res)=>{
    logger.info('Registration endpoint hit....')
    try {
        const {error}=validateRegistration(req.body);

        console.log(error)

        if(error){
            logger.warn('Validation error',error.message)
            return res.status(400).json({
                success:false,
                message:error.details[0].message
            })
        }

        const{email,password,username}=req.body

        let user=await User.findOne({$or:[{email},{username}]})
        if(user){
            logger.warn("User already exists")
            return res.status(400).json({
                success:false,
                message:"User already exists"
            })
        }
user=new User({username,email,password})
await user.save();
logger.warn("User saved successfully",user._id)
const{accessToken,refreshToken}=await generateTokens(user)

res.status(201).json({
    success:true,
    message:"User registered successfully",
    accessToken,
    refreshToken
})
    } catch (error) {
        logger.error("Registration error occured",error)
        res.status(500).json({
            success:false,
            message:"Internal Server Error"
        })
    }
}


//user login

export const loginUser=async(req,res)=>{
    logger.info('Login endpoint hit....')

    try {
        const {error}=validateLogin(req.body)
        if(error){
            logger.warn('Validation error',error.message)
            return res.status(400).json({
                success:false,
                message:error.details[0].message
            })
        }
        const {email,password}=req.body
        const user=await User.findOne({email})
        if(!user){
            logger.warn('Invalid user');
            return registerUser.status(400).json({
                success:false,
                message:'Invalid credentials'
            })
        }
        const isValidPassword=await user.comparePassword(password);
        if(!isValidPassword){
            logger.warn('Invalid password');
            return registerUser.status(400).json({
                success:false,
                message:'Invalid password'
            })
        }
        const {accessToken,refreshToken}=await generateTokens(user);
        res.json({
            accessToken,
            refreshToken,
            userId:user._id
        })
    } catch (error) {
        logger.error("Login error occured",error)
        res.status(500).json({
            success:false,
            message:"Internal Server Error"
        })
    }
}
//refresh token

export const refreshTokenUser=async(req,res)=>{
    logger.info("RefreshToken end point hit ")
    
    try {
        const{refreshToken}=req.body;
        if(!refreshToken){
            logger.warn("Refresh token is missing")
            return res.status(400).json({
                success:false,
                message:'Refresh token is missing'
            })
        }

        const storedToken=await RefreshToken.findOne({token:refreshToken})
        if(!storedToken||storedToken.expiresAt<new Date()){
            logger.warn('Invalid or Expired refresh token')
            return res.status(401).json({
                success:false,
                message:'Invalid or Expired refresh token'
            })
        }
        const user=await User.findById(storedToken.user)
        if(!user){
            logger.warn("User not found")
            return res.status(401).json({
                success:false,
                message:'User not found'
            })
        }

        const{accessToken:newAccessToken,refreshToken:newRefreshToken}=generateTokens(user)
        await RefreshToken.deleteOne({_id:storeToken._id});
        res.json({
            accessToken:newAccessToken,
            refreshToken:newRefreshToken
        })
    } catch (error) {
        logger.error("RefreshToken error occured",error)
        res.status(500).json({
            success:false,
            message:"Internal Server Error"
        })
    }
}
//logout

export const logoutUser=async(req,res)=>{
    logger.info("logoutUser end point hit ")
    try {
        const{refreshToken}=req.body;
        if(!refreshToken){
            logger.warn("Refresh token is missing")
            return res.status(400).json({
                success:false,
                message:'Refresh token is missing'
            })
        }
        await RefreshToken.deleteOne({token:refreshToken})
        logger.info('Refresh token delete for logout')
        res.json({
            success:true,
            message:"logged out successfully!"
        })
    } catch (error) {
        logger.error("Error while logging out",error)
        res.status(500).json({
            success:false,
            message:"Internal Server Error"
        })
    }
}