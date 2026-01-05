import express from 'express';
import jwt from 'jsonwebtoken';
import {
  crearUsuario,
  autenticarUsuario,
  obtenerUsuarioPorId,
  cambiarPassword,
  eliminarUsuario
} from '../db/database.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'seguimiento-licitaciones-secret-key-2024';

// Middleware para verificar token
export function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Registro de usuario
router.post('/registro', async (req, res) => {
  try {
    const { email, password, nombre } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    
    const usuario = await crearUsuario(email, password, nombre || '');
    const token = jwt.sign({ userId: usuario.id }, JWT_SECRET, { expiresIn: '30d' });
    
    res.json({
      message: 'Usuario creado correctamente',
      token,
      usuario
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    
    const usuario = await autenticarUsuario(email, password);
    const token = jwt.sign({ userId: usuario.id }, JWT_SECRET, { expiresIn: '30d' });
    
    res.json({
      message: 'Login exitoso',
      token,
      usuario
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Obtener usuario actual
router.get('/me', verificarToken, async (req, res) => {
  try {
    const usuario = await obtenerUsuarioPorId(req.userId);
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cambiar contraseña
router.post('/cambiar-password', verificarToken, async (req, res) => {
  try {
    const { passwordActual, passwordNuevo } = req.body;
    
    if (!passwordActual || !passwordNuevo) {
      return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
    }
    
    if (passwordNuevo.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }
    
    await cambiarPassword(req.userId, passwordActual, passwordNuevo);
    
    res.json({ message: 'Contraseña cambiada correctamente' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Eliminar cuenta
router.delete('/eliminar-cuenta', verificarToken, async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Contraseña requerida para eliminar cuenta' });
    }
    
    await eliminarUsuario(req.userId, password);
    
    res.json({ message: 'Cuenta eliminada correctamente' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
