import axios from 'axios';
import { 
  guardarLicitacion, 
  guardarOrdenCompra, 
  obtenerLicitaciones 
} from '../db/database.js';

const API_BASE = 'https://api.mercadopublico.cl/servicios/v1/publico';
const TICKET = process.env.MERCADO_PUBLICO_TICKET || '94B7FE59-0486-4981-9592-0D23F0939246';

console.log('[CONFIG] Ticket API:', TICKET.substring(0, 8) + '...');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Cliente axios con timeout largo
const apiClient = axios.create({
  timeout: 120000, // 2 minutos
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

async function httpsGet(url, retries = 3) {
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
      const errorMsg = error.response?.data?.message || error.message || 'Error desconocido';
      console.log(`[API] Error intento ${attempt}: ${errorMsg}`);
      
      if (error.rateLimited && attempt < retries) {
        console.log(`[API] Rate limited, esperando ${attempt * 5} segundos...`);
        await sleep(attempt * 5000);
        continue;
      }
      
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        if (attempt < retries) {
          console.log(`[API] Timeout, reintentando en 3s...`);
          await sleep(3000);
          continue;
        }
        throw new Error('La API de Mercado Público no responde. Intenta de nuevo en unos minutos.');
      }
      
      if (attempt < retries) {
        await sleep(2000);
        continue;
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
      adjudicacion_info: licitacion.Adjudicacion || null
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
      licitacion_codigo: orden.Licitacion || ''
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
  
  await guardarLicitacion({
    codigo: licitacion.codigo,
    nombre: licitacion.nombre,
    estado: licitacion.estado,
    estado_codigo: licitacion.estado_codigo,
    fecha_cierre: licitacion.fecha_cierre,
    organismo: licitacion.organismo,
    monto_estimado: licitacion.monto_estimado,
    rut_proveedor: rutProveedor
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
  const licitaciones = await obtenerLicitaciones();
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
