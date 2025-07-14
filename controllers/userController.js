// controllers/userController.js
import UserModel from '../models/userModel.js';

export default class UserController {
    static async register(req, res) {
        try {
            const userData = req.body;

             // Validação Mínima no Controller (Backend)
            const { nombre, apellido, email, especialidad, licencia, password } = userData;
             if (!nombre || !apellido || !email || !especialidad || !licencia || !password) {
                // Se a validação falhar aqui, retorna 400 Bad Request
                return res.status(400).send('Todos os campos são obrigatórios.');
             }
             // Poderia adicionar validação de formato de email, força de senha, etc.

            const message = await UserModel.registerUser(userData);
            res.status(201).send(message);
        } catch (error) {
            console.error("Erro no controller de registro:", error.message);
             // Envia a mensagem de erro específica do Model ou uma genérica
             // Usa 409 para conflito (email duplicado) e 400 para outros erros de validação
             const statusCode = error.message.includes('cadastrado') || error.message.includes('Email ou outro campo único já existe') ? 409 : 400;
             res.status(statusCode).send(error.message || 'Erro ao processar registro');
        }
    }

    static async login(req, res) {
        try {
            const user = await UserModel.loginUser(req.body);

            req.session.userId = user.id;
            req.session.userEmail = user.email;
            req.session.userName = user.nombre; // Guardando o nome na sessão

            console.log(`Sessão criada para usuário ID: ${user.id} (${user.nombre})`);
            res.status(200).json({
                success: true,
                message: 'Login bem-sucedido!',
                user: { id: user.id, email: user.email, nome: user.nombre } // Mantendo 'nome' para consistência
            });

        } catch (error) {
            console.error("Erro no login:", error.message);
            // Retorna 401 para credenciais inválidas ou erro interno
            res.status(401).json({ success: false, message: error.message || 'Falha no login' });
        }
    }

    // --- NOVO MÉTODO ---
    /**
     * Lista todos os profissionais (usuários registrados) para selects.
     */
    static async listAll(req, res) {
        try {
            console.log("[Controller] Recebido GET /profissionais");
            const professionals = await UserModel.listProfessionals();
            // Retorna a lista como JSON (o frontend espera um array)
            res.status(200).json(professionals);
        } catch (error) {
            console.error("Erro no controller ao listar profissionais:", error.message);
            // Retorna erro 500 em caso de falha
            res.status(500).json({ success: false, message: error.message || 'Erro interno ao buscar profissionais.' });
        }
    }
    // --- FIM NOVO MÉTODO ---
}