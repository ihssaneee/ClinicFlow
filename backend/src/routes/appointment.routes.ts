import { Router } from 'express';
import { create, list, updateStatus } from '../controllers/appointment.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireStaff } from '../middleware/role.middleware';

const router = Router();

router.use(authMiddleware, requireStaff);
router.post('/', create);
router.get('/', list);
router.patch('/:id/status', updateStatus);

export default router;
