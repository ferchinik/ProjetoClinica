// clinica/controllers/clientPhotoController.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ClientPhotoModel from '../models/clientPhotoModel.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const uploadsDirRoot = path.join(projectRoot, 'uploads');
const uploadDir = path.join(uploadsDirRoot, 'clients', 'before_after');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Diretório de upload criado: ${uploadDir}`);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const clienteId = req.params.cliente_id || req.body.clienteId || 'unknownId';
        const fieldName = file.fieldname;
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `cliente_${clienteId}-${fieldName}-${uniqueSuffix}${extension}`);
    }
});

// MODIFICADO: fileFilter para aceitar imagens e vídeos
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Apenas arquivos de imagem ou vídeo são permitidos!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // Aumentado para 50MB para vídeos
});

export default class ClientPhotoController {

    static uploadMiddleware() {
        return upload.fields([
            { name: 'foto_antes', maxCount: 1 },
            { name: 'foto_depois', maxCount: 1 }
        ]);
    }

    static async create(req, res) {
        const clienteId = req.params.cliente_id;
        console.log(`[Controller-Photo] Recebido POST /api/clientes/${clienteId}/fotos`);
        console.log('[Controller-Photo] Body:', req.body);
        console.log('[Controller-Photo] Files:', req.files);

        const cleanupFilesOnError = () => {
            if (req.files) {
                const tryUnlink = (field) => {
                    if (req.files[field] && req.files[field][0]) {
                        fs.unlink(req.files[field][0].path, (err) => {
                            if (err) console.error(`Erro ao limpar ${field}:`, err);
                            else console.log(`Arquivo ${field} removido devido a erro.`);
                        });
                    }
                };
                tryUnlink('foto_antes');
                tryUnlink('foto_depois');
            }
        };

        if (!clienteId || isNaN(parseInt(clienteId))) {
            cleanupFilesOnError();
            return res.status(400).json({ success: false, message: 'ID do cliente inválido na URL.' });
        }
        if (!req.files || !req.files.foto_antes || !req.files.foto_depois) {
            console.error("[Controller-Photo] Erro: Arquivos 'foto_antes' ou 'foto_depois' não encontrados em req.files.");
            return res.status(400).json({ success: false, message: 'Falha no upload. Ambas as mídias (Antes e Depois) são obrigatórias.' });
        }

        try {
            const fotoAntesFile = req.files.foto_antes[0];
            const fotoDepoisFile = req.files.foto_depois[0];
            const descricao = req.body.descricao || null;

            const fotoAntesPathRel = path.relative(uploadsDirRoot, fotoAntesFile.path).replace(/\\/g, '/');
            const fotoDepoisPathRel = path.relative(uploadsDirRoot, fotoDepoisFile.path).replace(/\\/g, '/');

            // MODIFICADO: Determinar o media_type com base no mimetype
            const getMediaType = (file) => {
                if (file.mimetype.startsWith('image/')) return 'image';
                if (file.mimetype.startsWith('video/')) return 'video';
                return 'unknown'; // Ou lançar um erro se for desconhecido e não permitido
            };

            const mediaTypeAntes = getMediaType(fotoAntesFile);
            const mediaTypeDepois = getMediaType(fotoDepoisFile);

            if (mediaTypeAntes === 'unknown' || mediaTypeDepois === 'unknown') {
                cleanupFilesOnError();
                return res.status(400).json({ success: false, message: 'Tipo de arquivo não suportado para "Antes" ou "Depois".' });
            }

            const dataToSave = {
                cliente_id: parseInt(clienteId),
                foto_antes_path: fotoAntesPathRel,
                foto_depois_path: fotoDepoisPathRel,
                media_type_antes: mediaTypeAntes, // Salvar o tipo de mídia
                media_type_depois: mediaTypeDepois, // Salvar o tipo de mídia
                descricao: descricao
            };

            console.log("[Controller-Photo] Dados prontos para salvar no Model:", dataToSave);
            const newPhotoId = await ClientPhotoModel.create(dataToSave);

            res.status(201).json({
                success: true,
                message: 'Mídias Antes/Depois salvas com sucesso!',
                photoId: newPhotoId,
                paths: {
                    antes: `/uploads/${fotoAntesPathRel}`,
                    depois: `/uploads/${fotoDepoisPathRel}`
                 },
                // MODIFICADO: Retornar media_types
                media_types: {
                    antes: mediaTypeAntes,
                    depois: mediaTypeDepois
                }
            });

        } catch (error) {
            console.error("[Controller-Photo] Erro ao criar registro de mídias:", error);
            cleanupFilesOnError();
            let statusCode = 500;
            if (error.message.includes('obrigatórios') || error.message.includes('inválido') || error.message.includes('não encontrado') || error.message.includes('não suportado')) {
                 statusCode = 400;
             }
            res.status(statusCode).json({ success: false, message: error.message || 'Erro interno ao salvar informações das mídias.' });
        }
    }

    static async listByClient(req, res) {
        const clienteId = req.params.cliente_id;
         if (!clienteId || isNaN(parseInt(clienteId))) {
            return res.status(400).json({ success: false, message: 'ID do cliente inválido.' });
        }
        console.log(`[Controller-Photo] Recebido GET /api/clientes/${clienteId}/fotos`);

        try {
            const photos = await ClientPhotoModel.findByClientId(parseInt(clienteId));
            // MODIFICADO: Mapeamento para incluir URLs completas e media_types
            const photosWithFullPath = photos.map(p => ({
                ...p,
                foto_antes_url: p.foto_antes_path ? `/uploads/${p.foto_antes_path}` : null,
                foto_depois_url: p.foto_depois_path ? `/uploads/${p.foto_depois_path}` : null,
                // media_type_antes e media_type_depois já vêm do model
            }));
            res.status(200).json({ success: true, photos: photosWithFullPath });
        } catch (error) {
            console.error(`[Controller-Photo] Erro ao listar mídias para cliente ${clienteId}:`, error);
            res.status(500).json({ success: false, message: error.message || 'Erro interno ao buscar mídias.' });
        }
    }

    static async delete(req, res) {
        const photoId = req.params.id;
        if (!photoId || isNaN(parseInt(photoId))) {
            return res.status(400).json({ success: false, message: 'ID da mídia inválido.' });
        }
        console.log(`[Controller-Photo] Recebido DELETE /api/fotos/${photoId}`);

        try {
            const deleted = await ClientPhotoModel.delete(parseInt(photoId));
            if (deleted) {
                res.status(200).json({ success: true, message: 'Par de mídias excluído com sucesso!' });
            } else {
                res.status(404).json({ success: false, message: 'Registro de mídias não encontrado.' });
            }
        } catch (error) {
             console.error(`[Controller-Photo] Erro ao excluir mídia ID ${photoId}:`, error);
             res.status(500).json({ success: false, message: error.message || 'Erro interno ao excluir mídia.' });
        }
    }
}