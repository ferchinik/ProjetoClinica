// clinica/serve.js (VERSÃO COMPLETA E ATUALIZADA COM ANAMNESE)


import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { connectDatabase } from './config/db.js';
import UserModel from './models/userModel.js';
import TransactionModel from './models/transactionModel.js'; 
import userRoutes from './routes/userRoute.js';
import productRoutes from './routes/productRoute.js';
import categoryRoute from './routes/categoryRoute.js';
import clientRoutes from './routes/clientRoute.js';
import transactionRoute from './routes/transactionRoute.js';
import agendamentoRoute from './routes/agendamentoRoute.js';
import dashboardRoutes from './routes/dashboardRoute.js';
import clientPhotoRoutes from './routes/clientPhotoRoute.js';
import medidasRoutes from './routes/medidasRoute.js';
import anamneseRoutes from './routes/anamneseRoute.js'; 

const app = express();
const port = process.env.PORT || 4000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname;
const uploadsDirRoot = path.join(projectRoot, 'uploads');
const uploadsProductsDir = path.join(uploadsDirRoot, 'products');
const uploadsClientsDir = path.join(uploadsDirRoot, 'clients');
const uploadsBeforeAfterDir = path.join(uploadsClientsDir, 'before_after');

if (!fs.existsSync(uploadsDirRoot)) fs.mkdirSync(uploadsDirRoot, { recursive: true });
if (!fs.existsSync(uploadsProductsDir)) fs.mkdirSync(uploadsProductsDir, { recursive: true });
if (!fs.existsSync(uploadsClientsDir)) fs.mkdirSync(uploadsClientsDir, { recursive: true });
if (!fs.existsSync(uploadsBeforeAfterDir)) fs.mkdirSync(uploadsBeforeAfterDir, { recursive: true });
console.log(`Diretórios de upload verificados/criados em: ${uploadsDirRoot}`);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.originalUrl}`);
    next();
});
app.use(express.static(path.join(projectRoot, 'public')));
app.use('/uploads', express.static(uploadsDirRoot)); 
console.log(`Servindo estáticos de: ${path.join(projectRoot, 'public')}`);
console.log(`Servindo uploads de: ${uploadsDirRoot} via /uploads`);
const isAuthenticated = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        if (req.originalUrl.startsWith('/api/')) {
            console.warn(`[Auth] Acesso não autorizado à API ${req.originalUrl} (sem token).`);
            return res.status(401).json({ success: false, message: 'Não autorizado. Faça login.' });
        }
        console.warn(`[Auth] Acesso não autorizado a ${req.originalUrl}. Redirecionando para /login.html`);
        return res.redirect('/login.html');
    }

    try {
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

        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded; // Adiciona os dados do usuário (ex: id, email) ao request
        console.log(`[Auth] Usuário ${req.user.id} autenticado via JWT. Permitindo acesso a ${req.originalUrl}`);
        next();
    } catch (error) {
        console.error('[Auth] Falha na verificação do JWT:', error.message);
        res.clearCookie('token');
        return res.status(403).json({ success: false, message: 'Token inválido ou expirado.' });
    }
};
app.use(userRoutes);
console.log("Rotas públicas (usuário) configuradas.");
console.log("Configurando rotas protegidas da API...");
app.use('/api', isAuthenticated, productRoutes);
app.use('/api', isAuthenticated, categoryRoute);
app.use('/api', isAuthenticated, clientRoutes);
app.use('/api', isAuthenticated, transactionRoute);
app.use('/api', isAuthenticated, agendamentoRoute);
app.use('/api', isAuthenticated, dashboardRoutes);
app.use('/api', isAuthenticated, clientPhotoRoutes);
app.use('/api', isAuthenticated, medidasRoutes);
app.use('/api', isAuthenticated, anamneseRoutes); 

app.get('/relatorios/export', isAuthenticated, async (req, res, next) => {
    console.log("[Server] Rota /relatorios/export acionada.");
    try {
        const records = await TransactionModel.findAll(); 
        console.log(`[Server] Exportando ${records.length} registros de transações.`);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Transações');

        if (records.length > 0) {
            worksheet.columns = Object.keys(records[0]).map(key => ({
                header: key.charAt(0).toUpperCase() + key.slice(1),
                key: key,
                width: key.length < 15 ? 15 : key.length + 5
            }));

            records.forEach(record => {
                const recordToSave = { ...record }; 
                if (recordToSave.data) {
                    try {
                        const dateObj = new Date(recordToSave.data);
                        if (!isNaN(dateObj.getTime())) {
                           recordToSave.data = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
                        } else {
                            recordToSave.data = record.data; 
                        }
                    } catch (e) {
                        recordToSave.data = record.data; 
                        console.warn("Erro ao formatar data para Excel:", record.data, e);
                    }
                }
                Object.keys(recordToSave).forEach(key => {
                    if (key === 'valor' && typeof recordToSave[key] === 'string') {
                        const parsedValue = parseFloat(recordToSave[key].replace('.', '').replace(',', '.'));
                        if (!isNaN(parsedValue)) {
                            recordToSave[key] = parsedValue;
                        }
                    }
                });
                worksheet.addRow(recordToSave);
            });
            worksheet.getRow(1).font = { bold: true };
        } else {
            worksheet.columns = [{ header: 'Status', key: 'status', width: 30 }];
            worksheet.addRow({ status: 'Nenhum registro encontrado para exportar.' });
        }

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename="transacoes_clinica.xlsx"'
        );

        await workbook.xlsx.write(res);
        res.end();
        console.log("[Server] Exportação Excel enviada.");

    } catch (error) {
        console.error("[Server] Erro ao gerar exportação Excel:", error);
        next(error);
    }
});

app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api/')) {
        console.warn(`[Server] Rota API não encontrada: ${req.method} ${req.originalUrl}`);
        return res.status(404).json({ success: false, message: 'Endpoint API não encontrado.' });
    }
    if (req.originalUrl.includes('.') && !req.originalUrl.endsWith('.html')) {
        console.log(`[Server] Ignorando provável arquivo estático não encontrado: ${req.originalUrl}`);
        return next();
    }
    console.log(`[Server] Rota não encontrada, servindo SPA fallback: ${req.originalUrl} -> index.html`);
    res.sendFile(path.join(projectRoot, 'public', 'index.html'));
});
app.use((err, req, res, next) => {
    console.error('[ERRO INESPERADO]:', err.stack || err);
    if (!res.headersSent) {
        res.status(err.status || 500).json({
            success: false,
            message: err.message || 'Ocorreu um erro interno no servidor.'
        });
    }
});

const startServer = async () => {
    try {
        await connectDatabase();
        console.log('✅ Banco de dados conectado com sucesso.');

        await UserModel.seedDefaultProfessionals();
        console.log('✅ Profissionais padrão verificados/criados.');

        app.listen(port, () => {
            console.log(`🚀 Servidor rodando em http://localhost:${port}`);
            console.log("===========================================");
        });
    } catch (err) {
        console.error('❌ Falha crítica ao iniciar o servidor:', err);
        process.exit(1);
    }
};

startServer();