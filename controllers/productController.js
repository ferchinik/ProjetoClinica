// clinica/controllers/productController.js
import ProductModel from '../models/productModel.js';
import CategoryModel from '../models/categoryModel.js'; // Certifique-se que está importado
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/products/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        // Alterado para enviar erro via cb, o que o multer pode tratar
        cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

export default class ProductController {

    static uploadMiddleware() {
        return upload.single('photo'); // 'photo' deve ser o nome do campo no FormData
    }

    static async create(req, res) {
        console.log("Controller [Product Create]: Recebido body:", req.body);
        console.log("Controller [Product Create]: Recebido file:", req.file);

        const cleanupFileOnError = () => {
             if (req.file && fs.existsSync(req.file.path)) {
                try {
                    fs.unlinkSync(req.file.path);
                    console.log(`Controller [Product Create]: Arquivo ${req.file.path} removido devido a erro.`);
                } catch (unlinkErr) {
                    console.error("Controller Error [Product Create]: Falha ao tentar remover arquivo órfão:", unlinkErr);
                }
            }
        };

        try {
            const { title, price, stock, category, novaCategoria } = req.body;

            if (!req.file) {
                return res.status(400).json({ success: false, message: 'É necessário enviar uma imagem para o produto.' });
            }

            // Normalizar o caminho da foto para garantir consistência
            let fotoPath = req.file.path.replace(/\\/g, '/');
            
            // Extrair apenas o nome do arquivo da imagem
            const fileName = fotoPath.split('/').pop();
            
            // Armazenar apenas o nome do arquivo, sem o caminho completo
            // O frontend vai construir o caminho completo baseado neste nome
            fotoPath = fileName;
            
            console.log(`[ProductController] Caminho da foto normalizado: ${fotoPath}`);
            console.log(`[ProductController] Arquivo original: ${req.file.path}`);
            console.log(`[ProductController] Nome do arquivo extraído: ${fileName}`);

            if (!title || !price || stock === undefined || stock === null || !category) {
                cleanupFileOnError();
                return res.status(400).json({ success: false, message: 'Título, preço, estoque e seleção de categoria são obrigatórios.' });
            }
            if (category === 'nueva' && (!novaCategoria || novaCategoria.trim() === '')) {
                cleanupFileOnError();
                return res.status(400).json({ success: false, message: 'O nome da nova categoria é obrigatório ao selecionar "Crear nueva categoría".' });
            }

            const finalPrice = parseFloat(price);
            const finalStock = parseInt(stock, 10);

            if (isNaN(finalPrice) || finalPrice <= 0) {
                cleanupFileOnError();
                return res.status(400).json({ success: false, message: 'Preço inválido. Deve ser um número maior que zero.' });
            }
            if (isNaN(finalStock) || finalStock < 0) {
                cleanupFileOnError();
                return res.status(400).json({ success: false, message: 'Estoque inválido. Deve ser um número igual ou maior que zero.' });
            }

            // --- MODIFICAÇÃO CENTRAL: Obter/Criar categoria_id a partir do nome ---
            let categoria_id_final;
            const nomeDaCategoriaParaUsar = (category === 'nueva' ? novaCategoria.trim() : category.trim());

            if (!nomeDaCategoriaParaUsar) {
                cleanupFileOnError();
                return res.status(400).json({ success: false, message: 'Nome da categoria é inválido.' });
            }
            
            try {
                // CategoryModel.createCategory lida com "encontrar ou criar por nome" e retorna o ID.
                categoria_id_final = await CategoryModel.createCategory(nomeDaCategoriaParaUsar);
                console.log(`Controller [Product Create]: Categoria "${nomeDaCategoriaParaUsar}" processada para ID: ${categoria_id_final}`);
            } catch (categoryError) {
                cleanupFileOnError();
                console.error(`Controller [Product Create]: Erro ao processar categoria "${nomeDaCategoriaParaUsar}":`, categoryError);
                return res.status(500).json({ success: false, message: categoryError.message || 'Erro ao processar categoria do produto.' });
            }
            // --- FIM DA MODIFICAÇÃO CENTRAL ---

            const productData = {
                titulo: title.trim(),
                preco: finalPrice,
                estoque: finalStock,
                foto: fotoPath,
                categoria_id: categoria_id_final // Usa o ID da categoria obtido/criado
            };

            console.log("Controller [Product Create]: Dados prontos para o ProductModel:", productData);
            const newProductId = await ProductModel.createProduct(productData);

            return res.status(201).json({
                success: true,
                message: 'Producto guardado con éxito!',
                productId: newProductId
             });

        } catch (error) {
            console.error("Controller Error [Product Create]: Erro detalhado:", error);
            cleanupFileOnError();
            let userMessage = 'Erro interno ao processar o cadastro do produto.';
            let statusCode = 500;

            if (error.message.includes('obrigatórios') || error.message.includes('inválid') || error.message.includes('ID da categoria selecionada inválido')) {
                userMessage = error.message;
                statusCode = 400;
            } else if (error.code === 'ER_DUP_ENTRY') {
                 userMessage = 'Já existe um produto com características semelhantes.';
                 statusCode = 409;
            } else if (error.code === 'ER_NO_REFERENCED_ROW_2') { // Erro de FK, pode ser categoria_id
                userMessage = 'A categoria fornecida resultou em um ID inválido ou não existente.';
                statusCode = 400;
            }
            return res.status(statusCode).json({ success: false, message: userMessage });
        }
    }

    static async update(req, res) {
        console.log("Controller [Product Update]: Recebido body:", req.body);
        console.log("Controller [Product Update]: Recebido file:", req.file);
        console.log("Controller [Product Update]: Recebido params:", req.params);

        const { id } = req.params;
        const numericId = parseInt(id);

        const cleanupFileOnError = () => {
             if (req.file && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); console.log(`Controller [Product Update]: Arquivo temporário ${req.file.path} removido.`); }
                catch (unlinkErr) { console.error("Controller Error [Product Update]: Falha ao remover arquivo temporário:", unlinkErr); }
            }
        };

        if (isNaN(numericId) || numericId <= 0) {
            cleanupFileOnError();
            return res.status(400).json({ success: false, message: 'ID do produto inválido.' });
        }

        try {
            const { title, price, stock, category, novaCategoria } = req.body;

            if (!title || !price || stock === undefined || stock === null || !category) {
                 cleanupFileOnError();
                 return res.status(400).json({ success: false, message: 'Título, preço, estoque e seleção de categoria são obrigatórios para atualizar.' });
            }
            if (category === 'nueva' && (!novaCategoria || novaCategoria.trim() === '')) {
                cleanupFileOnError();
                return res.status(400).json({ success: false, message: 'O nome da nova categoria é obrigatório ao selecionar "Crear nueva categoría".' });
            }

            const finalPrice = parseFloat(price);
            const finalStock = parseInt(stock, 10);

            if (isNaN(finalPrice) || finalPrice <= 0) { cleanupFileOnError(); return res.status(400).json({ success: false, message: 'Preço inválido.' }); }
            if (isNaN(finalStock) || finalStock < 0) { cleanupFileOnError(); return res.status(400).json({ success: false, message: 'Estoque inválido.' }); }
            
            const productDataToUpdate = {
                titulo: title.trim(),
                preco: finalPrice,
                estoque: finalStock,
            };

            // --- MODIFICAÇÃO CENTRAL PARA UPDATE: Obter/Criar categoria_id a partir do nome/ID ---
            let categoria_id_final_update;
            const nomeOuIdCategoria = (category === 'nueva' ? novaCategoria.trim() : category.trim());

            if (!nomeOuIdCategoria) {
                 cleanupFileOnError();
                return res.status(400).json({ success: false, message: 'Nome ou ID da categoria é inválido.' });
            }

            // Verifica se 'category' é um ID numérico (vindo de um select já populado com IDs)
            // ou um nome (vindo de um select com nomes fixos, ou "nueva")
            const  possibleId = parseInt(nomeOuIdCategoria);
            if (!isNaN(possibleId) && String(possibleId) === nomeOuIdCategoria) { // É um ID numérico
                // Aqui, podemos assumir que o ID é válido se veio do formulário de edição
                // que foi populado com IDs existentes. Ou podemos verificar no DB se o ID existe.
                // Para simplificar, vamos assumir que se é um número, é um ID válido.
                // Se você quiser verificar, precisaria de uma CategoryModel.findById(possibleId).
                categoria_id_final_update = possibleId;
                console.log(`Controller [Product Update]: Categoria ID "${possibleId}" usada diretamente.`);
            } else { // É um nome de categoria ou "nueva" foi selecionado (e novaCategoria tem o nome)
                 try {
                    categoria_id_final_update = await CategoryModel.createCategory(nomeOuIdCategoria);
                    console.log(`Controller [Product Update]: Categoria nome "${nomeOuIdCategoria}" processada para ID: ${categoria_id_final_update}`);
                } catch (categoryError) {
                    cleanupFileOnError();
                    console.error(`Controller [Product Update]: Erro ao processar categoria "${nomeOuIdCategoria}":`, categoryError);
                    return res.status(500).json({ success: false, message: categoryError.message || 'Erro ao processar categoria do produto.' });
                }
            }
            productDataToUpdate.categoria_id = categoria_id_final_update;
            // --- FIM DA MODIFICAÇÃO CENTRAL PARA UPDATE ---

            let oldFotoPath = null;
            // Verificar se uma nova imagem foi enviada
            if (req.file) {
                // Normalizar o caminho da foto para garantir consistência
                let newFotoPath = req.file.path.replace(/\\/g, '/');
                
                // Extrair apenas o nome do arquivo da imagem
                const fileName = newFotoPath.split('/').pop();
                
                // Armazenar apenas o nome do arquivo, sem o caminho completo
                // O frontend vai construir o caminho completo baseado neste nome
                productDataToUpdate.foto = fileName;
                
                console.log(`[ProductController Update] Caminho da foto normalizado: ${productDataToUpdate.foto}`);
                console.log(`[ProductController Update] Arquivo original: ${req.file.path}`);
                console.log(`[ProductController Update] Nome do arquivo extraído: ${fileName}`);
            }
                
            // Obter o produto atual para verificar se há uma foto anterior
            const currentProduct = await ProductModel.getProductById(numericId);
            if (currentProduct && currentProduct.foto) {
                oldFotoPath = currentProduct.foto;
            }
            
            console.log("Controller [Product Update]: Dados para o ProductModel.updateProduct:", productDataToUpdate);
            const updated = await ProductModel.updateProduct(numericId, productDataToUpdate);

            if (updated) {
                // Se houver uma foto antiga e uma nova foto foi enviada, excluir a foto antiga
                if (oldFotoPath && productDataToUpdate.foto && oldFotoPath !== productDataToUpdate.foto) {
                    try {
                        const fullOldPath = path.join(process.cwd(), oldFotoPath); 
                        if (fs.existsSync(fullOldPath)) {
                            fs.unlinkSync(fullOldPath);
                            console.log(`Controller [Product Update]: Foto antiga ${fullOldPath} deletada.`);
                        } else {
                            console.warn(`Controller [Product Update]: Foto antiga ${fullOldPath} não encontrada para deletar.`);
                        }
                    } catch (unlinkError) {
                        console.error('Controller Error [Product Update]: Erro ao deletar foto antiga:', unlinkError);
                    }
                }
                const updatedProduct = await ProductModel.getProductById(numericId);
                return res.status(200).json({
                    success: true,
                    message: 'Produto atualizado com sucesso',
                    product: updatedProduct
                });
            } else {
                cleanupFileOnError();
                return res.status(404).json({ success: false, message: 'Produto não encontrado para atualizar.' });
            }
        } catch (error) {
            console.error(`[Controller Error - Product Update ID ${id}] Erro detalhado:`, error);
            cleanupFileOnError();

            let userMessage = 'Erro interno ao atualizar produto.';
            let statusCode = 500;
            if (error.message.includes('inválido') || error.message.includes('obrigatórios')) {
                userMessage = error.message;
                statusCode = 400;
            } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                userMessage = 'A categoria selecionada não existe ou é inválida.';
                statusCode = 400;
            }
            return res.status(statusCode).json({ success: false, message: userMessage });
        }
    }

    // Manter as funções list, delete, getById como estavam no seu productController.js original
    static async list(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 12;
            const search = req.query.search || null;
            const categoryFilter = req.query.category || null;
            const statusFilter = req.query.status || null;

            const result = await ProductModel.listProducts(
                categoryFilter,
                statusFilter,
                search,
                page,
                limit
            );

            res.json(result);
        } catch (error) {
            console.error('[ProductController Error] Erro ao listar produtos:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao listar produtos'
            });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;

            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    message: 'ID do produto inválido ou não fornecido'
                });
            }

            const deleted = await ProductModel.deleteProduct(parseInt(id));

            if (deleted) {
                return res.status(200).json({
                    success: true,
                    message: 'Produto excluído com sucesso'
                });
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'Produto não encontrado para excluir'
                });
            }
        } catch (error) {
            console.error('[ProductController Error] Erro ao deletar produto:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Erro ao deletar produto'
            });
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;

            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    message: 'ID do produto inválido ou não fornecido'
                });
            }

            const product = await ProductModel.getProductById(parseInt(id));

            if (product) {
                return res.status(200).json(product);
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'Produto não encontrado'
                });
            }
        } catch (error) {
            console.error('[ProductController Error] Erro ao buscar produto:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Erro ao buscar produto'
            });
        }
    }
}