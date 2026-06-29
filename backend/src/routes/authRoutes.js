import express from 'express';
import { login, logout, register, getMe } from '../controllers/authController.js';

const router = express.Router();

// GET /api/auth/me - Retrieve current logged-in user profile
router.get('/me', getMe);

// POST /api/auth/register - Register a new user
router.post('/register', register);

// POST /api/auth/login - Login user and establish session
router.post('/login', login);

// POST /api/auth/logout - Clear user session
router.post('/logout', logout);

export default router;
