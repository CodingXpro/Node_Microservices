import logger from "../utils/logger.js";


export const authenticateRequest=(req,res,next)=>{
    const userId=req.headers['x-user-id'];

    if(!userId){
        logger.warn('Access ateemp without user Id')
        return res.status(401).json({
            success:false,
            message:'Authentication requires! Please login to continue'
        })
    }
    req.user={userId};
    next()
}