const API_BASE = '/api';

// Callback para logout automático cuando el token expira
let onTokenExpired = null;

export function setOnTokenExpired(callback) {
  onTokenExpired = callback;
}

// Wrapper para manejar respuestas 401 automáticamente
async function handleResponse(res) {
  if (res.status === 401) {
    // Token expirado o inválido - forzar logout
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onTokenExpired) {
      onTokenExpired();
    }
    throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
  }
  return res;
}

// ========== AUTENTICACIÓN ==========

function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  localStorage.setItem('token', token);
}

export function removeToken() {
  localStorage.removeItem('token');
}

export function getStoredUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

export function setStoredUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

export function removeStoredUser() {
  localStorage.removeItem('user');
}

function authHeaders() {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function registrarUsuario(email, password, nombre) {
  const res = await fetch(`${API_BASE}/auth/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, nombre })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function loginUsuario(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function obtenerUsuarioActual() {
  const res = await handleResponse(await fetch(`${API_BASE}/auth/me`, {
    headers: authHeaders()
  }));
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function cambiarPassword(passwordActual, passwordNuevo) {
  const res = await handleResponse(await fetch(`${API_BASE}/auth/cambiar-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ passwordActual, passwordNuevo })
  }));
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function eliminarCuenta(password) {
  const res = await handleResponse(await fetch(`${API_BASE}/auth/eliminar-cuenta`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ password })
  }));
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ========== LICITACIONES ==========

export async function obtenerLicitaciones() {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones`, {
    headers: authHeaders()
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function obtenerEstadisticas() {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/estadisticas`, {
    headers: authHeaders()
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function buscarLicitacion(codigo) {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/buscar/${encodeURIComponent(codigo)}`, {
    headers: authHeaders()
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function agregarLicitacion(codigo, rutProveedor = null) {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/agregar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ codigo, rutProveedor })
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function obtenerLicitacionConOrdenes(codigo) {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/${encodeURIComponent(codigo)}`, {
    headers: authHeaders()
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function obtenerItemsOC(codigoOC) {
  const res = await handleResponse(await fetch(`${API_BASE}/ordenes/${encodeURIComponent(codigoOC)}/items`, {
    headers: authHeaders()
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.items;
}

export async function actualizarItemsOC(codigoOC) {
  const res = await handleResponse(await fetch(`${API_BASE}/ordenes/${encodeURIComponent(codigoOC)}/actualizar-items`, {
    method: 'POST',
    headers: authHeaders()
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function obtenerItemsLicitacion(codigoLicitacion) {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/${encodeURIComponent(codigoLicitacion)}/items`, {
    headers: authHeaders()
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.items;
}

export async function actualizarItemsLicitacion(codigoLicitacion) {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/${encodeURIComponent(codigoLicitacion)}/actualizar-items`, {
    method: 'POST',
    headers: authHeaders()
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function actualizarLicitacion(codigo) {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/${encodeURIComponent(codigo)}/actualizar`, {
    method: 'POST',
    headers: authHeaders()
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function actualizarTodasLasLicitaciones() {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/actualizar-todas`, {
    method: 'POST',
    headers: authHeaders()
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function eliminarLicitacion(codigo) {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/${encodeURIComponent(codigo)}`, {
    method: 'DELETE',
    headers: authHeaders()
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function agregarOrdenesDeCompra(codigoLicitacion, codigosOC) {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/${encodeURIComponent(codigoLicitacion)}/ordenes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ codigosOC })
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function detectarOCAutomaticamente(codigoLicitacion) {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/${encodeURIComponent(codigoLicitacion)}/detectar-oc`, {
    method: 'POST',
    headers: authHeaders()
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function obtenerOrdenesDeCompra(codigoLicitacion) {
  const res = await handleResponse(await fetch(`${API_BASE}/ordenes/licitacion/${encodeURIComponent(codigoLicitacion)}`, {
    headers: authHeaders()
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export function formatearMonto(monto, moneda = 'CLP') {
  if (moneda === 'CLP') {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(monto);
  }
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: moneda
  }).format(monto);
}

export function formatearFecha(fecha) {
  if (!fecha) return '-';
  try {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return fecha;
  }
}

// ========== INSTITUCIONES ==========

export async function obtenerInstituciones() {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/instituciones/lista`, {
    headers: authHeaders()
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function obtenerLineas() {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/instituciones/lineas`, {
    headers: authHeaders()
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function crearInstitucion(nombre) {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/instituciones/crear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ nombre })
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function eliminarInstitucionAPI(id) {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/instituciones/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function obtenerLicitacionesPorInstitucion(institucionId) {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/instituciones/${institucionId}/licitaciones`, {
    headers: authHeaders()
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function asignarLicitacion(codigo, institucionId, linea) {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/${encodeURIComponent(codigo)}/asignar`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ institucionId, linea })
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function actualizarDatosLicitacion(codigo, montoTotalLicitacion, fechaVencimiento) {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/${encodeURIComponent(codigo)}/datos`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ montoTotalLicitacion, fechaVencimiento })
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function obtenerSaldoLicitacion(codigo) {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/${encodeURIComponent(codigo)}/saldo`, {
    headers: authHeaders()
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// ========== SINCRONIZACIÓN LOCAL <-> RAILWAY ==========

// Exportar datos locales
export async function exportarDatos() {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/sync/exportar`, {
    headers: authHeaders()
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

// Sincronizar datos locales a Railway
export async function sincronizarConRailway(railwayUrl, token, datos) {
  const res = await fetch(`${railwayUrl}/api/licitaciones/sync/importar`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ datos })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

// Importar datos (recibir de otra instancia)
export async function importarDatos(datos) {
  const res = await handleResponse(await fetch(`${API_BASE}/licitaciones/sync/importar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ datos })
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

// === NOTIFICACIONES ===

export async function obtenerNotificaciones(soloNoLeidas = false) {
  const res = await fetch(`${API_BASE}/notificaciones?noLeidas=${soloNoLeidas}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.notificaciones;
}

export async function contarNotificacionesNoLeidas() {
  const res = await fetch(`${API_BASE}/notificaciones/contador`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.count;
}

export async function marcarNotificacionLeida(id) {
  const res = await fetch(`${API_BASE}/notificaciones/${id}/leida`, {
    method: 'PUT'
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function marcarTodasNotificacionesLeidas() {
  const res = await fetch(`${API_BASE}/notificaciones/marcar-todas-leidas`, {
    method: 'PUT'
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function eliminarNotificacion(id) {
  const res = await fetch(`${API_BASE}/notificaciones/${id}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function eliminarTodasNotificaciones() {
  const res = await fetch(`${API_BASE}/notificaciones`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

// === BUSCAR OC (ejecutar búsqueda manual en el servidor actual) ===

export async function buscarOCManual() {
  // Ejecutar la búsqueda de OC en el servidor actual (mismo origen)
  const res = await handleResponse(await fetch(`${API_BASE}/test/buscar-oc-ayer`, {
    headers: { ...authHeaders() }
  }));
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Error al buscar OC');
  return data;
}
