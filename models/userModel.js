import { db } from '../config/db.js';
import bcrypt from 'bcryptjs';

export default class UserModel {
    static registerUser(userData) {
        return new Promise((resolve, reject) => {
            const { nombre, apellido, email, especialidad, licencia, password } = userData;
            if (!nombre || !apellido || !email || !especialidad || !licencia || !password) {
                return reject(new Error('Todos os campos são obrigatórios.'));
            }
            const checkQuery = 'SELECT id FROM registro WHERE email = ?';
            db.query(checkQuery, [email], (err, results) => {
                if (err) {
                    console.error("Erro DB ao verificar email:", err);
                    return reject(new Error('Erro ao verificar disponibilidade do email.'));
                }
                
                if (results.length > 0) {
                    return reject(new Error('Este email já está cadastrado.'));
                }
                const saltRounds = 10;
                bcrypt.hash(password, saltRounds, (err, hash) => {
                    if (err) {
                        console.error("Erro ao gerar hash:", err);
                        return reject(new Error('Erro interno ao processar senha.'));
                    }
                    
                    const insertQuery = `
                        INSERT INTO registro (nombre, apellido, email, especialidad, licencia, password)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `;
                    
                    db.query(insertQuery, [nombre, apellido, email, especialidad, licencia, hash], (err, result) => {
                        if (err) {
                            console.error("Erro DB ao registrar usuário:", err);
                            if (err.code === 'ER_DUP_ENTRY') {
                                return reject(new Error('Erro: Email ou outro campo único já existe.'));
                            }
                            return reject(new Error('Erro interno ao registrar usuário no banco de dados.'));
                        }
                        resolve('Usuário registrado com sucesso!');
                    });
                });
            });
        });
    }

    static loginUser(loginData) {
        return new Promise((resolve, reject) => {
            const { email, password } = loginData;

            if (!email || !password) {
                return reject(new Error('Preencha todos os campos'));
            }

            const query = 'SELECT id, nombre, apellido, email, password FROM registro WHERE email = ?'; // Busca o ID e nome
            db.query(query, [email], (err, results) => {
                if (err) {
                    console.error("Erro DB ao buscar usuário:", err);
                    return reject(new Error('Erro interno no servidor'));
                }

                if (results.length === 0) {
                    return reject(new Error('Email ou senha incorretos'));
                }

                const user = results[0];
                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if (err) {
                        console.error("Erro ao comparar senhas:", err);
                        return reject(new Error('Erro interno no servidor'));
                    }

                    if (isMatch) {
                        const { password, ...userData } = user;
                        resolve(userData);
                    } else {
                        reject(new Error('Email ou senha incorretos'));
                    }
                });
            });
        });
    }

    static listProfessionals() {
        return new Promise(async (resolve, reject) => {
            const query = 'SELECT id, nombre FROM registro ORDER BY nombre ASC';
            try {
                // Usando a conexão com promise para async/await
                const [results] = await db.promise().query(query);
                console.log(`[Model] listProfessionals encontrou ${results.length} registros.`);
                resolve(results); // Retorna o array de objetos { id: ..., nombre: ... }
            } catch (err) {
                console.error("Erro DB [listProfessionals]:", err);
                reject(new Error('Erro ao buscar profissionais no banco de dados.'));
            }
        });
    }
    static async seedDefaultProfessionals() {
        const defaultProfessionals = [
            {
                nombre: 'João Pedro',
                apellido: 'Silva',
                email: 'joao.pedro@clinica.com',
                especialidad: 'Clínico Geral',
                licencia: 'CRM12345',
                password: 'JoaoPedro@123'
            },
            {
                nombre: 'Maria Eduarda',
                apellido: 'Santos',
                email: 'maria.eduarda@clinica.com',
                especialidad: 'Dermatologia',
                licencia: 'CRM67890',
                password: 'MariaEduarda@123'
            }
        ];

        for (const professional of defaultProfessionals) {
            try {
                const [existing] = await db.promise().query('SELECT id FROM registro WHERE email = ?', [professional.email]);
                
                if (existing.length === 0) {
                    const saltRounds = 10;
                    const hash = await bcrypt.hash(professional.password, saltRounds);
                    
                    await db.promise().query(
                        'INSERT INTO registro (nombre, apellido, email, especialidad, licencia, password) VALUES (?, ?, ?, ?, ?, ?)',
                        [professional.nombre, professional.apellido, professional.email, professional.especialidad, professional.licencia, hash]
                    );
                    
                    console.log(`[Model] Profissional padrão ${professional.nombre} criado com sucesso.`);
                } else {
                    console.log(`[Model] Profissional ${professional.nombre} já existe.`);
                }
            } catch (error) {
                console.error(`[Model] Erro ao criar profissional ${professional.nombre}:`, error);
            }
        }
    }  
}