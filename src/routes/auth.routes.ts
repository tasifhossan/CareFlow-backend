import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  getAdminOnly,
  getMe,
  login,
  logout,
  refresh,
  register,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.get('/admin-only', authenticate, authorize(Role.SUPER_ADMIN, Role.ORG_ADMIN), getAdminOnly);

export default router;
