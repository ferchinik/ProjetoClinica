// routes/userRoute.js
import express from 'express';
import UserController from '../controllers/userController.js';

const router = express.Router();

router.post('/registro', UserController.register);
router.post('/login', UserController.login);


router.get('/profissionais', UserController.listAll); 
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    console.log("Cookie 'token' removido. Usuário deslogado.");
    res.status(200).send('Logout bem-sucedido');
});

export default router;