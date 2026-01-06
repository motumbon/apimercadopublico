import express from 'express';
import {
  obtenerNotificaciones,
  contarNotificacionesNoLeidas,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  eliminarNotificacion,
  eliminarTodasNotificaciones
} from '../db/database.js';

const router = express.Router();

// Obtener todas las notificaciones
router.get('/', async (req, res) => {
  try {
    const soloNoLeidas = req.query.noLeidas === 'true';
    const notificaciones = await obtenerNotificaciones(soloNoLeidas);
    res.json({ success: true, notificaciones });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener contador de notificaciones no leídas
router.get('/contador', async (req, res) => {
  try {
    const count = await contarNotificacionesNoLeidas();
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Marcar una notificación como leída
router.put('/:id/leida', async (req, res) => {
  try {
    await marcarNotificacionLeida(req.params.id);
    res.json({ success: true, message: 'Notificación marcada como leída' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Marcar todas como leídas
router.put('/marcar-todas-leidas', async (req, res) => {
  try {
    await marcarTodasLeidas();
    res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Eliminar una notificación
router.delete('/:id', async (req, res) => {
  try {
    await eliminarNotificacion(req.params.id);
    res.json({ success: true, message: 'Notificación eliminada' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Eliminar todas las notificaciones
router.delete('/', async (req, res) => {
  try {
    await eliminarTodasNotificaciones();
    res.json({ success: true, message: 'Todas las notificaciones eliminadas' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
