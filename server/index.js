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
import { initDatabase } from './db/database.js';
import { actualizarTodasLasLicitaciones } from './services/mercadoPublico.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/licitaciones', licitacionesRoutes);
app.use('/api/ordenes', ordenesRoutes);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

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

async function startServer() {
  await initDatabase();
  
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Actualización automática programada para las 18:00 hrs (Chile)`);
  });
}

startServer().catch(console.error);
