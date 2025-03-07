import express from 'express';
import { authenticateRequest } from '../middleware/authMiddleware.js';
import { createPost, deletePost, getAllPost, getPost } from '../controllers/post-controller.js';
const router=express();

router.use(authenticateRequest)

router.post('/create-post',createPost)
router.get('/all-posts',getAllPost)
router.get('/:id',getPost)
router.delete('/:id',deletePost)

export default router