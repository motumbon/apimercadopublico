import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import express from 'express';
import cors from 'cors';
import cron from 'node-cron';

import licitacionesRoutes from './routes/licitaciones.js';
import ordenesRoutes from './routes/ordenes.js';
import authRoutes from './routes/auth.js';
import notificacionesRoutes from './routes/notificaciones.js';
import { initDatabase } from './db/database.js';
import { actualizarTodasLasLicitaciones, buscarNuevasOCDelDia } from './services/mercadoPublico.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/licitaciones', licitacionesRoutes);
app.use('/api/ordenes', ordenesRoutes);
app.use('/api/notificaciones', notificacionesRoutes);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Tarea programada: Actualización de licitaciones a las 18:00 hrs
cron.schedule('0 18 * * *', async () => {
  console.log('[CRON] Ejecutando actualización automática a las 18:00 hrs');
  try {
    await actualizarTodasLasLicitaciones();
    console.log('[CRON] Actualización completada exitosamente');
  } catch (error) {
    console.error('[CRON] Error en actualización automática:', error);
  }
}, {
  timezone: 'America/Santiago'
});

// Tarea programada: Buscar nuevas OC a la 01:00 hrs (del día anterior)
cron.schedule('0 1 * * *', async () => {
  console.log('[CRON-OC] Ejecutando búsqueda automática de nuevas OC a la 01:00 hrs');
  try {
    const nuevasOC = await buscarNuevasOCDelDia();
    console.log(`[CRON-OC] Búsqueda completada. Nuevas OC encontradas: ${nuevasOC.length}`);
  } catch (error) {
    console.error('[CRON-OC] Error en búsqueda automática de OC:', error);
  }
}, {
  timezone: 'America/Santiago'
});

// Endpoint público para exportar todas las OC (para sincronización entre entornos)
app.get('/api/exportar-oc', async (req, res) => {
  try {
    const { obtenerTodasLasOC } = await import('./db/database.js');
    const ordenes = await obtenerTodasLasOC();
    res.json({ success: true, ordenes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para importar una OC individual (desde la nube)
app.post('/api/ordenes/importar', async (req, res) => {
  try {
    const { guardarOrdenCompra, verificarOCExiste } = await import('./db/database.js');
    const orden = req.body;
    
    // Verificar si ya existe
    const existe = await verificarOCExiste(orden.codigo);
    if (existe) {
      return res.json({ success: true, nueva: false, mensaje: 'OC ya existe' });
    }
    
    // Guardar la OC
    await guardarOrdenCompra(orden);
    res.json({ success: true, nueva: true, mensaje: 'OC importada' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para probar la búsqueda de nuevas OC manualmente
app.get('/api/test/buscar-oc-ayer', async (req, res) => {
  try {
    console.log('[TEST] Ejecutando búsqueda manual de OC del día anterior...');
    const nuevasOC = await buscarNuevasOCDelDia();
    res.json({ 
      success: true, 
      message: `Búsqueda completada. ${nuevasOC.length} OC encontradas.`,
      ordenes: nuevasOC 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para probar con una fecha específica
app.get('/api/test/buscar-oc/:fecha', async (req, res) => {
  try {
    const { fecha } = req.params; // Formato: DDMMAAAA
    const dia = parseInt(fecha.substring(0, 2));
    const mes = parseInt(fecha.substring(2, 4)) - 1;
    const anio = parseInt(fecha.substring(4, 8));
    const fechaObj = new Date(anio, mes, dia);
    
    console.log(`[TEST] Ejecutando búsqueda manual de OC del ${fecha}...`);
    const nuevasOC = await buscarNuevasOCDelDia(fechaObj);
    res.json({ 
      success: true, 
      message: `Búsqueda completada. ${nuevasOC.length} OC encontradas para ${fecha}.`,
      ordenes: nuevasOC 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

async function startServer() {
  await initDatabase();
  
  app.listen(PORT, () => {
    const ahora = new Date();
    const horaChile = ahora.toLocaleString('es-CL', { timeZone: 'America/Santiago' });
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Hora de inicio (Chile): ${horaChile}`);
    console.log(`Actualización automática de licitaciones: 18:00 hrs (Chile)`);
    console.log(`Búsqueda automática de nuevas OC: 01:00 hrs (Chile)`);
    
    // Log para verificar próximas ejecuciones del CRON
    console.log(`[CRON] Próximas ejecuciones programadas - verificar que el servidor no se reinicie`);
  });
}

startServer().catch(console.error);
