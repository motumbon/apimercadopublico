import express from 'express';
import { verificarToken } from './auth.js';
import { guardarPushToken, eliminarPushToken } from '../db/database.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Registrar token push
router.post('/register', async (req, res) => {
  try {
    const { token, platform } = req.body;
    
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token requerido' });
    }
    
    await guardarPushToken(req.userId, token, platform || 'android');
    console.log(`[PUSH] Token registrado para usuario ${req.userId}`);
    
    res.json({ success: true, message: 'Token registrado correctamente' });
  } catch (error) {
    console.error('[PUSH] Error registrando token:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Eliminar token push
router.delete('/unregister', async (req, res) => {
  try {
    await eliminarPushToken(req.userId);
    console.log(`[PUSH] Token eliminado para usuario ${req.userId}`);
    
    res.json({ success: true, message: 'Token eliminado correctamente' });
  } catch (error) {
    console.error('[PUSH] Error eliminando token:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
