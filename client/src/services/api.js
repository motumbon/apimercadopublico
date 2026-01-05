const API_BASE = '/api';

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
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: authHeaders()
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function cambiarPassword(passwordActual, passwordNuevo) {
  const res = await fetch(`${API_BASE}/auth/cambiar-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ passwordActual, passwordNuevo })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function eliminarCuenta(password) {
  const res = await fetch(`${API_BASE}/auth/eliminar-cuenta`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ password })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ========== LICITACIONES ==========

export async function obtenerLicitaciones() {
  const res = await fetch(`${API_BASE}/licitaciones`, {
    headers: authHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function obtenerEstadisticas() {
  const res = await fetch(`${API_BASE}/licitaciones/estadisticas`, {
    headers: authHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function buscarLicitacion(codigo) {
  const res = await fetch(`${API_BASE}/licitaciones/buscar/${encodeURIComponent(codigo)}`, {
    headers: authHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function agregarLicitacion(codigo, rutProveedor = null) {
  const res = await fetch(`${API_BASE}/licitaciones/agregar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ codigo, rutProveedor })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function obtenerLicitacionConOrdenes(codigo) {
  const res = await fetch(`${API_BASE}/licitaciones/${encodeURIComponent(codigo)}`, {
    headers: authHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function actualizarLicitacion(codigo) {
  const res = await fetch(`${API_BASE}/licitaciones/${encodeURIComponent(codigo)}/actualizar`, {
    method: 'POST',
    headers: authHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function actualizarTodasLasLicitaciones() {
  const res = await fetch(`${API_BASE}/licitaciones/actualizar-todas`, {
    method: 'POST',
    headers: authHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function eliminarLicitacion(codigo) {
  const res = await fetch(`${API_BASE}/licitaciones/${encodeURIComponent(codigo)}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function agregarOrdenesDeCompra(codigoLicitacion, codigosOC) {
  const res = await fetch(`${API_BASE}/licitaciones/${encodeURIComponent(codigoLicitacion)}/ordenes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ codigosOC })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function detectarOCAutomaticamente(codigoLicitacion) {
  const res = await fetch(`${API_BASE}/licitaciones/${encodeURIComponent(codigoLicitacion)}/detectar-oc`, {
    method: 'POST',
    headers: authHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function obtenerOrdenesDeCompra(codigoLicitacion) {
  const res = await fetch(`${API_BASE}/ordenes/licitacion/${encodeURIComponent(codigoLicitacion)}`, {
    headers: authHeaders()
  });
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
  const res = await fetch(`${API_BASE}/licitaciones/instituciones/lista`, {
    headers: authHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function obtenerLineas() {
  const res = await fetch(`${API_BASE}/licitaciones/instituciones/lineas`, {
    headers: authHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function crearInstitucion(nombre) {
  const res = await fetch(`${API_BASE}/licitaciones/instituciones/crear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ nombre })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function eliminarInstitucionAPI(id) {
  const res = await fetch(`${API_BASE}/licitaciones/instituciones/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function obtenerLicitacionesPorInstitucion(institucionId) {
  const res = await fetch(`${API_BASE}/licitaciones/instituciones/${institucionId}/licitaciones`, {
    headers: authHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function asignarLicitacion(codigo, institucionId, linea) {
  const res = await fetch(`${API_BASE}/licitaciones/${encodeURIComponent(codigo)}/asignar`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ institucionId, linea })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function actualizarDatosLicitacion(codigo, montoTotalLicitacion, fechaVencimiento) {
  const res = await fetch(`${API_BASE}/licitaciones/${encodeURIComponent(codigo)}/datos`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ montoTotalLicitacion, fechaVencimiento })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function obtenerSaldoLicitacion(codigo) {
  const res = await fetch(`${API_BASE}/licitaciones/${encodeURIComponent(codigo)}/saldo`, {
    headers: authHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// ========== SINCRONIZACIÓN LOCAL <-> RAILWAY ==========

// Exportar datos locales
export async function exportarDatos() {
  const res = await fetch(`${API_BASE}/licitaciones/sync/exportar`, {
    headers: authHeaders()
  });
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
  const res = await fetch(`${API_BASE}/licitaciones/sync/importar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ datos })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}
