// clinica/routes/medidasRoute.js
import express from 'express';
import MedidasController from '../controllers/medidasController.js';

const router = express.Router();

router.post('/clientes/:cliente_id/medidas',
    MedidasController.create
);

router.get('/clientes/:cliente_id/medidas',
    MedidasController.listByClient
);

router.get('/medidas/:id',
    MedidasController.getById
);


router.put('/medidas/:id',
    MedidasController.update
);

router.delete('/medidas/:id',
    MedidasController.delete
);

export default router;