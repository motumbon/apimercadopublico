import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// URL de la API de Railway
const BASE_API_URL = 'https://web-production-fe1d1.up.railway.app';
const API_URL = Constants.expoConfig?.extra?.apiUrl || `${BASE_API_URL}/api`;

console.log('🌐 API URL configurada:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor para agregar el token
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      error.message = 'No se pudo conectar al servidor. Verifica tu conexión.';
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, nombre) => api.post('/auth/registro', { email, password, nombre }),
  getProfile: () => api.get('/auth/perfil')
};

// Licitaciones API
export const licitacionesAPI = {
  getAll: () => api.get('/licitaciones'),
  getOne: (codigo) => api.get(`/licitaciones/${codigo}`),
  buscar: (codigo) => api.get(`/licitaciones/buscar/${codigo}`),
  agregar: (codigo, rutProveedor) => api.post('/licitaciones/agregar', { codigo, rutProveedor }),
  eliminar: (codigo) => api.delete(`/licitaciones/${codigo}`),
  getSaldo: (codigo) => api.get(`/licitaciones/${codigo}/saldo`),
  getItems: (codigo) => api.get(`/licitaciones/${codigo}/items`),
  actualizarItems: (codigo) => api.post(`/licitaciones/${codigo}/actualizar-items`),
  asignar: (codigo, institucionId, linea) => api.put(`/licitaciones/${codigo}/asignar`, { institucion_id: institucionId, linea }),
  actualizarDatos: (codigo, montoTotal, fechaVencimiento) => api.put(`/licitaciones/${codigo}/datos`, { monto_total_licitacion: montoTotal, fecha_vencimiento: fechaVencimiento }),
  getEstadisticas: () => api.get('/licitaciones/estadisticas')
};

// Órdenes de Compra API
export const ordenesAPI = {
  getByLicitacion: (codigo) => api.get(`/ordenes/licitacion/${codigo}`),
  getItems: (codigo) => api.get(`/ordenes/${codigo}/items`),
  actualizarItems: (codigo) => api.post(`/ordenes/${codigo}/actualizar-items`),
  buscarManual: (codigo) => api.post('/ordenes/buscar-manual', { codigo })
};

// Instituciones API
export const institucionesAPI = {
  getAll: () => api.get('/licitaciones/instituciones'),
  getLineas: () => api.get('/licitaciones/lineas')
};

// Notificaciones API
export const notificacionesAPI = {
  getAll: () => api.get('/notificaciones'),
  getNoLeidas: () => api.get('/notificaciones/no-leidas/count'),
  marcarLeida: (id) => api.put(`/notificaciones/${id}/leer`),
  marcarTodasLeidas: () => api.put('/notificaciones/leer-todas'),
  eliminar: (id) => api.delete(`/notificaciones/${id}`),
  eliminarTodas: () => api.delete('/notificaciones/todas')
};

// Formatear monto
export const formatearMonto = (monto, moneda = 'CLP') => {
  if (!monto && monto !== 0) return '-';
  const num = typeof monto === 'string' ? parseFloat(monto) : monto;
  if (moneda === 'CLP') {
    return '$' + num.toLocaleString('es-CL', { maximumFractionDigits: 0 });
  }
  return num.toLocaleString('es-CL', { maximumFractionDigits: 2 }) + ' ' + moneda;
};

// Formatear fecha
export const formatearFecha = (fecha) => {
  if (!fecha) return '-';
  const d = new Date(fecha);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default api;
