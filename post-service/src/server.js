
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import postRoutes from './routes/post-routes.js'
import errorHandler from './middleware/errorHandler.js';
import Redis from 'ioredis'
import logger from './utils/logger.js';

const app=express();

const PORT=process.env.PORT||3002

mongoose.connect(process.env.MONGODB_URL).then(()=>
    logger.info("Connected to mongodb")
).catch(e=>logger.error("Mongo connection error",e))

const redisClient=new Redis(process.env.REDIS_URL)

app.use(helmet())
app.use(cors())
app.use(express.json());

app.use((req,res,next)=>{
    logger.info(`Received ${req.method} request to ${req.url}`)
    logger.info(`Request Body, ${req.body}`)
    next();
})

app.use('/api/posts',(req,res,next)=>{
    req.redisClient=redisClient;
    next()
},postRoutes)

app.use(errorHandler);

app.listen(PORT,()=>{
    logger.info(`post service is running on port ${PORT}`)
})

process.on('unhandledRejection',(reason,promise)=>{
    logger.error('unhandledRejection Rejection at',promise,"reason :",reason)
})