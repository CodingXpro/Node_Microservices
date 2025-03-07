import dotenv from 'dotenv';
import mongoose from 'mongoose';
import logger from './utils/logger.js';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import {RateLimiterRedis} from 'rate-limiter-flexible'
import Redis from 'ioredis'
import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import routes from './routes/identity-service.js'
import errorHandler from './middleware/errorHandler.js';

dotenv.config();
const app=express()

const PORT=process.env.PORT||3000
//connect to mongodb

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

const rateLimiter=new RateLimiterRedis({
    storeClient:redisClient,
    keyPrefix:'middleware',
    points:10,
    duration:1
})

app.use((req,res,next)=>{
    rateLimiter.consume(req.ip).then(()=>next()).catch(()=>{
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success:false,
            message:"Too many requests"
        })
    })
})

//rate limiting for sensitibe endpoint for the api


const sensitiveEndPointsLimiter=rateLimit({
    windowMs:15*60*1000,
    max:50,
    standardHeaders:true,
    legacyHeaders:false,
    handler:(req,res)=>{
        logger.warn(`Sensitive endpoint rate limiting exceeded for IP:${req.ip}`)
        res.status(429).json({
            success:false,
            message:"Too many requests"
        })
    },
    store:new RedisStore({
        sendCommand:(...args)=>redisClient.call(...args),

    })
})

app.use('/api/auth/register',sensitiveEndPointsLimiter)

app.use('/api/auth',routes)

app.use(errorHandler)

app.listen(PORT,()=>{
    logger.info(`identity service is running on port ${PORT}`)
})

process.on('unhandledRejection',(reason,promise)=>{
    logger.error('unhandledRejection Rejection at',promise,"reason :",reason)
})