// routes/userRoute.js
import express from 'express';
import UserController from '../controllers/userController.js';

const router = express.Router();

router.post('/registro', UserController.register);
router.post('/login', UserController.login);


router.get('/profissionais', UserController.listAll); 
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Erro ao destruir sessão:", err);
            return res.status(500).send('Erro ao fazer logout');
        }
        res.clearCookie('connect.sid'); 
        console.log("Sessão destruída no backend.");
        res.status(200).send('Logout bem-sucedido');
    });
});

export default router;