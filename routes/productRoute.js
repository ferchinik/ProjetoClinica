import express from 'express';
import ProductController from '../controllers/productController.js';

const router = express.Router();

router.post('/produtos',
    ProductController.uploadMiddleware(),
    ProductController.create
);

router.get('/produtos', ProductController.list);

router.get('/produtos/:id', ProductController.getById);

router.put('/produtos/:id',
    ProductController.uploadMiddleware(),
    ProductController.update
);

router.delete('/produtos/:id', ProductController.delete);

export default router;