import express from 'express';
import { login, logout } from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/login - Login user and establish session
router.post('/login', login);

// POST /api/auth/logout - Clear user session
router.post('/logout', logout);

export default router;
