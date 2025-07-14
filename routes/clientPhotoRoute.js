// clinica/routes/clientPhotoRoute.js
import express from 'express';
import ClientPhotoController from '../controllers/clientPhotoController.js';


const router = express.Router();


router.post('/clientes/:cliente_id/fotos',
    ClientPhotoController.uploadMiddleware(), 
    ClientPhotoController.create          
);
router.get('/clientes/:cliente_id/fotos',
    ClientPhotoController.listByClient
);

router.delete('/fotos/:id',
    ClientPhotoController.delete
);

export default router;