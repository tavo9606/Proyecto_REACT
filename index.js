import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const app = express();
const PORT = 3000;
const JWT_SECRET = 'hospital_vida_sana_2024';

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

async function crearTablas() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        usuario VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        rol VARCHAR(50) NOT NULL,
        nombres VARCHAR(200),
        cedula VARCHAR(50),
        email VARCHAR(150),
        fecha_nacimiento DATE,
        creado_en TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pacientes (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(200) NOT NULL,
        documento VARCHAR(50) UNIQUE NOT NULL,
        edad INT,
        sexo VARCHAR(20),
        telefono VARCHAR(30),
        direccion VARCHAR(300),
        creado_en TIMESTAMP DEFAULT NOW()
      );
    `);
    const existe = await pool.query("SELECT id FROM usuarios WHERE usuario = 'admin'");
    if (existe.rows.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await pool.query(
        "INSERT INTO usuarios (usuario, password, rol, nombres) VALUES ($1,$2,$3,$4)",
        ['admin', hash, 'administrador', 'Administrador']
      );
      console.log('👤 Usuario: admin | Contraseña: admin123');
    }
    console.log('📋 Tablas listas');
  } catch (err) {
    console.error('❌ Error creando tablas:', err.message);
  }
}

crearTablas();

app.post('/login', async (req, res) => {
  const { usuario, password, rol } = req.body;
  if (!usuario || !password || !rol)
    return res.status(400).json({ error: 'Faltan campos' });
  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE usuario = $1 AND rol = $2',
      [usuario, rol]
    );
    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Usuario o rol incorrectos' });
    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta' });
    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, rol: user.rol },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ mensaje: `Bienvenido, ${user.nombres || user.usuario}`, token, rol: user.rol, usuario: user.usuario });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/registro', async (req, res) => {
  const { usuario, password, rol, nombres, cedula, email, fecha_nacimiento } = req.body;
  if (!usuario || !password || !rol)
    return res.status(400).json({ error: 'Faltan campos' });
  try {
    const existe = await pool.query('SELECT id FROM usuarios WHERE usuario = $1', [usuario]);
    if (existe.rows.length > 0)
      return res.status(400).json({ error: 'El usuario ya existe' });
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO usuarios (usuario, password, rol, nombres, cedula, email, fecha_nacimiento) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [usuario, hash, rol, nombres, cedula, email, fecha_nacimiento || null]
    );
    res.status(201).json({ mensaje: 'Usuario registrado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar' });
  }
});

app.get('/pacientes', async (req, res) => {
  try {
    const { search } = req.query;
    const result = search
      ? await pool.query(
          'SELECT * FROM pacientes WHERE nombre ILIKE $1 OR documento ILIKE $1 ORDER BY id DESC',
          [`%${search}%`]
        )
      : await pool.query('SELECT * FROM pacientes ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pacientes' });
  }
});

app.post('/pacientes', async (req, res) => {
  const { nombre, documento, edad, sexo, telefono, direccion } = req.body;
  if (!nombre || !documento)
    return res.status(400).json({ error: 'Nombre y documento obligatorios' });
  try {
    const result = await pool.query(
      'INSERT INTO pacientes (nombre, documento, edad, sexo, telefono, direccion) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [nombre, documento, edad || null, sexo, telefono, direccion]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505')
      return res.status(400).json({ error: 'Documento ya existe' });
    res.status(500).json({ error: 'Error al crear paciente' });
  }
});

app.delete('/pacientes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM pacientes WHERE id = $1', [req.params.id]);
    res.json({ mensaje: 'Paciente eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});