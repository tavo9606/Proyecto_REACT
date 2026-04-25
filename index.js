// Importación de librerías necesarias para el funcionamiento de la API:
// - express: framework para crear el servidor y manejar rutas HTTP
// - cors: permite la comunicación entre el frontend (React/Vite) y el backend
// - bcryptjs: se utiliza para encriptar contraseñas y mejorar la seguridad
// - jsonwebtoken: permite generar y validar tokens JWT para autenticación
// - pool: conexión a la base de datos PostgreSQL
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const app = express();
const PORT = 3000;
const JWT_SECRET = 'hospital_vida_sana_2024';

// Middleware de configuración global:

// cors: permite que el frontend (por ejemplo React en http://localhost:5173)
// pueda hacer peticiones a esta API sin ser bloqueado por el navegador (política CORS)
app.use(cors({ origin: 'http://localhost:5173' }));
// express.json(): permite que el servidor pueda recibir y entender datos
// enviados en formato JSON en las peticiones (req.body)
app.use(express.json());

// ──────────────────────────────────────────────
// CREACIÓN DE TABLAS
// ──────────────────────────────────────────────
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS historias_clinicas (
        id SERIAL PRIMARY KEY,
        paciente_id INT REFERENCES pacientes(id) ON DELETE CASCADE,
        medico_id INT REFERENCES usuarios(id),
        motivo_consulta TEXT,
        diagnostico TEXT,
        tratamiento TEXT,
        observaciones TEXT,
        fecha TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tratamientos (
        id SERIAL PRIMARY KEY,
        paciente_id INT REFERENCES pacientes(id) ON DELETE CASCADE,
        medico_id INT REFERENCES usuarios(id),
        medicamento VARCHAR(200) NOT NULL,
        dosis VARCHAR(100),
        frecuencia VARCHAR(100),
        duracion VARCHAR(100),
        estado VARCHAR(50) DEFAULT 'activo',
        fecha_inicio DATE DEFAULT NOW(),
        fecha_fin DATE,
        notas TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS camas (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(20) UNIQUE NOT NULL,
        piso VARCHAR(50),
        tipo VARCHAR(100),
        estado VARCHAR(50) DEFAULT 'disponible'
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS hospitalizaciones (
        id SERIAL PRIMARY KEY,
        paciente_id INT REFERENCES pacientes(id) ON DELETE CASCADE,
        cama_id INT REFERENCES camas(id),
        medico_id INT REFERENCES usuarios(id),
        diagnostico TEXT,
        estado VARCHAR(50) DEFAULT 'activo',
        fecha_ingreso TIMESTAMP DEFAULT NOW(),
        fecha_alta TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS citas (
        id SERIAL PRIMARY KEY,
        paciente_id INT REFERENCES pacientes(id) ON DELETE CASCADE,
        medico_id INT REFERENCES usuarios(id),
        fecha DATE NOT NULL,
        hora TIME NOT NULL,
        motivo VARCHAR(300),
        estado VARCHAR(50) DEFAULT 'pendiente',
        creado_en TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS medicamentos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(200) NOT NULL,
        descripcion TEXT,
        stock INT DEFAULT 0,
        unidad VARCHAR(50),
        precio NUMERIC(10,2),
        creado_en TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS facturas (
        id SERIAL PRIMARY KEY,
        paciente_id INT REFERENCES pacientes(id) ON DELETE CASCADE,
        descripcion TEXT,
        total NUMERIC(10,2),
        estado VARCHAR(50) DEFAULT 'pendiente',
        fecha TIMESTAMP DEFAULT NOW()
      );
    `);

    // Usuario admin por defecto
    const existe = await pool.query("SELECT id FROM usuarios WHERE usuario = 'admin'");
    if (existe.rows.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO usuarios (usuario, password, rol, nombres) VALUES ($1,$2,$3,$4)',
        ['admin', hash, 'administrador', 'Administrador']
      );
      console.log('👤 Usuario por defecto: admin / admin123');
    }

    console.log('📋 Tablas listas');
  } catch (err) {
    console.error('❌ Error creando tablas:', err.message);
  }
}

crearTablas();

// ──────────────────────────────────────────────
// MIDDLEWARE JWT
// ──────────────────────────────────────────────
function verificarToken(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'Token requerido' });
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function soloAdmin(req, res, next) {
  if (req.usuario.rol !== 'administrador')
    return res.status(403).json({ error: 'Solo administradores' });
  next();
}

// ──────────────────────────────────────────────
// AUTH — rutas públicas
// ──────────────────────────────────────────────
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
    res.json({ mensaje: `Bienvenido, ${user.nombres || user.usuario}`, token, rol: user.rol, usuario: user.usuario, id: user.id });
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/registro', async (req, res) => {
  const { usuario, password, rol, nombres, cedula, email, fecha_nacimiento } = req.body;
  if (!usuario || !password || !rol)
    return res.status(400).json({ error: 'Faltan campos: usuario, password y rol son obligatorios' });
  try {
    const existe = await pool.query('SELECT id FROM usuarios WHERE usuario = $1', [usuario]);
    if (existe.rows.length > 0)
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO usuarios (usuario, password, rol, nombres, cedula, email, fecha_nacimiento) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, usuario, rol, nombres, email',
      [usuario, hash, rol, nombres || null, cedula || null, email || null, fecha_nacimiento || null]
    );
    res.status(201).json({ mensaje: 'Usuario registrado exitosamente', usuario: result.rows[0] });
  } catch {
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// ──────────────────────────────────────────────
// Todas las rutas siguientes requieren token
// ──────────────────────────────────────────────
app.use(verificarToken);

// ──────────────────────────────────────────────
// PACIENTES
// ──────────────────────────────────────────────
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
  } catch {
    res.status(500).json({ error: 'Error al obtener pacientes' });
  }
});

app.get('/pacientes/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pacientes WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al obtener paciente' });
  }
});

app.post('/pacientes', async (req, res) => {
  const { nombre, documento, edad, sexo, telefono, direccion } = req.body;
  if (!nombre || !documento)
    return res.status(400).json({ error: 'Nombre y documento son obligatorios' });
  try {
    const result = await pool.query(
      'INSERT INTO pacientes (nombre, documento, edad, sexo, telefono, direccion) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [nombre, documento, edad || null, sexo || null, telefono || null, direccion || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El documento ya está registrado' });
    res.status(500).json({ error: 'Error al crear paciente' });
  }
});

app.put('/pacientes/:id', async (req, res) => {
  const { nombre, documento, edad, sexo, telefono, direccion } = req.body;
  try {
    const result = await pool.query(
      `UPDATE pacientes
       SET nombre=$1, documento=$2, edad=$3, sexo=$4, telefono=$5, direccion=$6
       WHERE id=$7 RETURNING *`,
      [nombre, documento, edad || null, sexo || null, telefono || null, direccion || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El documento ya está en uso' });
    res.status(500).json({ error: 'Error al actualizar paciente' });
  }
});

app.delete('/pacientes/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM pacientes WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json({ mensaje: 'Paciente eliminado' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar paciente' });
  }
});

// ──────────────────────────────────────────────
// HISTORIAS CLÍNICAS
// ──────────────────────────────────────────────
app.get('/pacientes/:id/historia', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT hc.*, u.nombres AS medico_nombre
       FROM historias_clinicas hc
       LEFT JOIN usuarios u ON hc.medico_id = u.id
       WHERE hc.paciente_id = $1
       ORDER BY hc.fecha DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Error al obtener historia clínica' });
  }
});

app.post('/pacientes/:id/historia', async (req, res) => {
  const { motivo_consulta, diagnostico, tratamiento, observaciones } = req.body;
  const medico_id = req.usuario.id;
  try {
    const result = await pool.query(
      `INSERT INTO historias_clinicas (paciente_id, medico_id, motivo_consulta, diagnostico, tratamiento, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, medico_id, motivo_consulta, diagnostico, tratamiento, observaciones]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al crear registro clínico' });
  }
});

app.put('/historia/:id', async (req, res) => {
  const { motivo_consulta, diagnostico, tratamiento, observaciones } = req.body;
  try {
    const result = await pool.query(
      `UPDATE historias_clinicas
       SET motivo_consulta=$1, diagnostico=$2, tratamiento=$3, observaciones=$4
       WHERE id=$5 RETURNING *`,
      [motivo_consulta, diagnostico, tratamiento, observaciones, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al actualizar registro clínico' });
  }
});

app.delete('/historia/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM historias_clinicas WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json({ mensaje: 'Registro eliminado' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar registro clínico' });
  }
});

// ──────────────────────────────────────────────
// TRATAMIENTOS
// ──────────────────────────────────────────────
app.get('/pacientes/:id/tratamientos', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.nombres AS medico_nombre
       FROM tratamientos t
       LEFT JOIN usuarios u ON t.medico_id = u.id
       WHERE t.paciente_id = $1
       ORDER BY t.fecha_inicio DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Error al obtener tratamientos' });
  }
});

app.post('/pacientes/:id/tratamientos', async (req, res) => {
  const { medicamento, dosis, frecuencia, duracion, fecha_inicio, fecha_fin, notas } = req.body;
  if (!medicamento) return res.status(400).json({ error: 'El medicamento es obligatorio' });
  const medico_id = req.usuario.id;
  try {
    const result = await pool.query(
      `INSERT INTO tratamientos (paciente_id, medico_id, medicamento, dosis, frecuencia, duracion, fecha_inicio, fecha_fin, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.params.id, medico_id, medicamento, dosis, frecuencia, duracion, fecha_inicio || null, fecha_fin || null, notas]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al crear tratamiento' });
  }
});

app.put('/tratamientos/:id', async (req, res) => {
  const { medicamento, dosis, frecuencia, duracion, estado, fecha_inicio, fecha_fin, notas } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tratamientos
       SET medicamento=$1, dosis=$2, frecuencia=$3, duracion=$4, estado=$5, fecha_inicio=$6, fecha_fin=$7, notas=$8
       WHERE id=$9 RETURNING *`,
      [medicamento, dosis, frecuencia, duracion, estado || 'activo', fecha_inicio || null, fecha_fin || null, notas, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tratamiento no encontrado' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al actualizar tratamiento' });
  }
});

app.delete('/tratamientos/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tratamientos WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tratamiento no encontrado' });
    res.json({ mensaje: 'Tratamiento eliminado' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar tratamiento' });
  }
});

// ──────────────────────────────────────────────
// CAMAS
// ──────────────────────────────────────────────
app.get('/camas', async (req, res) => {
  try {
    const { estado } = req.query;
    const result = estado
      ? await pool.query('SELECT * FROM camas WHERE estado = $1 ORDER BY numero', [estado])
      : await pool.query('SELECT * FROM camas ORDER BY numero');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Error al obtener camas' });
  }
});

app.get('/camas/disponibles', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM camas WHERE estado = 'disponible' ORDER BY numero");
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Error al obtener camas disponibles' });
  }
});

app.post('/camas', async (req, res) => {
  const { numero, piso, tipo } = req.body;
  if (!numero) return res.status(400).json({ error: 'El número de cama es obligatorio' });
  try {
    const result = await pool.query(
      'INSERT INTO camas (numero, piso, tipo) VALUES ($1,$2,$3) RETURNING *',
      [numero, piso || null, tipo || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El número de cama ya existe' });
    res.status(500).json({ error: 'Error al crear cama' });
  }
});

app.put('/camas/:id', async (req, res) => {
  const { numero, piso, tipo, estado } = req.body;
  try {
    const result = await pool.query(
      'UPDATE camas SET numero=$1, piso=$2, tipo=$3, estado=$4 WHERE id=$5 RETURNING *',
      [numero, piso || null, tipo || null, estado || 'disponible', req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cama no encontrada' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al actualizar cama' });
  }
});

app.delete('/camas/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM camas WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cama no encontrada' });
    res.json({ mensaje: 'Cama eliminada' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar cama' });
  }
});

// ──────────────────────────────────────────────
// HOSPITALIZACIONES
// ──────────────────────────────────────────────
app.get('/hospitalizaciones', async (req, res) => {
  try {
    const { estado } = req.query;
    const base = `
      SELECT h.*, p.nombre AS paciente_nombre, p.documento,
             c.numero AS cama_numero, c.piso,
             u.nombres AS medico_nombre
      FROM hospitalizaciones h
      LEFT JOIN pacientes p ON h.paciente_id = p.id
      LEFT JOIN camas c ON h.cama_id = c.id
      LEFT JOIN usuarios u ON h.medico_id = u.id
    `;
    const result = estado
      ? await pool.query(base + ' WHERE h.estado = $1 ORDER BY h.fecha_ingreso DESC', [estado])
      : await pool.query(base + ' ORDER BY h.fecha_ingreso DESC');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Error al obtener hospitalizaciones' });
  }
});

app.get('/hospitalizaciones/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT h.*, p.nombre AS paciente_nombre, p.documento,
              c.numero AS cama_numero, c.piso,
              u.nombres AS medico_nombre
       FROM hospitalizaciones h
       LEFT JOIN pacientes p ON h.paciente_id = p.id
       LEFT JOIN camas c ON h.cama_id = c.id
       LEFT JOIN usuarios u ON h.medico_id = u.id
       WHERE h.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Hospitalización no encontrada' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al obtener hospitalización' });
  }
});

app.post('/hospitalizaciones', async (req, res) => {
  const { paciente_id, cama_id, diagnostico } = req.body;
  if (!paciente_id || !cama_id) return res.status(400).json({ error: 'paciente_id y cama_id son obligatorios' });
  const medico_id = req.usuario.id;
  try {
    await pool.query("UPDATE camas SET estado='ocupada' WHERE id=$1", [cama_id]);
    const result = await pool.query(
      'INSERT INTO hospitalizaciones (paciente_id, cama_id, medico_id, diagnostico) VALUES ($1,$2,$3,$4) RETURNING *',
      [paciente_id, cama_id, medico_id, diagnostico || null]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al crear hospitalización' });
  }
});

app.put('/hospitalizaciones/:id', async (req, res) => {
  const { diagnostico, estado, fecha_alta, cama_id } = req.body;
  try {
    // Si se da de alta, liberar la cama
    if (estado === 'alta') {
      const hosp = await pool.query('SELECT cama_id FROM hospitalizaciones WHERE id=$1', [req.params.id]);
      if (hosp.rows.length > 0 && hosp.rows[0].cama_id) {
        await pool.query("UPDATE camas SET estado='disponible' WHERE id=$1", [hosp.rows[0].cama_id]);
      }
    }
    const result = await pool.query(
      `UPDATE hospitalizaciones
       SET diagnostico=$1, estado=$2, fecha_alta=$3, cama_id=COALESCE($4, cama_id)
       WHERE id=$5 RETURNING *`,
      [diagnostico, estado || 'activo', fecha_alta || null, cama_id || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Hospitalización no encontrada' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al actualizar hospitalización' });
  }
});

app.delete('/hospitalizaciones/:id', async (req, res) => {
  try {
    const hosp = await pool.query('SELECT cama_id FROM hospitalizaciones WHERE id=$1', [req.params.id]);
    if (hosp.rows.length === 0) return res.status(404).json({ error: 'Hospitalización no encontrada' });
    if (hosp.rows[0].cama_id) {
      await pool.query("UPDATE camas SET estado='disponible' WHERE id=$1", [hosp.rows[0].cama_id]);
    }
    await pool.query('DELETE FROM hospitalizaciones WHERE id=$1', [req.params.id]);
    res.json({ mensaje: 'Hospitalización eliminada' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar hospitalización' });
  }
});

// ──────────────────────────────────────────────
// CITAS
// ──────────────────────────────────────────────
app.get('/citas', async (req, res) => {
  try {
    const { fecha, medico_id, paciente_id, estado } = req.query;
    let query = `
      SELECT ci.*, p.nombre AS paciente_nombre, p.documento,
             u.nombres AS medico_nombre
      FROM citas ci
      LEFT JOIN pacientes p ON ci.paciente_id = p.id
      LEFT JOIN usuarios u ON ci.medico_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (fecha)       { params.push(fecha);       query += ` AND ci.fecha = $${params.length}`; }
    if (medico_id)   { params.push(medico_id);   query += ` AND ci.medico_id = $${params.length}`; }
    if (paciente_id) { params.push(paciente_id); query += ` AND ci.paciente_id = $${params.length}`; }
    if (estado)      { params.push(estado);      query += ` AND ci.estado = $${params.length}`; }
    query += ' ORDER BY ci.fecha DESC, ci.hora ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Error al obtener citas' });
  }
});

app.get('/citas/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ci.*, p.nombre AS paciente_nombre, u.nombres AS medico_nombre
       FROM citas ci
       LEFT JOIN pacientes p ON ci.paciente_id = p.id
       LEFT JOIN usuarios u ON ci.medico_id = u.id
       WHERE ci.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al obtener cita' });
  }
});

app.post('/citas', async (req, res) => {
  const { paciente_id, medico_id, fecha, hora, motivo } = req.body;
  if (!paciente_id || !medico_id || !fecha || !hora)
    return res.status(400).json({ error: 'paciente_id, medico_id, fecha y hora son obligatorios' });
  try {
    const result = await pool.query(
      'INSERT INTO citas (paciente_id, medico_id, fecha, hora, motivo) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [paciente_id, medico_id, fecha, hora, motivo || null]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al crear cita' });
  }
});

app.put('/citas/:id', async (req, res) => {
  const { paciente_id, medico_id, fecha, hora, motivo, estado } = req.body;
  try {
    const result = await pool.query(
      `UPDATE citas SET paciente_id=$1, medico_id=$2, fecha=$3, hora=$4, motivo=$5, estado=$6
       WHERE id=$7 RETURNING *`,
      [paciente_id, medico_id, fecha, hora, motivo, estado || 'pendiente', req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al actualizar cita' });
  }
});

app.delete('/citas/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM citas WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json({ mensaje: 'Cita eliminada' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar cita' });
  }
});

// ──────────────────────────────────────────────
// MEDICAMENTOS (inventario)
// ──────────────────────────────────────────────
app.get('/medicamentos', async (req, res) => {
  try {
    const { search } = req.query;
    const result = search
      ? await pool.query('SELECT * FROM medicamentos WHERE nombre ILIKE $1 ORDER BY nombre', [`%${search}%`])
      : await pool.query('SELECT * FROM medicamentos ORDER BY nombre');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Error al obtener medicamentos' });
  }
});

app.get('/medicamentos/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM medicamentos WHERE id=$1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Medicamento no encontrado' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al obtener medicamento' });
  }
});

app.post('/medicamentos', async (req, res) => {
  const { nombre, descripcion, stock, unidad, precio } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  try {
    const result = await pool.query(
      'INSERT INTO medicamentos (nombre, descripcion, stock, unidad, precio) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [nombre, descripcion || null, stock || 0, unidad || null, precio || null]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al crear medicamento' });
  }
});

app.put('/medicamentos/:id', async (req, res) => {
  const { nombre, descripcion, stock, unidad, precio } = req.body;
  try {
    const result = await pool.query(
      'UPDATE medicamentos SET nombre=$1, descripcion=$2, stock=$3, unidad=$4, precio=$5 WHERE id=$6 RETURNING *',
      [nombre, descripcion || null, stock ?? 0, unidad || null, precio || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Medicamento no encontrado' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al actualizar medicamento' });
  }
});

app.delete('/medicamentos/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM medicamentos WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Medicamento no encontrado' });
    res.json({ mensaje: 'Medicamento eliminado' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar medicamento' });
  }
});

// ──────────────────────────────────────────────
// FACTURAS
// ──────────────────────────────────────────────
app.get('/facturas', async (req, res) => {
  try {
    const { estado, paciente_id } = req.query;
    let query = `
      SELECT f.*, p.nombre AS paciente_nombre, p.documento
      FROM facturas f
      LEFT JOIN pacientes p ON f.paciente_id = p.id
      WHERE 1=1
    `;
    const params = [];
    if (estado)      { params.push(estado);      query += ` AND f.estado = $${params.length}`; }
    if (paciente_id) { params.push(paciente_id); query += ` AND f.paciente_id = $${params.length}`; }
    query += ' ORDER BY f.fecha DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Error al obtener facturas' });
  }
});

app.get('/facturas/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, p.nombre AS paciente_nombre, p.documento
       FROM facturas f LEFT JOIN pacientes p ON f.paciente_id = p.id
       WHERE f.id=$1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Factura no encontrada' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al obtener factura' });
  }
});

app.post('/facturas', async (req, res) => {
  const { paciente_id, descripcion, total } = req.body;
  if (!paciente_id || !total) return res.status(400).json({ error: 'paciente_id y total son obligatorios' });
  try {
    const result = await pool.query(
      'INSERT INTO facturas (paciente_id, descripcion, total) VALUES ($1,$2,$3) RETURNING *',
      [paciente_id, descripcion || null, total]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al crear factura' });
  }
});

app.put('/facturas/:id', async (req, res) => {
  const { descripcion, total, estado } = req.body;
  try {
    const result = await pool.query(
      'UPDATE facturas SET descripcion=$1, total=$2, estado=$3 WHERE id=$4 RETURNING *',
      [descripcion || null, total, estado || 'pendiente', req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Factura no encontrada' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al actualizar factura' });
  }
});

app.delete('/facturas/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM facturas WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Factura no encontrada' });
    res.json({ mensaje: 'Factura eliminada' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar factura' });
  }
});

// ──────────────────────────────────────────────
// USUARIOS (solo admin)
// ──────────────────────────────────────────────
app.get('/usuarios', async (req, res) => {
  try {
    const { rol } = req.query;
    const result = rol
      ? await pool.query(
          'SELECT id, usuario, rol, nombres, cedula, email, fecha_nacimiento, creado_en FROM usuarios WHERE rol = $1 ORDER BY nombres',
          [rol]
        )
      : await pool.query(
          'SELECT id, usuario, rol, nombres, cedula, email, fecha_nacimiento, creado_en FROM usuarios ORDER BY id'
        );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

app.get('/usuarios/:id', soloAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, usuario, rol, nombres, cedula, email, fecha_nacimiento, creado_en FROM usuarios WHERE id=$1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

app.put('/usuarios/:id', soloAdmin, async (req, res) => {
  const { nombres, cedula, email, fecha_nacimiento, rol } = req.body;
  try {
    const result = await pool.query(
      `UPDATE usuarios SET nombres=$1, cedula=$2, email=$3, fecha_nacimiento=$4, rol=$5
       WHERE id=$6 RETURNING id, usuario, rol, nombres, cedula, email, fecha_nacimiento`,
      [nombres, cedula || null, email || null, fecha_nacimiento || null, rol, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

app.delete('/usuarios/:id', soloAdmin, async (req, res) => {
  if (parseInt(req.params.id) === req.usuario.id)
    return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
  try {
    const result = await pool.query('DELETE FROM usuarios WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ mensaje: 'Usuario eliminado' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// ──────────────────────────────────────────────
// ESTADÍSTICAS (dashboard)
// ──────────────────────────────────────────────
app.get('/estadisticas', async (req, res) => {
  try {
    const [
      totalPacientes,
      totalUsuarios,
      hospitalizacionesActivas,
      camasDisponibles,
      citasHoy,
      facturasPendientes,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM pacientes'),
      pool.query('SELECT COUNT(*) FROM usuarios'),
      pool.query("SELECT COUNT(*) FROM hospitalizaciones WHERE estado='activo'"),
      pool.query("SELECT COUNT(*) FROM camas WHERE estado='disponible'"),
      pool.query('SELECT COUNT(*) FROM citas WHERE fecha=CURRENT_DATE'),
      pool.query("SELECT COUNT(*), COALESCE(SUM(total),0) AS total FROM facturas WHERE estado='pendiente'"),
    ]);
    res.json({
      pacientes: parseInt(totalPacientes.rows[0].count),
      usuarios: parseInt(totalUsuarios.rows[0].count),
      hospitalizaciones_activas: parseInt(hospitalizacionesActivas.rows[0].count),
      camas_disponibles: parseInt(camasDisponibles.rows[0].count),
      citas_hoy: parseInt(citasHoy.rows[0].count),
      facturas_pendientes: parseInt(facturasPendientes.rows[0].count),
      monto_pendiente: parseFloat(facturasPendientes.rows[0].total),
    });
  } catch {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
