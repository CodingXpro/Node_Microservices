import Post from "../models/Post.js";
import logger from "../utils/logger.js"
import { validateCreatePost } from "../utils/validation.js";


async function invalidatePostCache(req,input){

    const cachedKey=`post:${input}`
    await req.redisClient.del(cachedKey)
const keys=await req.redisClient.keys("posts:*");

if(keys.length>0){
    await req.redisClient.del(keys);
}
}
export const createPost=async(req,res)=>{
    logger.info('create post end point hit')
    try {
        const {error}=validateCreatePost(req.body);

        if(error){
            logger.warn('Validation error',error.message)
            return res.status(400).json({
                success:false,
                message:error.details[0].message
            })
        }

        const{content,mediaIds}=req.body;
        const newlyCreatedPost=new Post({
            user:req.user.userId,
            content,
            mediaIds:mediaIds||[]

        })
        await newlyCreatedPost.save();
        await invalidatePostCache(req,newlyCreatedPost._id.toString())
        logger.info("Post created successfully!",newlyCreatedPost)
        res.status(201).json({
            success:true,
            message:'Post created successfully!'
        })
    } catch (error) {
        logger.error('Error creating post',error);
        res.status(500).json({
            success:false,
            message:"Error in creating post"
        })
    }
}

export const getAllPost=async(req,res)=>{
    try {
        const page=parseInt(req.query.page)||1;
        const limit=parseInt(req.query.limit)||10;

        const startIndex=(page-1)*limit;

        

        const cacheKey=`posts:${page}:${limit}`;
        const cachedPosts=await req.redisClient.get(cacheKey);

        if(cachedPosts){
            return res.json(JSON.parse(cachedPosts))
        }
        const posts=await Post.find({}).sort({createdAt:-1}).skip(startIndex).limit(limit)

        const totalNoOfPosts=await Post.countDocuments()

        const result={
            posts,
            currentPage:page,
            totalPages:Math.ceil(totalNoOfPosts/limit),
            totalposts:totalNoOfPosts
        }
        await req.redisClient.setex(cacheKey,300,JSON.stringify(result))
        res.json(result)
    } catch (error) {
        logger.error('Error fetching post',error);
        res.status(500).json({
            success:false,
            message:"Error fetching post"
        })
    }
}

export const getPost=async(req,res)=>{
    try {
        const postId=req.params.id;
        const cachekey=`post:${postId}`
        const cachedPosts=await req.redisClient.get(cachekey);
        if(cachedPosts){
            return res.json(JSON.parse(cachedPosts))
        }
        const singlePostDetailsById=await Post.findById(postId)

        if(!singlePostDetailsById){
            return res.status(400).json({
                message:"Post not found",
                success:false
            })
        }

        await req.redisClient.setex(cachedPosts,3600,JSON.stringify(singlePostDetailsById))

        res.json(singlePostDetailsById);
        
    } catch (error) {
        logger.error('Error fetching post',error);
        res.status(500).json({
            success:false,
            message:"Error fetching post by ID"
        })
    }
}

export const deletePost=async(req,res)=>{
    try {
        const post=await Post.findOneAndDelete({
            _id:req.params.id,
            user:req.user.userId
        })
        if(!post){
            return res.status(400).json({
                message:"Post not found",
                success:false
            })
        }
        await invalidatePostCache(req,req.params.id);
        res.json({
            message:"Post deleted successfully"
        })
        
    } catch (error) {
        logger.error('Error deleting post',error);
        res.status(500).json({
            success:false,
            message:"Error deleting post"
        })
    }
}