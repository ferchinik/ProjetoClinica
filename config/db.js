import mysql from 'mysql2';

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    database: 'clinica',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const connectDatabase = () => {
    return new Promise((resolve, reject) => {
        db.getConnection((err, connection) => {
            if (err) {
                console.error('Erro ao conectar no MySQL:', err);
                reject(err);
            } else {
                console.log('Conectado ao MySQL com sucesso!');
                resolve();
            }
        });
    });
};

export { db, connectDatabase };