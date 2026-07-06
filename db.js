import mysql from 'mysql2/promise';

try {
  process.loadEnvFile();
} catch {
  // No hay .env (por ejemplo en producción, donde el hosting ya define las variables)
}

const rawPool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'hospital',
  port:     parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
});

// Convierte placeholders de Postgres ($1, $2, ...) a los de MySQL (?).
// En este proyecto los parámetros siempre aparecen en orden creciente y
// coinciden posicionalmente con el arreglo de params, así que basta una
// sustitución simple.
function toMysqlSql(text) {
  return text.replace(/\$\d+/g, '?');
}

// Emula `RETURNING` de Postgres (no soportado por MySQL) haciendo un SELECT
// de vuelta tras el INSERT/UPDATE/DELETE, para que las rutas de index.js
// (escritas pensando en pg) no necesiten reescribirse una por una.
async function query(text, params = []) {
  const verbMatch = text.match(/^\s*(INSERT|UPDATE|DELETE)\b/i);
  const returningMatch = text.match(/\bRETURNING\s+([\s\S]+)$/i);

  if (!verbMatch || !returningMatch) {
    const [rows] = await rawPool.query(toMysqlSql(text), params);
    if (verbMatch) {
      return { rows: [], rowCount: rows.affectedRows ?? 0 };
    }
    return { rows, rowCount: Array.isArray(rows) ? rows.length : 0 };
  }

  const verb = verbMatch[1].toUpperCase();
  const baseText = text.slice(0, returningMatch.index);
  const columns = returningMatch[1].trim();
  const sql = toMysqlSql(baseText);
  const [result] = await rawPool.query(sql, params);

  if (verb === 'INSERT') {
    const table = baseText.match(/INSERT\s+INTO\s+(\w+)/i)[1];
    const [rows] = await rawPool.query(
      `SELECT ${columns} FROM ${table} WHERE id = ?`,
      [result.insertId]
    );
    return { rows, rowCount: rows.length };
  }

  // UPDATE / DELETE: en este proyecto siempre filtran por "WHERE id = $n"
  const table = baseText.match(/(?:UPDATE|FROM)\s+(\w+)/i)[1];
  const idParamMatch = baseText.match(/WHERE\s+id\s*=\s*\$(\d+)/i);
  const idValue = idParamMatch ? params[Number(idParamMatch[1]) - 1] : null;

  if (result.affectedRows === 0) {
    return { rows: [], rowCount: 0 };
  }

  if (verb === 'DELETE') {
    return { rows: [{ id: idValue }], rowCount: result.affectedRows };
  }

  const [rows] = await rawPool.query(
    `SELECT ${columns} FROM ${table} WHERE id = ?`,
    [idValue]
  );
  return { rows, rowCount: rows.length };
}

export const pool = { query };

rawPool.getConnection()
  .then(conn => {
    console.log('✅ Conectado a MySQL - BD Hospital');
    conn.release();
  })
  .catch(err => console.error('❌ Error de conexión:', err.message));


  