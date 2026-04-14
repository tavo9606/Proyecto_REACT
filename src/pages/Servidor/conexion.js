import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  host:     'localhost',
  user:     'postgres',
  password: '12345',
  database: 'Hospital',
  port:     5432
});

pool.connect()
  .then(() => console.log('✅ Conectado a PostgreSQL - BD Hospital'))
  .catch(err => console.error('❌ Error de conexión:', err.message));