import express from 'express';
import { buscarOrdenCompra } from '../services/mercadoPublico.js';
import { obtenerOrdenesDeCompra } from '../db/database.js';

const router = express.Router();

router.get('/licitacion/:codigoLicitacion', async (req, res) => {
  try {
    const { codigoLicitacion } = req.params;
    const ordenes = await obtenerOrdenesDeCompra(codigoLicitacion);
    
    const montoTotal = ordenes.reduce((sum, o) => sum + (o.monto || 0), 0);
    
    res.json({ 
      success: true, 
      data: {
        ordenes,
        cantidad: ordenes.length,
        montoTotal
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/buscar/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const orden = await buscarOrdenCompra(codigo);
    
    if (!orden) {
      return res.status(404).json({ success: false, error: 'Orden de compra no encontrada' });
    }
    
    res.json({ success: true, data: orden });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
