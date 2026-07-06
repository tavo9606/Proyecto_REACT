import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '12345',
  database: process.env.DB_NAME     || 'Hospital',
  port:     parseInt(process.env.DB_PORT || '5432'),
});

pool.connect()
  .then(() => console.log('✅ Conectado a PostgreSQL - BD Hospital'))
  .catch(err => console.error('❌ Error de conexión:', err.message));
  