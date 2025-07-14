// clinica/routes/anamneseRoute.js
import express from 'express';
import AnamneseController from '../controllers/anamneseController.js';

const router = express.Router();


router.post('/clientes/:cliente_id/anamneses',
    AnamneseController.create
);

router.get('/clientes/:cliente_id/anamneses',
    AnamneseController.listByClient
);

router.get('/anamneses/:id',
    AnamneseController.getById
);
router.put('/anamneses/:id',
    AnamneseController.update
);

export default router;