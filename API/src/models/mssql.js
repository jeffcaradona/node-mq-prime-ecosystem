import mssql from 'mssql';

const config = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_SERVER,
    database: process.env.MSSQL_DATABASE,
    options: {
        encrypt: true, // Use encryption
        trustServerCertificate: true, // Change to false if not using self-signed certificates
    },
};

async function connectToDatabase() {
    try {
        const pool = await sql.connect(config);
        console.log('Connected to MSSQL');
        return pool;
    } catch (err) {
        console.error('Database connection failed:', err);
        throw err;
    }
}

module.exports = {
    connectToDatabase,
    sql,
};