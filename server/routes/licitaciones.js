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
    
    let ordenes = [];
    
    if (isProduction) {
      // En producción: usar detección por API
      console.log('[API] Modo producción: usando detección por API');
      const { detectarOCAutomaticamente } = await import('../services/mercadoPublico.js');
      ordenes = await detectarOCAutomaticamente(codigo);
    } else {
      // En local: usar scraper con ventana visible para navegación manual
      console.log('[API] Modo local: abriendo navegador para navegación manual');
      const codigosOC = await scrapeOrdenesManual(codigo, 120000); // 2 minutos
      
      if (codigosOC.length > 0) {
        // Obtener detalles de cada OC usando la API
        ordenes = await agregarOrdenesPorCodigos(codigosOC, codigo);
      }
    }
    
    if (ordenes.length === 0) {
      return res.json({ 
        success: true, 
        data: [],
        message: isProduction 
          ? 'No se encontraron OC automáticamente. Puedes agregarlas manualmente si conoces los códigos.'
          : 'No se detectaron OC. Asegúrate de navegar a la sección "Órdenes de Compra" en la ventana del navegador.'
      });
    }
    
    console.log(`[API] ${ordenes.length} OC detectadas, guardando...`);
    
    // Guardar en la base de datos
    const { guardarOrdenCompra } = await import('../db/database.js');
    for (const orden of ordenes) {
      await guardarOrdenCompra(orden);
    }
    
    res.json({ 
      success: true, 
      data: ordenes,
      message: `${ordenes.length} órdenes de compra detectadas y agregadas`
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

// ========== SINCRONIZACIÓN LOCAL -> RAILWAY ==========

// Exportar todos los datos del usuario (para enviar a Railway)
router.get('/sync/exportar', async (req, res) => {
  try {
    const licitaciones = await obtenerLicitaciones(req.userId);
    const datos = [];
    
    for (const lic of licitaciones) {
      const ordenes = await obtenerOrdenesDeCompra(lic.codigo);
      datos.push({
        licitacion: lic,
        ordenes: ordenes
      });
    }
    
    res.json({ 
      success: true, 
      data: datos,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Importar datos desde otra instancia (recibir de local)
router.post('/sync/importar', async (req, res) => {
  try {
    const { datos } = req.body;
    
    if (!datos || !Array.isArray(datos)) {
      return res.status(400).json({ success: false, error: 'Datos inválidos' });
    }
    
    const { guardarLicitacion, guardarOrdenCompra } = await import('../db/database.js');
    
    let licitacionesImportadas = 0;
    let ordenesImportadas = 0;
    
    for (const item of datos) {
      const { licitacion, ordenes } = item;
      
      if (licitacion) {
        await guardarLicitacion({
          codigo: licitacion.codigo,
          nombre: licitacion.nombre,
          estado: licitacion.estado,
          estado_codigo: licitacion.estado_codigo,
          fecha_cierre: licitacion.fecha_cierre,
          organismo: licitacion.organismo,
          monto_estimado: licitacion.monto_estimado
        }, req.userId);
        licitacionesImportadas++;
        
        // Actualizar datos adicionales si existen
        if (licitacion.institucion_id || licitacion.linea || licitacion.monto_total_licitacion) {
          await actualizarLicitacionInstitucion(licitacion.codigo, licitacion.institucion_id, licitacion.linea, req.userId);
          await actualizarDatosLicitacion(licitacion.codigo, licitacion.monto_total_licitacion, licitacion.fecha_vencimiento, req.userId);
        }
      }
      
      if (ordenes && Array.isArray(ordenes)) {
        for (const orden of ordenes) {
          await guardarOrdenCompra({
            ...orden,
            licitacion_codigo: licitacion.codigo
          });
          ordenesImportadas++;
        }
      }
    }
    
    res.json({ 
      success: true, 
      message: `Importadas ${licitacionesImportadas} licitaciones y ${ordenesImportadas} órdenes de compra`
    });
  } catch (error) {
    console.error('[SYNC] Error importando:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
