import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

function getPoolConfig() {
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (url) {
    return {
      uri: url,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    };
  }

  return {
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10),
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD !== undefined ? process.env.MYSQLPASSWORD : (process.env.DB_PASSWORD || ''),
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'bursalink_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  };
}

const pool = mysql.createPool(getPoolConfig());

export async function closePool() {
  await pool.end();
}

export default pool;
