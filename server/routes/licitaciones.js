import express from 'express';
import { 
  buscarLicitacion, 
  agregarYGuardarLicitacionConUsuario,
  actualizarLicitacion,
  agregarOrdenesPorCodigos 
} from '../services/mercadoPublico.js';
import { scrapeOrdenesManual } from '../services/scraperManual.js';
import { verificarToken } from './auth.js';
import { 
  obtenerLicitaciones, 
  obtenerLicitacionPorCodigo,
  eliminarLicitacion,
  obtenerOrdenesDeCompra,
  obtenerEstadisticas,
  obtenerInstituciones,
  crearInstitucion,
  eliminarInstitucion,
  obtenerLicitacionesPorInstitucion,
  actualizarLicitacionInstitucion,
  actualizarDatosLicitacion,
  obtenerMontoOCLicitacion,
  LINEAS
} from '../db/database.js';

const router = express.Router();

// Todas las rutas de licitaciones requieren autenticación
router.use(verificarToken);

router.get('/', async (req, res) => {
  try {
    const licitaciones = await obtenerLicitaciones(req.userId);
    res.json({ success: true, data: licitaciones });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/estadisticas', async (req, res) => {
  try {
    const stats = await obtenerEstadisticas();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/buscar/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const licitacion = await buscarLicitacion(codigo);
    
    if (!licitacion) {
      return res.status(404).json({ success: false, error: 'Licitación no encontrada' });
    }
    
    res.json({ success: true, data: licitacion });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/agregar', async (req, res) => {
  try {
    const { codigo, rutProveedor } = req.body;
    
    if (!codigo) {
      return res.status(400).json({ success: false, error: 'Código de licitación requerido' });
    }
    
    const resultado = await agregarYGuardarLicitacionConUsuario(codigo, req.userId, rutProveedor || null);
    res.json({ 
      success: true, 
      data: resultado,
      message: `Licitación agregada con ${resultado.ordenes.length} órdenes de compra`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const licitacion = await obtenerLicitacionPorCodigo(codigo, req.userId);
    
    if (!licitacion) {
      return res.status(404).json({ success: false, error: 'Licitación no encontrada en almacenamiento local' });
    }
    
    const ordenes = await obtenerOrdenesDeCompra(codigo);
    
    res.json({ 
      success: true, 
      data: { 
        licitacion, 
        ordenes 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:codigo/actualizar', async (req, res) => {
  try {
    const { codigo } = req.params;
    const resultado = await actualizarLicitacion(codigo);
    
    res.json({ 
      success: true, 
      data: resultado,
      message: 'Licitación actualizada correctamente'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/actualizar-todas', async (req, res) => {
  try {
    const resultados = await actualizarTodasLasLicitaciones();
    
    const exitosas = resultados.filter(r => r.exito).length;
    const fallidas = resultados.filter(r => !r.exito).length;
    
    res.json({ 
      success: true, 
      data: resultados,
      message: `Actualización completada: ${exitosas} exitosas, ${fallidas} fallidas`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    await eliminarLicitacion(codigo, req.userId);
    
    res.json({ success: true, message: 'Licitación eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Detectar OC automáticamente usando web scraping
router.post('/:codigo/detectar-oc', async (req, res) => {
  try {
    const { codigo } = req.params;
    
    // Verificar que la licitación existe
    const licitacion = await obtenerLicitacionPorCodigo(codigo, req.userId);
    if (!licitacion) {
      return res.status(404).json({ success: false, error: 'Licitación no encontrada' });
    }
    
    console.log(`[API] Detectando OC automáticamente para ${codigo}...`);
    
    // Verificar si estamos en producción (Railway)
    const isProduction = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';
    const hasBrowserless = !!process.env.BROWSERLESS_API_KEY;
    
    let codigosOC = [];
    
    if (isProduction && !hasBrowserless) {
      // En producción sin Browserless, no está disponible
      return res.status(400).json({ 
        success: false, 
        error: 'La detección automática requiere configurar BROWSERLESS_API_KEY. Por favor, agrega las OC manualmente o configura Browserless.io'
      });
    }
    
    if (isProduction && hasBrowserless) {
      // Usar scraper en la nube
      const { scrapeOrdenesCloud } = await import('../services/scraperCloud.js');
      codigosOC = await scrapeOrdenesCloud(codigo);
    } else {
      // Ejecutar scraper local con navegación manual (60 segundos)
      codigosOC = await scrapeOrdenesManual(codigo, 60000);
    }
    
    if (codigosOC.length === 0) {
      return res.json({ 
        success: true, 
        data: [],
        message: 'No se encontraron órdenes de compra asociadas'
      });
    }
    
    console.log(`[API] ${codigosOC.length} OC detectadas, obteniendo detalles...`);
    
    // Obtener detalles de cada OC usando la API
    const ordenes = await agregarOrdenesPorCodigos(codigosOC, codigo);
    
    // Guardar en la base de datos
    const { guardarOrdenCompra } = await import('../db/database.js');
    for (const orden of ordenes) {
      await guardarOrdenCompra(orden);
    }
    
    res.json({ 
      success: true, 
      data: ordenes,
      message: `${ordenes.length} órdenes de compra detectadas y agregadas automáticamente`
    });
  } catch (error) {
    console.error('[API] Error en detección automática:', error);
    
    // Mensaje más amigable si es error de Playwright
    if (error.message && error.message.includes('Executable doesn\'t exist')) {
      return res.status(400).json({ 
        success: false, 
        error: 'La detección automática no está disponible. Por favor, agrega las OC manualmente.'
      });
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// Agregar OC por códigos específicos a una licitación
router.post('/:codigo/ordenes', async (req, res) => {
  try {
    const { codigo } = req.params;
    const { codigosOC } = req.body;
    
    if (!codigosOC || !Array.isArray(codigosOC) || codigosOC.length === 0) {
      return res.status(400).json({ success: false, error: 'Se requiere un array de códigos de OC' });
    }
    
    // Verificar que la licitación existe
    const licitacion = await obtenerLicitacionPorCodigo(codigo, req.userId);
    if (!licitacion) {
      return res.status(404).json({ success: false, error: 'Licitación no encontrada' });
    }
    
    // Agregar las OC
    const ordenes = await agregarOrdenesPorCodigos(codigosOC, codigo);
    
    // Guardar en la base de datos
    const { guardarOrdenCompra } = await import('../db/database.js');
    for (const orden of ordenes) {
      await guardarOrdenCompra(orden);
    }
    
    res.json({ 
      success: true, 
      data: ordenes,
      message: `${ordenes.length} órdenes de compra agregadas correctamente`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== INSTITUCIONES ==========

router.get('/instituciones/lista', async (req, res) => {
  try {
    const instituciones = await obtenerInstituciones();
    res.json({ success: true, data: instituciones });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/instituciones/lineas', async (req, res) => {
  res.json({ success: true, data: LINEAS });
});

router.post('/instituciones/crear', async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) {
      return res.status(400).json({ success: false, error: 'Nombre requerido' });
    }
    const institucion = await crearInstitucion(nombre);
    res.json({ success: true, data: institucion, message: 'Institución creada correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/instituciones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await eliminarInstitucion(id);
    res.json({ success: true, message: 'Institución eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/instituciones/:id/licitaciones', async (req, res) => {
  try {
    const { id } = req.params;
    const licitaciones = await obtenerLicitacionesPorInstitucion(id, req.userId);
    res.json({ success: true, data: licitaciones });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== ACTUALIZAR LICITACIÓN ==========

router.put('/:codigo/asignar', async (req, res) => {
  try {
    const { codigo } = req.params;
    const { institucionId, linea } = req.body;
    await actualizarLicitacionInstitucion(codigo, institucionId, linea, req.userId);
    res.json({ success: true, message: 'Licitación asignada correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:codigo/datos', async (req, res) => {
  try {
    const { codigo } = req.params;
    const { montoTotalLicitacion, fechaVencimiento } = req.body;
    await actualizarDatosLicitacion(codigo, montoTotalLicitacion, fechaVencimiento, req.userId);
    res.json({ success: true, message: 'Datos actualizados correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:codigo/saldo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const licitacion = await obtenerLicitacionPorCodigo(codigo, req.userId);
    const montoOC = await obtenerMontoOCLicitacion(codigo);
    const saldo = (licitacion?.monto_total_licitacion || 0) - montoOC;
    res.json({ 
      success: true, 
      data: { 
        montoTotalLicitacion: licitacion?.monto_total_licitacion || 0,
        montoOC,
        saldo 
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
