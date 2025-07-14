import ClientModel from '../models/clientModel.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const clientUploadDir = 'uploads/clients/';
if (!fs.existsSync(clientUploadDir)) {
    fs.mkdirSync(clientUploadDir, { recursive: true });
}
const clientStorage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, clientUploadDir); },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, 'client-' + uniqueSuffix + extension);
    }
});
const clientFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) { cb(null, true); }
    else { cb(new Error('Apenas arquivos de imagem são permitidos!'), false); }
};
const uploadClientPhoto = multer({
    storage: clientStorage,
    fileFilter: clientFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

export default class ClientController {

    static uploadMiddleware() {
        return uploadClientPhoto.single('photo');
    }

    static async create(req, res) {
        console.log("Controller: Recebido POST /api/clientes - body:", req.body, "file:", req.file?.filename);
        try {
            const clientData = { ...req.body };
            if (req.file) {
                clientData.foto_perfil = req.file.path.replace(/\\/g, '/');
                console.log("Controller: Caminho da foto salvo:", clientData.foto_perfil);
            } else {
                clientData.foto_perfil = null;
            }

            if (!clientData.nome_completo || !clientData.email || !clientData.telefone) {
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                    console.log(`Controller: Arquivo ${req.file.path} removido por dados inválidos (campos obrigatórios).`);
                }
                return res.status(400).json({ success: false, message: 'Nome completo, email e telefone são obrigatórios.' });
            }

            const newClientId = await ClientModel.createClient(clientData);

            res.status(201).json({ success: true, message: 'Cliente criado com sucesso!', clientId: newClientId });

        } catch (error) {
            console.error(`Erro no Controller [create client] ao processar dados para "${req.body?.nome_completo || 'N/A'}":`, error);

            if (req.file && fs.existsSync(req.file.path)) {
                try {
                    fs.unlinkSync(req.file.path);
                    console.log(`Controller: Arquivo ${req.file.path} removido devido a erro: ${error.message}`);
                }
                catch (unlinkErr) {
                    console.error("Controller Error: Falha ao remover arquivo órfão:", unlinkErr);
                }
            }

            let statusCode = 500;
            let message = 'Erro interno ao criar cliente. Tente novamente mais tarde.';

            if (error.message.includes('obrigatórios')) {
                statusCode = 400;
                message = error.message;
            } else if (error.message.includes('cadastrado')) {
                statusCode = 409;
                message = error.message;
            } else if (error.message) {
                 message = error.message;
            }

            res.status(statusCode).json({ success: false, message: message });
        }
    }

    static async list(req, res) {
        try {
            const searchTerm = req.query.search || null;
            let page = parseInt(req.query.page, 10) || 1;
            let limit = parseInt(req.query.limit, 10) || 10;
            if (limit > 50) limit = 50;

            console.log(`Controller: Buscando clientes - Termo: "${searchTerm}", Page: ${page}, Limit: ${limit}`);
            const result = await ClientModel.listClients(searchTerm, page, limit);
            res.status(200).json(result);
        } catch (error) {
            console.error("Erro no Controller [list clients]:", error);
            res.status(500).json({ success: false, message: error.message || 'Erro interno ao buscar clientes.' });
        }
    }

    static async getById(req, res) {
        const clientId = req.params.id;
        console.log(`[Controller] Recebido GET /api/clientes/${clientId}`);
        try {
            const idNum = parseInt(clientId);
            if (isNaN(idNum) || idNum <= 0) {
                return res.status(400).json({ success: false, message: 'ID de cliente inválido.' });
            }

            const clientData = await ClientModel.getFullClientDetailsById(idNum);

            if (clientData) {
                res.status(200).json({ success: true, client: clientData });
            } else {
                res.status(404).json({ success: false, message: 'Cliente não encontrado.' });
            }
        } catch (error) {
            console.error(`Erro no Controller [getById ${clientId}]:`, error);
            res.status(500).json({ success: false, message: error.message || 'Erro interno ao buscar detalhes do cliente.' });
        }
    }

    static async update(req, res) {
        const clientId = req.params.id;
        console.log(`[Controller] Recebido PUT /api/clientes/${clientId}`);
        
        try {
            const idNum = parseInt(clientId);
            if (isNaN(idNum) || idNum <= 0) {
                return res.status(400).json({ success: false, message: 'ID de cliente inválido.' });
            }

            const clientData = { ...req.body };
            
            if (req.file) {
                clientData.foto_perfil = req.file.path.replace(/\\/g, '/');
                
                const currentClient = await ClientModel.getFullClientDetailsById(idNum);
                if (currentClient && currentClient.foto_perfil) {
                    try {
                        fs.unlinkSync(currentClient.foto_perfil);
                        console.log(`[Controller] Foto antiga removida: ${currentClient.foto_perfil}`);
                    } catch (unlinkError) {
                        console.error(`[Controller] Erro ao remover foto antiga: ${unlinkError.message}`);
                    }
                }
            }

            if (!clientData.nome_completo || !clientData.email || !clientData.telefone) {
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({ 
                    success: false, 
                    message: 'Nome completo, email e telefone são obrigatórios.' 
                });
            }

            const updated = await ClientModel.updateClient(idNum, clientData);
            
            if (updated) {
                res.status(200).json({ 
                    success: true, 
                    message: 'Cliente atualizado com sucesso!',
                    clientId: idNum
                });
            } else {
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                res.status(404).json({ 
                    success: false, 
                    message: 'Cliente não encontrado.' 
                });
            }
        } catch (error) {
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            
            console.error(`[Controller] Erro ao atualizar cliente ${clientId}:`, error);
            
            let statusCode = 500;
            let message = 'Erro interno ao atualizar cliente.';
            
            if (error.message.includes('obrigatórios')) {
                statusCode = 400;
                message = error.message;
            } else if (error.message.includes('cadastrado')) {
                statusCode = 409;
                message = error.message;
            } else if (error.message) {
                message = error.message;
            }
            
            res.status(statusCode).json({ success: false, message });
        }
    }
}