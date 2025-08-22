// controllers/userController.js
import UserModel from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

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

            // Gera o Token JWT
            const payload = {
                id: user.id,
                email: user.email,
                nome: user.nombre
            };

                        // Fallback to read .env file directly if process.env is not populated
            let jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                try {
                    const envPath = path.resolve(process.cwd(), '.env');
                    const envFileContent = fs.readFileSync(envPath, { encoding: 'utf8' });
                    const match = envFileContent.match(/^JWT_SECRET=(.*)$/m);
                    if (match) {
                        jwtSecret = match[1].trim();
                    }
                } catch (e) {
                    console.error('Could not read .env file to get JWT_SECRET', e);
                    return res.status(500).json({ success: false, message: 'Internal server error: JWT secret not configured.' });
                }
            }

            if (!jwtSecret) {
                 return res.status(500).json({ success: false, message: 'JWT_SECRET not found in .env file.' });
            }

            const token = jwt.sign(payload, jwtSecret, { expiresIn: '8h' });

            // Envia o token em um cookie httpOnly
            res.cookie('token', token, {
                httpOnly: true, // Impede acesso via JavaScript no frontend
                secure: process.env.NODE_ENV === 'production', // Usar apenas em HTTPS
                maxAge: 1000 * 60 * 60 * 8, // 8 horas
                sameSite: 'lax' // Proteção contra CSRF
            });

            console.log(`Token JWT gerado para usuário ID: ${user.id} (${user.nombre})`);

            // A resposta JSON agora pode ser mais simples, 
            // pois os dados do usuário estão no token (que será usado pelo backend)
            res.status(200).json({
                success: true,
                message: 'Login bem-sucedido!',
                user: { id: user.id, email: user.email, nome: user.nombre }
            });

        } catch (error) {
            console.error("Erro no login:", error.message);
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