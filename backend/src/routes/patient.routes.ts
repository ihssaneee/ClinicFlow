import { Router } from 'express';
import { create, getById, list, remove, restore, update } from '../controllers/patient.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin, requireStaff } from '../middleware/role.middleware';

const router = Router();

router.use(authMiddleware, requireStaff);
router.post('/', create);
router.get('/', list);
router.get('/:id', getById);
router.put('/:id', update);
router.delete('/:id', requireAdmin, remove);
router.post('/:id/restore', requireAdmin, restore);

export default router;
