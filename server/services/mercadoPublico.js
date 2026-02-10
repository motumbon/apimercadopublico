import axios from 'axios';
import { 
  guardarLicitacion, 
  guardarOrdenCompra, 
  obtenerTodasLasLicitaciones,
  actualizarLicitacionSinUsuario,
  crearNotificacion,
  verificarOCExiste,
  guardarItemsOC
} from '../db/database.js';

const API_BASE = 'https://api.mercadopublico.cl/servicios/v1/publico';
const TICKET = process.env.MERCADO_PUBLICO_TICKET || '94B7FE59-0486-4981-9592-0D23F0939246';

console.log('[CONFIG] Ticket API:', TICKET.substring(0, 8) + '...');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Cliente axios con timeout moderado
const apiClient = axios.create({
  timeout: 45000, // 45 segundos
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

async function httpsGet(url, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[API] Conectando... (intento ${attempt})`);
      
      const response = await apiClient.get(url);
      const data = response.data;
      
      if (data.Codigo === 10500) {
        throw { rateLimited: true, message: data.Mensaje };
      }
      
      console.log(`[API] Respuesta recibida OK`);
      return data;
    } catch (error) {
      const statusCode = error.response?.status;
      const errorMsg = error.response?.data?.message || error.message || 'Error desconocido';
      console.log(`[API] Error intento ${attempt}: ${statusCode || ''} ${errorMsg}`);
      
      if (error.rateLimited && attempt < retries) {
        console.log(`[API] Rate limited, esperando ${attempt * 5} segundos...`);
        await sleep(attempt * 5000);
        continue;
      }
      
      // Error 503: servicio no disponible temporalmente - esperar más tiempo
      if (statusCode === 503 && attempt < retries) {
        const waitTime = attempt * 10000; // 10s, 20s, 30s, 40s
        console.log(`[API] Servicio no disponible (503), esperando ${waitTime/1000}s...`);
        await sleep(waitTime);
        continue;
      }
      
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        if (attempt < retries) {
          console.log(`[API] Timeout, reintentando en 5s...`);
          await sleep(5000);
          continue;
        }
        throw new Error('La API de Mercado Público no responde. Intenta de nuevo en unos minutos.');
      }
      
      if (attempt < retries) {
        await sleep(3000);
        continue;
      }
      
      if (statusCode === 503) {
        throw new Error('La API de Mercado Público no está disponible en este momento (503). Intenta de nuevo más tarde.');
      }
      
      throw new Error(errorMsg);
    }
  }
}

const ESTADOS_LICITACION = {
  5: 'Publicada',
  6: 'Cerrada',
  7: 'Desierta',
  8: 'Adjudicada',
  18: 'Revocada',
  19: 'Suspendida'
};

const ESTADOS_ORDEN = {
  4: 'Enviada a Proveedor',
  5: 'En proceso',
  6: 'Aceptada',
  9: 'Cancelada',
  12: 'Recepción Conforme',
  13: 'Pendiente de Recepcionar',
  14: 'Recepcionada Parcialmente',
  15: 'Recepción Conforme Incompleta'
};

export async function buscarLicitacion(codigo) {
  try {
    const url = `${API_BASE}/licitaciones.json?codigo=${encodeURIComponent(codigo)}&ticket=${TICKET}`;
    console.log('[API] Buscando licitación:', codigo);
    
    const data = await httpsGet(url);
    
    if (!data.Listado || data.Listado.length === 0) {
      return null;
    }
    
    const licitacion = data.Listado[0];
    
    return {
      codigo: licitacion.CodigoExterno,
      nombre: licitacion.Nombre,
      estado: ESTADOS_LICITACION[licitacion.CodigoEstado] || licitacion.Estado || 'Desconocido',
      estado_codigo: licitacion.CodigoEstado,
      fecha_cierre: licitacion.Fechas?.FechaCierre || licitacion.FechaCierre || null,
      organismo: licitacion.Comprador?.NombreOrganismo || licitacion.NombreOrganismo || '',
      monto_estimado: licitacion.MontoEstimado || 0,
      adjudicaciones: licitacion.Items?.Listado || [],
      adjudicacion_info: licitacion.Adjudicacion || null,
      Items: licitacion.Items || null
    };
  } catch (error) {
    console.error('Error buscando licitación:', error.message);
    throw new Error(error.response?.data?.message || error.message || 'Error al buscar licitación');
  }
}

export async function buscarOrdenCompra(codigo) {
  try {
    const url = `${API_BASE}/ordenesdecompra.json?codigo=${encodeURIComponent(codigo)}&ticket=${TICKET}`;
    console.log('[API] Buscando orden de compra:', codigo);
    
    const data = await httpsGet(url);
    
    if (!data.Listado || data.Listado.length === 0) {
      return null;
    }
    
    const orden = data.Listado[0];
    
    return {
      codigo: orden.Codigo,
      nombre: orden.Nombre,
      estado: ESTADOS_ORDEN[orden.CodigoEstado] || orden.Estado || 'Desconocido',
      estado_codigo: orden.CodigoEstado,
      proveedor: orden.Proveedor?.Nombre || '',
      proveedor_rut: orden.Proveedor?.RutProveedor || '',
      monto: orden.Total || 0,
      moneda: orden.TipoMoneda || 'CLP',
      fecha_envio: orden.Fechas?.FechaEnvio || orden.FechaEnvio || '',
      fecha_aceptacion: orden.Fechas?.FechaAceptacion || orden.FechaAceptacion || '',
      licitacion_codigo: orden.CodigoLicitacion || orden.Licitacion || '',
      Items: orden.Items || null
    };
  } catch (error) {
    console.error('Error buscando orden de compra:', error.message);
    throw new Error(error.response?.data?.message || error.message || 'Error al buscar orden de compra');
  }
}

export async function buscarOrdenesDeCompraPorLicitacion(codigoLicitacion, rutProveedor = null) {
  // La API no permite buscar OC por licitación directamente
  // Las OC deben agregarse manualmente por código
  console.log(`[API] Para agregar OC, use la función agregarOrdenCompra con el código específico`);
  return [];
}

/**
 * Detectar OC automáticamente buscando por proveedores específicos y filtrando por licitación
 * Proveedores: Therapía iv (66973) y Fresenius Kabi Chile Ltda. (44105)
 */
export async function detectarOCAutomaticamente(codigoLicitacion) {
  console.log(`[API] Detectando OC para licitación ${codigoLicitacion}`);
  
  const ordenesEncontradas = [];
  
  // Proveedores a buscar
  const proveedores = [
    { codigo: '66973', nombre: 'Therapía iv' },
    { codigo: '44105', nombre: 'Fresenius Kabi Chile Ltda.' }
  ];
  
  // Buscar solo en los últimos 6 meses para reducir llamadas
  const hoy = new Date();
  const fechasABuscar = [];
  
  for (let i = 0; i < 6; i++) {
    const fecha = new Date(hoy);
    fecha.setMonth(fecha.getMonth() - i);
    // Solo buscar el día 1 y 15 de cada mes
    fechasABuscar.push(new Date(fecha.getFullYear(), fecha.getMonth(), 1));
    fechasABuscar.push(new Date(fecha.getFullYear(), fecha.getMonth(), 15));
  }
  
  console.log(`[API] Buscando OC de proveedores: ${proveedores.map(p => p.nombre).join(', ')}`);
  console.log(`[API] Filtrando por licitación: ${codigoLicitacion}`);
  console.log(`[API] Revisando ${fechasABuscar.length} fechas por proveedor...`);
  
  for (const proveedor of proveedores) {
    console.log(`[API] Proveedor: ${proveedor.nombre} (${proveedor.codigo})`);
    
    for (const fecha of fechasABuscar) {
      // Formato ddmmaaaa
      const fechaStr = `${fecha.getDate().toString().padStart(2, '0')}${(fecha.getMonth() + 1).toString().padStart(2, '0')}${fecha.getFullYear()}`;
      
      try {
        // Pausa ANTES de cada llamada para evitar rate limit
        await sleep(1000);
        
        const url = `${API_BASE}/ordenesdecompra.json?fecha=${fechaStr}&CodigoProveedor=${proveedor.codigo}&ticket=${TICKET}`;
        console.log(`[API] Buscando fecha ${fechaStr}...`);
        
        const data = await httpsGet(url);
        
        if (data.Listado && data.Listado.length > 0) {
          console.log(`[API] ${data.Listado.length} OC encontradas en ${fechaStr}`);
          
          for (const orden of data.Listado) {
            const codigoOC = orden.Codigo || '';
            const licitacionOC = orden.Licitacion || '';
            
            // Filtrar SOLO por licitación exacta
            if (licitacionOC === codigoLicitacion) {
              // Evitar duplicados
              if (!ordenesEncontradas.find(o => o.codigo === codigoOC)) {
                await sleep(500); // Pausa antes de obtener detalle
                
                try {
                  const detalleUrl = `${API_BASE}/ordenesdecompra.json?codigo=${encodeURIComponent(codigoOC)}&ticket=${TICKET}`;
                  const detalleData = await httpsGet(detalleUrl);
                  
                  if (detalleData.Listado && detalleData.Listado.length > 0) {
                    const detalle = detalleData.Listado[0];
                    ordenesEncontradas.push({
                      codigo: detalle.Codigo,
                      nombre: detalle.Nombre,
                      estado: ESTADOS_ORDEN[detalle.CodigoEstado] || detalle.Estado || 'Desconocido',
                      estado_codigo: detalle.CodigoEstado,
                      proveedor: detalle.Proveedor?.Nombre || proveedor.nombre,
                      proveedor_rut: detalle.Proveedor?.RutProveedor || '',
                      monto: detalle.Total || 0,
                      moneda: detalle.TipoMoneda || 'CLP',
                      fecha_envio: detalle.Fechas?.FechaEnvio || '',
                      fecha_aceptacion: detalle.Fechas?.FechaAceptacion || '',
                      licitacion_codigo: detalle.Licitacion || codigoLicitacion
                    });
                    console.log(`[API] ✓ OC encontrada: ${codigoOC} (${proveedor.nombre})`);
                  }
                } catch (e) {
                  console.log(`[API] Error obteniendo detalle de ${codigoOC}: ${e.message}`);
                }
              }
            }
          }
        }
        
      } catch (error) {
        console.log(`[API] Error en fecha ${fechaStr}: ${error.message}`);
        // Si hay rate limit, esperar más tiempo
        if (error.message?.includes('simultáneas') || error.message?.includes('rate') || error.message?.includes('10500')) {
          console.log('[API] Rate limited, esperando 10s...');
          await sleep(10000);
        }
      }
    }
  }
  
  console.log(`[API] Total OC detectadas: ${ordenesEncontradas.length}`);
  return ordenesEncontradas;
}

// Buscar una OC específica por código
export async function buscarOrdenPorCodigo(codigoOC) {
  try {
    console.log(`[API] Buscando OC: ${codigoOC}`);
    const url = `${API_BASE}/ordenesdecompra.json?codigo=${encodeURIComponent(codigoOC)}&ticket=${TICKET}`;
    const data = await httpsGet(url);
    
    if (data.Listado && data.Listado.length > 0) {
      const orden = data.Listado[0];
      return {
        codigo: orden.Codigo,
        nombre: orden.Nombre || `OC ${orden.Codigo}`,
        estado: ESTADOS_ORDEN[orden.CodigoEstado] || orden.Estado || 'Desconocido',
        estado_codigo: orden.CodigoEstado,
        proveedor: orden.Proveedor?.Nombre || '',
        proveedor_rut: orden.Proveedor?.RutSucursal || orden.Proveedor?.RutProveedor || '',
        monto: orden.Total || 0,
        moneda: orden.TipoMoneda || 'CLP',
        fecha_envio: orden.Fechas?.FechaEnvio || '',
        fecha_aceptacion: orden.Fechas?.FechaAceptacion || '',
        licitacion_codigo: orden.CodigoLicitacion || ''
      };
    }
    return null;
  } catch (error) {
    console.error(`Error buscando OC ${codigoOC}:`, error.message);
    return null;
  }
}

// Agregar múltiples OC por sus códigos
export async function agregarOrdenesPorCodigos(codigos, codigoLicitacion) {
  const ordenes = [];
  
  for (const codigo of codigos) {
    try {
      const orden = await buscarOrdenPorCodigo(codigo);
      if (orden) {
        orden.licitacion_codigo = codigoLicitacion;
        ordenes.push(orden);
        console.log(`[API] ✓ ${codigo}: $${orden.monto.toLocaleString('es-CL')}`);
      }
      await sleep(300); // Pausa entre requests
    } catch (err) {
      console.log(`[API] ✗ Error en ${codigo}: ${err.message}`);
    }
  }
  
  return ordenes;
}

function extraerCodigosOC(item) {
  const codigos = [];
  
  if (item.Adjudicacion) {
    if (Array.isArray(item.Adjudicacion)) {
      for (const adj of item.Adjudicacion) {
        if (adj.CodigoOC) codigos.push(adj.CodigoOC);
        if (adj.CodigoOrdenCompra) codigos.push(adj.CodigoOrdenCompra);
      }
    } else if (item.Adjudicacion.CodigoOC) {
      codigos.push(item.Adjudicacion.CodigoOC);
    } else if (item.Adjudicacion.CodigoOrdenCompra) {
      codigos.push(item.Adjudicacion.CodigoOrdenCompra);
    }
  }
  
  return [...new Set(codigos)];
}

export async function agregarYGuardarLicitacion(codigo, rutProveedor = null) {
  const licitacion = await buscarLicitacion(codigo);
  
  if (!licitacion) {
    throw new Error('Licitación no encontrada');
  }
  
  // Actualizar solo los datos de la licitación (sin cambiar user_id)
  await actualizarLicitacionSinUsuario({
    codigo: licitacion.codigo,
    nombre: licitacion.nombre,
    estado: licitacion.estado,
    estado_codigo: licitacion.estado_codigo,
    fecha_cierre: licitacion.fecha_cierre,
    organismo: licitacion.organismo,
    monto_estimado: licitacion.monto_estimado
  });
  
  const ordenes = await buscarOrdenesDeCompraPorLicitacion(codigo, rutProveedor);
  
  for (const orden of ordenes) {
    await guardarOrdenCompra(orden);
  }
  
  return {
    licitacion,
    ordenes
  };
}

export async function agregarYGuardarLicitacionConUsuario(codigo, userId, rutProveedor = null) {
  const licitacion = await buscarLicitacion(codigo);
  
  if (!licitacion) {
    throw new Error('Licitación no encontrada');
  }
  
  await guardarLicitacion({
    codigo: licitacion.codigo,
    nombre: licitacion.nombre,
    estado: licitacion.estado,
    estado_codigo: licitacion.estado_codigo,
    fecha_cierre: licitacion.fecha_cierre,
    organismo: licitacion.organismo,
    monto_estimado: licitacion.monto_estimado,
    rut_proveedor: rutProveedor
  }, userId);
  
  const ordenes = await buscarOrdenesDeCompraPorLicitacion(codigo, rutProveedor);
  
  for (const orden of ordenes) {
    await guardarOrdenCompra(orden);
  }
  
  return {
    licitacion,
    ordenes
  };
}

export async function actualizarLicitacion(codigo) {
  return await agregarYGuardarLicitacion(codigo);
}

export async function actualizarTodasLasLicitaciones() {
  const licitaciones = await obtenerTodasLasLicitaciones();
  const resultados = [];
  
  for (const lic of licitaciones) {
    try {
      const resultado = await actualizarLicitacion(lic.codigo);
      resultados.push({
        codigo: lic.codigo,
        exito: true,
        ordenesNuevas: resultado.ordenes.length
      });
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      resultados.push({
        codigo: lic.codigo,
        exito: false,
        error: error.message
      });
    }
  }
  
  return resultados;
}

/**
 * Buscar OC recientes por FECHA de Therapía iv y Fresenius Kabi
 * Busca los últimos 3 días para no perder OC
 * Filtra las que pertenecen a licitaciones guardadas y no están ya en la BD
 */
export async function buscarNuevasOCDelDia() {
  console.log(`[AUTO-OC] Buscando OC por fecha...`);
  
  // Proveedores a buscar
  const proveedores = [
    { codigo: '66973', nombre: 'Therapía iv' },
    { codigo: '44105', nombre: 'Fresenius Kabi Chile Ltda.' }
  ];
  
  // Obtener todas las licitaciones guardadas (de todos los usuarios)
  const licitacionesGuardadas = await obtenerTodasLasLicitaciones();
  const codigosLicitaciones = new Set(licitacionesGuardadas.map(l => l.codigo));
  
  console.log(`[AUTO-OC] Licitaciones en BD: ${codigosLicitaciones.size}`);
  if (codigosLicitaciones.size === 0) {
    console.log(`[AUTO-OC] No hay licitaciones guardadas, terminando.`);
    return [];
  }
  
  const ordenesEncontradas = [];
  const ocProcesadas = new Set();
  
  // Buscar OC de los últimos 2 días
  const fechasABuscar = [];
  for (let i = 0; i < 2; i++) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    fechasABuscar.push(`${dia}${mes}${anio}`);
  }
  
  for (const fechaStr of fechasABuscar) {
    console.log(`[AUTO-OC] Buscando OC del ${fechaStr}...`);
    
    for (const proveedor of proveedores) {
      console.log(`[AUTO-OC] Proveedor: ${proveedor.nombre}...`);
      
      try {
        await sleep(1000);
        
        const url = `${API_BASE}/ordenesdecompra.json?fecha=${fechaStr}&CodigoProveedor=${proveedor.codigo}&ticket=${TICKET}`;
        const data = await httpsGet(url);
        
        if (data.Listado && data.Listado.length > 0) {
          console.log(`[AUTO-OC] ${data.Listado.length} OC encontradas para ${proveedor.nombre} el ${fechaStr}`);
          
          for (const orden of data.Listado) {
            if (ocProcesadas.has(orden.Codigo)) continue;
            ocProcesadas.add(orden.Codigo);
            
            // Intentar extraer licitación del nombre (ej: "...ID 1979-119-LQ25...")
            let licitacionOC = '';
            const nombreOC = orden.Nombre || '';
            for (const licCodigo of codigosLicitaciones) {
              if (nombreOC.includes(licCodigo) || nombreOC.includes(licCodigo.substring(0, licCodigo.lastIndexOf('-')))) {
                licitacionOC = licCodigo;
                break;
              }
            }
            
            // Si no encontramos en el nombre, obtener detalle
            if (!licitacionOC) {
              await sleep(300);
              try {
                const detalleUrl = `${API_BASE}/ordenesdecompra.json?codigo=${encodeURIComponent(orden.Codigo)}&ticket=${TICKET}`;
                const detalleData = await httpsGet(detalleUrl);
                if (detalleData.Listado?.[0]) {
                  licitacionOC = detalleData.Listado[0].CodigoLicitacion || '';
                }
              } catch (e) {
                // Ignorar errores de detalle
              }
            }
            
            // Verificar si coincide con nuestras licitaciones
            if (codigosLicitaciones.has(licitacionOC)) {
              const yaExiste = await verificarOCExiste(orden.Codigo);
              if (yaExiste) {
                console.log(`[AUTO-OC] OC ${orden.Codigo} ya existe en BD, omitiendo`);
                continue;
              }
              
              console.log(`[AUTO-OC] ✓ OC ${orden.Codigo} coincide con licitación ${licitacionOC}`);
              
              // Obtener detalle completo para guardar
              await sleep(300);
              try {
                const detalleUrl = `${API_BASE}/ordenesdecompra.json?codigo=${encodeURIComponent(orden.Codigo)}&ticket=${TICKET}`;
                const detalleData = await httpsGet(detalleUrl);
                const detalle = detalleData.Listado?.[0] || {};
                
                const ordenFormateada = {
                  codigo: orden.Codigo,
                  nombre: detalle.Nombre || nombreOC || `OC ${orden.Codigo}`,
                  estado: ESTADOS_ORDEN[detalle.CodigoEstado] || detalle.Estado || 'Aceptada',
                  estado_codigo: detalle.CodigoEstado || 6,
                  proveedor: detalle.Proveedor?.Nombre || proveedor.nombre,
                  proveedor_rut: detalle.Proveedor?.RutProveedor || '',
                  monto: detalle.Total || 0,
                  moneda: detalle.TipoMoneda || 'CLP',
                  fecha_envio: detalle.Fechas?.FechaEnvio || '',
                  fecha_aceptacion: detalle.Fechas?.FechaAceptacion || '',
                  licitacion_codigo: licitacionOC
                };
                
                await guardarOrdenCompra(ordenFormateada);
                
                // Guardar items/productos de la OC automáticamente
                if (detalle.Items?.Listado && detalle.Items.Listado.length > 0) {
                  await guardarItemsOC(orden.Codigo, detalle.Items.Listado);
                  console.log(`[AUTO-OC] ✓ Items guardados: ${detalle.Items.Listado.length} productos`);
                }
                
                ordenesEncontradas.push(ordenFormateada);
                console.log(`[AUTO-OC] ✓ Guardada: ${orden.Codigo} - $${ordenFormateada.monto.toLocaleString('es-CL')}`);
              } catch (e) {
                console.log(`[AUTO-OC] Error guardando ${orden.Codigo}: ${e.message}`);
              }
            }
          }
        } else {
          console.log(`[AUTO-OC] No se encontraron OC para ${proveedor.nombre} el ${fechaStr}`);
        }
      } catch (error) {
        console.log(`[AUTO-OC] Error buscando OC de ${proveedor.nombre}: ${error.message}`);
        if (error.message?.includes('simultáneas') || error.message?.includes('10500')) {
          console.log('[AUTO-OC] Rate limited, esperando 10s...');
          await sleep(10000);
        }
      }
    }
  }
  
  console.log(`[AUTO-OC] Total nuevas OC encontradas y guardadas: ${ordenesEncontradas.length}`);
  
  // Crear notificaciones agrupadas por licitación
  if (ordenesEncontradas.length > 0) {
    const ocPorLicitacion = {};
    for (const oc of ordenesEncontradas) {
      if (!ocPorLicitacion[oc.licitacion_codigo]) {
        ocPorLicitacion[oc.licitacion_codigo] = [];
      }
      ocPorLicitacion[oc.licitacion_codigo].push(oc);
    }
    
    // Crear una notificación por cada licitación
    for (const [licitacionCodigo, ordenes] of Object.entries(ocPorLicitacion)) {
      const cantidad = ordenes.length;
      const montoTotal = ordenes.reduce((sum, oc) => sum + (oc.monto || 0), 0);
      
      await crearNotificacion(
        'nueva_oc',
        `Nuevas OC detectadas`,
        `Se agregaron ${cantidad} OC a ID "${licitacionCodigo}" (Total: $${montoTotal.toLocaleString('es-CL')})`,
        licitacionCodigo,
        cantidad
      );
    }
    
    console.log(`[AUTO-OC] ${Object.keys(ocPorLicitacion).length} notificaciones creadas`);
  }
  
  return ordenesEncontradas;
}
