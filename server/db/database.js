import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// En producción usar /data (volumen persistente en Railway)
const dbPath = process.env.NODE_ENV === 'production' 
  ? (process.env.DATABASE_PATH || '/data/licitaciones.db')
  : path.join(__dirname, '../../licitaciones.db');

console.log(`[DB] Ruta de base de datos: ${dbPath}`);
console.log(`[DB] NODE_ENV: ${process.env.NODE_ENV}`);

let db = null;
let SQL = null;

// Proveedores permitidos
const PROVEEDORES_PERMITIDOS = ['Therapía iv', 'Fresenius Kabi Chile Ltda.'];

// Líneas disponibles (antes llamadas categorías)
export const LINEAS = [
  'Nutrición Parenteral',
  'Nutrición Parenteral Magistral', 
  'Enterales y SO',
  'Anestesia',
  'Oncología'
];

// Instituciones precargadas
export const INSTITUCIONES_PRECARGADAS = [
  'Hospital Guillermo Grant Benavente',
  'Hospital las Higueras',
  'Hospital Victor Rios Ruiz',
  'Hospital Hernan Henriquez Aravena',
  'Hospital Naval de Talcahuano',
  'Hospital Padre las Casas',
  'Hospital de Curanilahue'
];

async function getDatabase() {
  if (db) return db;
  
  if (!SQL) {
    SQL = await initSqlJs();
  }
  
  try {
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }
  } catch (e) {
    db = new SQL.Database();
  }
  
  return db;
}

function saveDatabase() {
  if (db) {
    // Asegurar que el directorio existe
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      console.log(`[DB] Creando directorio: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    console.log(`[DB] Base de datos guardada en: ${dbPath} (${buffer.length} bytes)`);
  }
}

export async function initDatabase() {
  const database = await getDatabase();
  
  // Tabla de instituciones
  database.run(`
    CREATE TABLE IF NOT EXISTS instituciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      fecha_creada TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Tabla de usuarios
  database.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nombre TEXT,
      fecha_creada TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Tabla de licitaciones con institución, línea y usuario
  database.run(`
    CREATE TABLE IF NOT EXISTS licitaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL,
      nombre TEXT,
      estado TEXT,
      estado_codigo INTEGER,
      fecha_cierre TEXT,
      organismo TEXT,
      monto_estimado REAL,
      institucion_id INTEGER,
      linea TEXT,
      monto_total_licitacion REAL,
      fecha_vencimiento TEXT,
      user_id INTEGER,
      fecha_agregada TEXT DEFAULT CURRENT_TIMESTAMP,
      ultima_actualizacion TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (institucion_id) REFERENCES instituciones(id),
      FOREIGN KEY (user_id) REFERENCES usuarios(id),
      UNIQUE(codigo, user_id)
    )
  `);
  
  database.run(`
    CREATE TABLE IF NOT EXISTS ordenes_compra (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      licitacion_codigo TEXT NOT NULL,
      nombre TEXT,
      estado TEXT,
      estado_codigo INTEGER,
      proveedor TEXT,
      proveedor_rut TEXT,
      monto REAL,
      moneda TEXT,
      fecha_envio TEXT,
      fecha_aceptacion TEXT,
      fecha_agregada TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (licitacion_codigo) REFERENCES licitaciones(codigo)
    )
  `);
  
  database.run(`CREATE INDEX IF NOT EXISTS idx_ordenes_licitacion ON ordenes_compra(licitacion_codigo)`);
  
  // Tabla de notificaciones
  database.run(`
    CREATE TABLE IF NOT EXISTS notificaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      titulo TEXT NOT NULL,
      mensaje TEXT NOT NULL,
      licitacion_codigo TEXT,
      cantidad_oc INTEGER,
      leida INTEGER DEFAULT 0,
      fecha_creada TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  database.run(`CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(leida)`);
  
  // Migrar columnas si no existen
  try {
    database.run(`ALTER TABLE licitaciones ADD COLUMN institucion_id INTEGER`);
  } catch (e) {}
  try {
    database.run(`ALTER TABLE licitaciones ADD COLUMN linea TEXT`);
  } catch (e) {}
  try {
    database.run(`ALTER TABLE licitaciones ADD COLUMN monto_total_licitacion REAL`);
  } catch (e) {}
  try {
    database.run(`ALTER TABLE licitaciones ADD COLUMN fecha_vencimiento TEXT`);
  } catch (e) {}
  try {
    database.run(`ALTER TABLE licitaciones ADD COLUMN user_id INTEGER`);
  } catch (e) {}
  
  // Crear índices
  try {
    database.run(`CREATE INDEX IF NOT EXISTS idx_licitaciones_institucion ON licitaciones(institucion_id)`);
  } catch (e) {}
  try {
    database.run(`CREATE INDEX IF NOT EXISTS idx_licitaciones_user ON licitaciones(user_id)`);
  } catch (e) {}
  
  // Precargar instituciones
  for (const nombre of INSTITUCIONES_PRECARGADAS) {
    try {
      database.run(`INSERT OR IGNORE INTO instituciones (nombre) VALUES (?)`, [nombre]);
    } catch (e) {}
  }
  
  saveDatabase();
  console.log('Base de datos inicializada correctamente');
}

export async function guardarLicitacion(licitacion, userId) {
  const database = await getDatabase();
  
  database.run(`
    INSERT INTO licitaciones (codigo, nombre, estado, estado_codigo, fecha_cierre, organismo, monto_estimado, user_id, ultima_actualizacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(codigo, user_id) DO UPDATE SET
      nombre = excluded.nombre,
      estado = excluded.estado,
      estado_codigo = excluded.estado_codigo,
      fecha_cierre = excluded.fecha_cierre,
      organismo = excluded.organismo,
      monto_estimado = excluded.monto_estimado,
      ultima_actualizacion = datetime('now')
  `, [licitacion.codigo, licitacion.nombre, licitacion.estado, licitacion.estado_codigo, licitacion.fecha_cierre, licitacion.organismo, licitacion.monto_estimado, userId]);
  
  saveDatabase();
}

export async function guardarOrdenCompra(orden) {
  const database = await getDatabase();
  
  database.run(`
    INSERT INTO ordenes_compra (codigo, licitacion_codigo, nombre, estado, estado_codigo, proveedor, proveedor_rut, monto, moneda, fecha_envio, fecha_aceptacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(codigo) DO UPDATE SET
      nombre = excluded.nombre,
      estado = excluded.estado,
      estado_codigo = excluded.estado_codigo,
      proveedor = excluded.proveedor,
      proveedor_rut = excluded.proveedor_rut,
      monto = excluded.monto,
      moneda = excluded.moneda,
      fecha_envio = excluded.fecha_envio,
      fecha_aceptacion = excluded.fecha_aceptacion
  `, [orden.codigo, orden.licitacion_codigo, orden.nombre, orden.estado, orden.estado_codigo, orden.proveedor, orden.proveedor_rut, orden.monto, orden.moneda, orden.fecha_envio, orden.fecha_aceptacion]);
  
  saveDatabase();
}

function resultToObjects(result) {
  if (!result || result.length === 0) return [];
  const columns = result[0].columns;
  const values = result[0].values;
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

export async function obtenerLicitaciones(userId) {
  const database = await getDatabase();
  const result = database.exec('SELECT * FROM licitaciones WHERE user_id = ? ORDER BY fecha_agregada DESC', [userId]);
  return resultToObjects(result);
}

export async function obtenerTodasLasLicitaciones() {
  const database = await getDatabase();
  const result = database.exec('SELECT * FROM licitaciones ORDER BY fecha_agregada DESC');
  return resultToObjects(result);
}

export async function actualizarLicitacionSinUsuario(licitacion) {
  const database = await getDatabase();
  
  database.run(`
    UPDATE licitaciones SET
      nombre = ?,
      estado = ?,
      estado_codigo = ?,
      fecha_cierre = ?,
      organismo = ?,
      monto_estimado = ?,
      ultima_actualizacion = datetime('now')
    WHERE codigo = ?
  `, [licitacion.nombre, licitacion.estado, licitacion.estado_codigo, licitacion.fecha_cierre, licitacion.organismo, licitacion.monto_estimado, licitacion.codigo]);
  
  saveDatabase();
}

export async function obtenerLicitacionPorCodigo(codigo, userId) {
  const database = await getDatabase();
  const stmt = database.prepare('SELECT * FROM licitaciones WHERE codigo = ? AND user_id = ?');
  stmt.bind([codigo, userId]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export async function obtenerOrdenesDeCompra(licitacionCodigo) {
  const database = await getDatabase();
  // Filtrar solo por proveedores permitidos y excluir canceladas
  const result = database.exec(
    `SELECT * FROM ordenes_compra 
     WHERE licitacion_codigo = ? 
     AND (proveedor = 'Therapía iv' OR proveedor = 'Fresenius Kabi Chile Ltda.')
     AND estado != 'Cancelada'
     ORDER BY fecha_envio DESC`, 
    [licitacionCodigo]
  );
  return resultToObjects(result);
}

export async function obtenerTodasLasOC() {
  const database = await getDatabase();
  const result = database.exec(
    `SELECT * FROM ordenes_compra 
     WHERE (proveedor = 'Therapía iv' OR proveedor = 'Fresenius Kabi Chile Ltda.')
     AND estado != 'Cancelada'
     ORDER BY fecha_envio DESC`
  );
  return resultToObjects(result);
}

export async function eliminarLicitacion(codigo, userId) {
  const database = await getDatabase();
  database.run('DELETE FROM ordenes_compra WHERE licitacion_codigo = ?', [codigo]);
  database.run('DELETE FROM licitaciones WHERE codigo = ? AND user_id = ?', [codigo, userId]);
  saveDatabase();
}

export async function obtenerEstadisticas() {
  const database = await getDatabase();
  
  const licitacionesResult = database.exec('SELECT COUNT(*) as total FROM licitaciones');
  
  // Contar solo OC de proveedores permitidos y NO canceladas
  const ordenesResult = database.exec(
    `SELECT COUNT(*) as total FROM ordenes_compra 
     WHERE (proveedor = 'Therapía iv' OR proveedor = 'Fresenius Kabi Chile Ltda.') 
     AND estado != 'Cancelada'`
  );
  
  // Sumar monto solo de OC de proveedores permitidos y NO canceladas
  const montoResult = database.exec(
    `SELECT COALESCE(SUM(monto), 0) as total FROM ordenes_compra 
     WHERE (proveedor = 'Therapía iv' OR proveedor = 'Fresenius Kabi Chile Ltda.') 
     AND estado != 'Cancelada'`
  );
  
  return {
    totalLicitaciones: licitacionesResult[0]?.values[0]?.[0] || 0,
    totalOrdenes: ordenesResult[0]?.values[0]?.[0] || 0,
    montoTotal: montoResult[0]?.values[0]?.[0] || 0
  };
}

// ========== INSTITUCIONES ==========

export async function obtenerInstituciones() {
  const database = await getDatabase();
  const result = database.exec('SELECT * FROM instituciones ORDER BY nombre');
  return resultToObjects(result);
}

export async function crearInstitucion(nombre) {
  const database = await getDatabase();
  database.run('INSERT INTO instituciones (nombre) VALUES (?)', [nombre]);
  saveDatabase();
  const result = database.exec('SELECT * FROM instituciones WHERE nombre = ?', [nombre]);
  return resultToObjects(result)[0];
}

export async function eliminarInstitucion(id) {
  const database = await getDatabase();
  // Desasociar licitaciones de esta institución
  database.run('UPDATE licitaciones SET institucion_id = NULL WHERE institucion_id = ?', [id]);
  database.run('DELETE FROM instituciones WHERE id = ?', [id]);
  saveDatabase();
}

// ========== LICITACIONES CON INSTITUCIÓN Y LÍNEA ==========

export async function obtenerLicitacionesPorInstitucion(institucionId, userId) {
  const database = await getDatabase();
  const result = database.exec(
    'SELECT * FROM licitaciones WHERE institucion_id = ? AND user_id = ? ORDER BY linea, fecha_agregada DESC',
    [institucionId, userId]
  );
  return resultToObjects(result);
}

export async function actualizarLicitacionInstitucion(codigo, institucionId, linea, userId) {
  const database = await getDatabase();
  database.run(
    'UPDATE licitaciones SET institucion_id = ?, linea = ? WHERE codigo = ? AND user_id = ?',
    [institucionId, linea, codigo, userId]
  );
  saveDatabase();
}

export async function actualizarDatosLicitacion(codigo, montoTotalLicitacion, fechaVencimiento, userId) {
  const database = await getDatabase();
  database.run(
    'UPDATE licitaciones SET monto_total_licitacion = ?, fecha_vencimiento = ? WHERE codigo = ? AND user_id = ?',
    [montoTotalLicitacion, fechaVencimiento, codigo, userId]
  );
  saveDatabase();
}

export async function obtenerMontoOCLicitacion(licitacionCodigo) {
  const database = await getDatabase();
  // Sumar solo OC no canceladas de proveedores permitidos
  const result = database.exec(
    `SELECT COALESCE(SUM(monto), 0) as total FROM ordenes_compra 
     WHERE licitacion_codigo = ?
     AND (proveedor = 'Therapía iv' OR proveedor = 'Fresenius Kabi Chile Ltda.')
     AND estado != 'Cancelada'`,
    [licitacionCodigo]
  );
  return result[0]?.values[0]?.[0] || 0;
}

// ========== USUARIOS Y AUTENTICACIÓN ==========

export async function crearUsuario(email, password, nombre) {
  const database = await getDatabase();
  const hashedPassword = await bcrypt.hash(password, 10);
  
  try {
    database.run(
      'INSERT INTO usuarios (email, password, nombre) VALUES (?, ?, ?)',
      [email.toLowerCase(), hashedPassword, nombre]
    );
    saveDatabase();
    
    const result = database.exec('SELECT id, email, nombre, fecha_creada FROM usuarios WHERE email = ?', [email.toLowerCase()]);
    return resultToObjects(result)[0];
  } catch (e) {
    if (e.message.includes('UNIQUE constraint')) {
      throw new Error('El email ya está registrado');
    }
    throw e;
  }
}

export async function autenticarUsuario(email, password) {
  const database = await getDatabase();
  const result = database.exec('SELECT * FROM usuarios WHERE email = ?', [email.toLowerCase()]);
  const usuarios = resultToObjects(result);
  
  if (usuarios.length === 0) {
    throw new Error('Credenciales inválidas');
  }
  
  const usuario = usuarios[0];
  const passwordValido = await bcrypt.compare(password, usuario.password);
  
  if (!passwordValido) {
    throw new Error('Credenciales inválidas');
  }
  
  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre
  };
}

export async function obtenerUsuarioPorId(id) {
  const database = await getDatabase();
  const result = database.exec('SELECT id, email, nombre, fecha_creada FROM usuarios WHERE id = ?', [id]);
  const usuarios = resultToObjects(result);
  return usuarios[0] || null;
}

export async function cambiarPassword(userId, passwordActual, passwordNuevo) {
  const database = await getDatabase();
  const result = database.exec('SELECT * FROM usuarios WHERE id = ?', [userId]);
  const usuarios = resultToObjects(result);
  
  if (usuarios.length === 0) {
    throw new Error('Usuario no encontrado');
  }
  
  const usuario = usuarios[0];
  const passwordValido = await bcrypt.compare(passwordActual, usuario.password);
  
  if (!passwordValido) {
    throw new Error('Contraseña actual incorrecta');
  }
  
  const hashedPassword = await bcrypt.hash(passwordNuevo, 10);
  database.run('UPDATE usuarios SET password = ? WHERE id = ?', [hashedPassword, userId]);
  saveDatabase();
}

export async function eliminarUsuario(userId, password) {
  const database = await getDatabase();
  const result = database.exec('SELECT * FROM usuarios WHERE id = ?', [userId]);
  const usuarios = resultToObjects(result);
  
  if (usuarios.length === 0) {
    throw new Error('Usuario no encontrado');
  }
  
  const usuario = usuarios[0];
  const passwordValido = await bcrypt.compare(password, usuario.password);
  
  if (!passwordValido) {
    throw new Error('Contraseña incorrecta');
  }
  
  // Eliminar todas las licitaciones y OC del usuario
  const licitaciones = database.exec('SELECT codigo FROM licitaciones WHERE user_id = ?', [userId]);
  const codigosLic = resultToObjects(licitaciones);
  
  for (const lic of codigosLic) {
    database.run('DELETE FROM ordenes_compra WHERE licitacion_codigo = ?', [lic.codigo]);
  }
  
  database.run('DELETE FROM licitaciones WHERE user_id = ?', [userId]);
  database.run('DELETE FROM usuarios WHERE id = ?', [userId]);
  saveDatabase();
}

// === FUNCIONES DE NOTIFICACIONES ===

export async function crearNotificacion(tipo, titulo, mensaje, licitacionCodigo = null, cantidadOC = null) {
  const database = await getDatabase();
  database.run(`
    INSERT INTO notificaciones (tipo, titulo, mensaje, licitacion_codigo, cantidad_oc)
    VALUES (?, ?, ?, ?, ?)
  `, [tipo, titulo, mensaje, licitacionCodigo, cantidadOC]);
  saveDatabase();
  console.log(`[NOTIF] Nueva notificación: ${titulo}`);
}

export async function obtenerNotificaciones(soloNoLeidas = false) {
  const database = await getDatabase();
  const query = soloNoLeidas 
    ? 'SELECT * FROM notificaciones WHERE leida = 0 ORDER BY fecha_creada DESC'
    : 'SELECT * FROM notificaciones ORDER BY fecha_creada DESC LIMIT 50';
  const result = database.exec(query);
  return resultToObjects(result);
}

export async function contarNotificacionesNoLeidas() {
  const database = await getDatabase();
  const result = database.exec('SELECT COUNT(*) as count FROM notificaciones WHERE leida = 0');
  const rows = resultToObjects(result);
  return rows.length > 0 ? rows[0].count : 0;
}

export async function marcarNotificacionLeida(id) {
  const database = await getDatabase();
  database.run('UPDATE notificaciones SET leida = 1 WHERE id = ?', [id]);
  saveDatabase();
}

export async function marcarTodasLeidas() {
  const database = await getDatabase();
  database.run('UPDATE notificaciones SET leida = 1');
  saveDatabase();
}

export async function eliminarNotificacion(id) {
  const database = await getDatabase();
  database.run('DELETE FROM notificaciones WHERE id = ?', [id]);
  saveDatabase();
}

export async function eliminarTodasNotificaciones() {
  const database = await getDatabase();
  database.run('DELETE FROM notificaciones');
  saveDatabase();
}

export async function verificarOCExiste(codigoOC) {
  const database = await getDatabase();
  const result = database.exec('SELECT COUNT(*) as count FROM ordenes_compra WHERE codigo = ?', [codigoOC]);
  const rows = resultToObjects(result);
  return rows.length > 0 && rows[0].count > 0;
}
