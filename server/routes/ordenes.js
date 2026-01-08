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

// Obtener items/productos de una OC (solo de BD, sin llamar a API)
router.get('/:codigo/items', async (req, res) => {
  try {
    const { codigo } = req.params;
    const items = await obtenerItemsOC(codigo);
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Actualizar items de una OC desde la API
router.post('/:codigo/actualizar-items', async (req, res) => {
  try {
    const { codigo } = req.params;
    console.log('[API] Actualizando items de OC:', codigo);
    
    const orden = await buscarOrdenCompra(codigo);
    if (!orden) {
      return res.status(404).json({ success: false, error: 'OC no encontrada en Mercado Público' });
    }
    
    if (orden.Items?.Listado && orden.Items.Listado.length > 0) {
      await guardarItemsOC(codigo, orden.Items.Listado);
      const items = await obtenerItemsOC(codigo);
      console.log(`[API] Items actualizados para OC ${codigo}: ${items.length} items`);
      res.json({ success: true, items, mensaje: `${items.length} items actualizados` });
    } else {
      res.json({ success: true, items: [], mensaje: 'No se encontraron items para esta OC' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
