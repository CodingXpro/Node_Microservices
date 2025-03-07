import dotenv from 'dotenv'
import express from 'express';
import cors from 'cors';
import helmet from 'helmet'
import Redis from 'ioredis'
import {rateLimit} from 'express-rate-limit'
import {RedisStore} from 'rate-limit-redis'
import logger from './utils/logger.js';
import proxy from 'express-http-proxy'
import errorHandler from './middleware/errorHandler.js';
import { validateToken } from './middleware/authMiddleware.js';
dotenv.config();

const app=express();

const PORT=process.env.PORT||3000
const redisClient=new Redis(process.env.REDIS_URL)
app.use(helmet());
app.use(cors())
app.use(express.json())

const ratelimitOptions=rateLimit({
    windowMs:15*60*1000,
    max:500,
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

app.use(ratelimitOptions)
app.use((req,res,next)=>{
    logger.info(`Received ${req.method} request to ${req.url}`)
    logger.info(`Request Body, ${req.body}`)
    next();
})

const proxyOptions={
    proxyReqPathResolver:(req)=>{
        return req.originalUrl.replace(/^\/v1/,"/api")
    },
    proxyErrorHandler:(err,res,next)=>{
        logger.error(`Proxy error:${err.message}`);
        res.status(500).json({
            message:`Internal Server error`,
            error:err.message
        })
    }
}

app.use('/v1/auth',proxy(process.env.IDENTITY_SERVICE_URL,{
    ...proxyOptions,
    proxyReqOptDecorator:(proxyReqOpts,srcReq)=>{
        proxyReqOpts.headers["Content-Type"]="application/json";
        return proxyReqOpts
    },

    userResDecorator:(proxyRes,proxyResData,userReq,userRes)=>{
        logger.info(`Response received from Identity servie :${proxyRes.statusCode}`)
        return proxyResData
    }
}))

app.use('/v1/posts',validateToken,proxy(process.env.POST_SERVICE_URL,{
    ...proxyOptions,
    proxyReqOptDecorator:(proxyReqOpts,srcReq)=>{
        proxyReqOpts.headers["Content-Type"]="application/json";
        proxyReqOpts.headers["x-user-id"]=srcReq.user.userId;
        return proxyReqOpts
    },
    userResDecorator:(proxyRes,proxyResData,userReq,userRes)=>{
        logger.info(`Response received from Identity servie :${proxyRes.statusCode}`)
        return proxyResData
    }
}))

app.use(errorHandler);
app.listen(PORT,()=>{
    logger.info(`API Gateway is running on port ${PORT}`)
    logger.info(`Identity Service  is running on port ${process.env.IDENTITY_SERVICE_URL}}`)
    logger.info(`Post Service  is running on port ${process.env.POST_SERVICE_URL}}`)
    logger.info(`Redis Url ${process.env.REDIS_URL}}`)
})