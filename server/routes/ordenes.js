import express from 'express';
import { buscarOrdenCompra } from '../services/mercadoPublico.js';
import { obtenerOrdenesDeCompra, obtenerItemsOC, guardarItemsOC } from '../db/database.js';

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

// Obtener items/productos de una OC
router.get('/:codigo/items', async (req, res) => {
  try {
    const { codigo } = req.params;
    
    // Primero intentar obtener de la BD
    let items = await obtenerItemsOC(codigo);
    
    // Si no hay items en BD, obtener de la API y guardar
    if (items.length === 0) {
      const orden = await buscarOrdenCompra(codigo);
      if (orden && orden.Items?.Listado) {
        await guardarItemsOC(codigo, orden.Items.Listado);
        items = await obtenerItemsOC(codigo);
      }
    }
    
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
