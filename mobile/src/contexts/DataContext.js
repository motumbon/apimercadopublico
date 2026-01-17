import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { licitacionesAPI, ordenesAPI, institucionesAPI, notificacionesAPI } from '../config/api';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

// Claves de cache
const CACHE_KEYS = {
  LICITACIONES: '@cache_licitaciones',
  INSTITUCIONES: '@cache_instituciones',
  LINEAS: '@cache_lineas',
  SALDOS: '@cache_saldos',
  ORDENES: '@cache_ordenes',
  LAST_SYNC: '@cache_last_sync'
};

// Formatear fecha para mostrar en toast
const formatearFechaHora = (fecha) => {
  if (!fecha) return '';
  const d = new Date(fecha);
  return d.toLocaleDateString('es-CL', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const DataProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  
  const [licitaciones, setLicitaciones] = useState([]);
  const [instituciones, setInstituciones] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [saldos, setSaldos] = useState({});
  const [ordenesPorLicitacion, setOrdenesPorLicitacion] = useState({});
  const [notificaciones, setNotificaciones] = useState([]);
  const [contadorNotif, setContadorNotif] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  
  // Filtros
  const [filtroInstitucion, setFiltroInstitucion] = useState('');
  const [filtroLinea, setFiltroLinea] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [ordenarPor, setOrdenarPor] = useState('');

  // Guardar datos en cache
  const guardarCache = async (datos) => {
    try {
      const promises = [];
      if (datos.licitaciones) promises.push(AsyncStorage.setItem(CACHE_KEYS.LICITACIONES, JSON.stringify(datos.licitaciones)));
      if (datos.instituciones) promises.push(AsyncStorage.setItem(CACHE_KEYS.INSTITUCIONES, JSON.stringify(datos.instituciones)));
      if (datos.lineas) promises.push(AsyncStorage.setItem(CACHE_KEYS.LINEAS, JSON.stringify(datos.lineas)));
      if (datos.saldos) promises.push(AsyncStorage.setItem(CACHE_KEYS.SALDOS, JSON.stringify(datos.saldos)));
      if (datos.ordenes) promises.push(AsyncStorage.setItem(CACHE_KEYS.ORDENES, JSON.stringify(datos.ordenes)));
      promises.push(AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, new Date().toISOString()));
      await Promise.all(promises);
      console.log('💾 Cache guardado');
    } catch (e) {
      console.log('⚠️ Error guardando cache:', e.message);
    }
  };

  // Cargar datos desde cache
  const cargarDesdeCache = async () => {
    try {
      console.log('📂 Cargando desde cache...');
      const [licsStr, instsStr, linsStr, saldosStr, ordenesStr, lastSyncStr] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEYS.LICITACIONES),
        AsyncStorage.getItem(CACHE_KEYS.INSTITUCIONES),
        AsyncStorage.getItem(CACHE_KEYS.LINEAS),
        AsyncStorage.getItem(CACHE_KEYS.SALDOS),
        AsyncStorage.getItem(CACHE_KEYS.ORDENES),
        AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC)
      ]);
      
      let tieneCache = false;
      
      if (licsStr) { setLicitaciones(JSON.parse(licsStr)); tieneCache = true; }
      if (instsStr) { setInstituciones(JSON.parse(instsStr)); }
      if (linsStr) { setLineas(JSON.parse(linsStr)); }
      if (saldosStr) { setSaldos(JSON.parse(saldosStr)); }
      if (ordenesStr) { setOrdenesPorLicitacion(JSON.parse(ordenesStr)); }
      if (lastSyncStr) { setLastSync(new Date(lastSyncStr)); }
      
      if (tieneCache) {
        console.log('✅ Datos cargados desde cache');
      }
      return tieneCache;
    } catch (e) {
      console.log('⚠️ Error cargando cache:', e.message);
      return false;
    }
  };

  // Al autenticarse: cargar cache primero, luego sincronizar
  useEffect(() => {
    if (isAuthenticated) {
      inicializarDatos();
    }
  }, [isAuthenticated]);

  const inicializarDatos = async () => {
    setLoading(true);
    // Cargar cache primero (rápido)
    const tieneCache = await cargarDesdeCache();
    
    if (tieneCache) {
      setLoading(false);
      // Sincronizar en segundo plano
      sincronizarConServidor();
    } else {
      // Sin cache, cargar todo del servidor
      await cargarDatos();
    }
    
    cargarNotificaciones();
  };

  const cargarDatos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    try {
      console.log('📥 Cargando datos...');
      
      // Cargar licitaciones primero
      const licsRes = await licitacionesAPI.getAll();
      console.log('📋 Licitaciones response:', JSON.stringify(licsRes.data));
      
      const licitacionesData = licsRes.data.data || licsRes.data || [];
      setLicitaciones(licitacionesData);
      console.log('✅ Licitaciones cargadas:', licitacionesData.length);
      
      // Cargar instituciones y líneas
      let institucionesData = [];
      let lineasData = [];
      
      try {
        const instsRes = await institucionesAPI.getAll();
        institucionesData = instsRes.data.data || instsRes.data || [];
      } catch (e) {
        console.log('⚠️ Error cargando instituciones:', e.message);
      }
      
      try {
        const linsRes = await institucionesAPI.getLineas();
        lineasData = linsRes.data.data || linsRes.data || [];
      } catch (e) {
        console.log('⚠️ Error cargando líneas:', e.message);
      }
      
      setInstituciones(institucionesData);
      setLineas(lineasData);
      
      // Cargar saldos y órdenes de cada licitación
      const newSaldos = {};
      const newOrdenes = {};
      
      for (const lic of licitacionesData) {
        try {
          const [saldoRes, ordenesRes] = await Promise.all([
            licitacionesAPI.getSaldo(lic.codigo),
            licitacionesAPI.getOne(lic.codigo)
          ]);
          // El servidor devuelve { success, data: { montoTotalLicitacion, montoOC, saldo } }
          newSaldos[lic.codigo] = saldoRes.data.data || saldoRes.data;
          const ordenesData = ordenesRes.data.ordenes || ordenesRes.data.data?.ordenes || [];
          newOrdenes[lic.codigo] = ordenesData;
        } catch (e) {
          console.log(`⚠️ Error cargando datos de ${lic.codigo}:`, e.message);
        }
      }
      
      setSaldos(newSaldos);
      setOrdenesPorLicitacion(newOrdenes);
      setError(null);
      setIsOffline(false);
      setLastSync(new Date());
      
      // Guardar en cache
      await guardarCache({
        licitaciones: licitacionesData,
        instituciones: institucionesData,
        lineas: lineasData,
        saldos: newSaldos,
        ordenes: newOrdenes
      });
      
      console.log('✅ Datos cargados completamente');
    } catch (e) {
      console.log('❌ Error cargando datos:', e.message);
      setError(e.message);
      setIsOffline(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Sincronizar en segundo plano (no bloquea UI)
  const sincronizarConServidor = async () => {
    if (syncing) return;
    setSyncing(true);
    
    try {
      console.log('🔄 Sincronizando con servidor...');
      
      const licsRes = await licitacionesAPI.getAll();
      const licitacionesData = licsRes.data.data || licsRes.data || [];
      
      let institucionesData = [];
      let lineasData = [];
      
      try {
        const instsRes = await institucionesAPI.getAll();
        institucionesData = instsRes.data.data || instsRes.data || [];
      } catch (e) {}
      
      try {
        const linsRes = await institucionesAPI.getLineas();
        lineasData = linsRes.data.data || linsRes.data || [];
      } catch (e) {}
      
      const newSaldos = {};
      const newOrdenes = {};
      
      for (const lic of licitacionesData) {
        try {
          const [saldoRes, ordenesRes] = await Promise.all([
            licitacionesAPI.getSaldo(lic.codigo),
            licitacionesAPI.getOne(lic.codigo)
          ]);
          newSaldos[lic.codigo] = saldoRes.data.data || saldoRes.data;
          newOrdenes[lic.codigo] = ordenesRes.data.ordenes || ordenesRes.data.data?.ordenes || [];
        } catch (e) {}
      }
      
      // Actualizar estado
      setLicitaciones(licitacionesData);
      setInstituciones(institucionesData);
      setLineas(lineasData);
      setSaldos(newSaldos);
      setOrdenesPorLicitacion(newOrdenes);
      setIsOffline(false);
      setLastSync(new Date());
      
      // Guardar en cache
      await guardarCache({
        licitaciones: licitacionesData,
        instituciones: institucionesData,
        lineas: lineasData,
        saldos: newSaldos,
        ordenes: newOrdenes
      });
      
      console.log('✅ Sincronización completada');
      showToast('Datos sincronizados', 'success', 2500);
    } catch (e) {
      console.log('⚠️ Error en sincronización:', e.message);
      setIsOffline(true);
      // Leer fecha de última sincronización directamente del cache
      try {
        const lastSyncStr = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
        const fechaUltima = lastSyncStr ? formatearFechaHora(new Date(lastSyncStr)) : 'desconocida';
        showToast(`Sin conexión. Última sincronización: ${fechaUltima}`, 'warning', 4000);
      } catch {
        showToast('Sin conexión. No hay datos de sincronización previa.', 'warning', 4000);
      }
    } finally {
      setSyncing(false);
    }
  };

  const cargarNotificaciones = async () => {
    try {
      const [notifsRes, countRes] = await Promise.all([
        notificacionesAPI.getAll(),
        notificacionesAPI.getNoLeidas()
      ]);
      // El servidor devuelve { success, notificaciones } o { success, count }
      setNotificaciones(notifsRes.data.notificaciones || notifsRes.data.data || []);
      setContadorNotif(countRes.data.count || 0);
      console.log('🔔 Notificaciones cargadas:', (notifsRes.data.notificaciones || []).length);
    } catch (e) {
      console.log('⚠️ Error cargando notificaciones:', e.message);
    }
  };

  const agregarLicitacion = async (codigo, rutProveedor) => {
    try {
      await licitacionesAPI.agregar(codigo, rutProveedor);
      await cargarDatos();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || e.message };
    }
  };

  const eliminarLicitacion = async (codigo) => {
    try {
      await licitacionesAPI.eliminar(codigo);
      await cargarDatos();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || e.message };
    }
  };

  const asignarLicitacion = async (codigo, institucionId, linea) => {
    try {
      await licitacionesAPI.asignar(codigo, institucionId, linea);
      // Actualizar estado local inmediatamente
      setLicitaciones(prev => prev.map(l => 
        l.codigo === codigo 
          ? { ...l, institucion_id: institucionId, linea } 
          : l
      ));
      // Actualizar cache
      const nuevasLicitaciones = licitaciones.map(l => 
        l.codigo === codigo ? { ...l, institucion_id: institucionId, linea } : l
      );
      await guardarCache({ licitaciones: nuevasLicitaciones });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || e.message };
    }
  };

  const actualizarDatosLicitacion = async (codigo, montoTotal, fechaVencimiento) => {
    try {
      await licitacionesAPI.actualizarDatos(codigo, montoTotal, fechaVencimiento);
      // Actualizar estado local inmediatamente
      setLicitaciones(prev => prev.map(l => 
        l.codigo === codigo 
          ? { ...l, monto_total_licitacion: montoTotal, fecha_vencimiento: fechaVencimiento } 
          : l
      ));
      // Actualizar saldo local
      setSaldos(prev => ({
        ...prev,
        [codigo]: { ...prev[codigo], montoTotalLicitacion: montoTotal, saldo: montoTotal - (prev[codigo]?.montoOC || 0) }
      }));
      // Actualizar cache
      const nuevasLicitaciones = licitaciones.map(l => 
        l.codigo === codigo ? { ...l, monto_total_licitacion: montoTotal, fecha_vencimiento: fechaVencimiento } : l
      );
      await guardarCache({ licitaciones: nuevasLicitaciones });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || e.message };
    }
  };

  const obtenerItemsLicitacion = async (codigo) => {
    try {
      let res = await licitacionesAPI.getItems(codigo);
      if (!res.data.items || res.data.items.length === 0) {
        res = await licitacionesAPI.actualizarItems(codigo);
      }
      return res.data.items || [];
    } catch (e) {
      return [];
    }
  };

  const obtenerItemsOC = async (codigo) => {
    try {
      const res = await ordenesAPI.getItems(codigo);
      return res.data.items || [];
    } catch (e) {
      return [];
    }
  };

  const actualizarItemsOC = async (codigo) => {
    try {
      const res = await ordenesAPI.actualizarItems(codigo);
      
      // Si la respuesta incluye el nuevo estado, actualizar en el estado local
      if (res.data.estado) {
        setOrdenesPorLicitacion(prev => {
          const updated = { ...prev };
          for (const licitacionCodigo in updated) {
            updated[licitacionCodigo] = updated[licitacionCodigo].map(oc => 
              oc.codigo === codigo 
                ? { ...oc, estado: res.data.estado } 
                : oc
            );
          }
          return updated;
        });
      }
      
      return res.data.items || [];
    } catch (e) {
      return [];
    }
  };

  // Filtrar licitaciones
  const getLicitacionesFiltradas = useCallback(() => {
    let resultado = [...licitaciones];
    
    if (filtroInstitucion) {
      resultado = resultado.filter(l => l.institucion_id === parseInt(filtroInstitucion));
    }
    
    if (filtroLinea) {
      resultado = resultado.filter(l => l.linea === filtroLinea);
    }
    
    if (filtroMes) {
      resultado = resultado.filter(l => {
        const ordenes = ordenesPorLicitacion[l.codigo] || [];
        return ordenes.some(oc => {
          const fechaOC = oc.fecha_envio || oc.fecha_aceptacion;
          if (!fechaOC) return false;
          const mesOC = fechaOC.substring(5, 7);
          return mesOC === filtroMes;
        });
      });
    }
    
    if (ordenarPor === 'monto') {
      resultado.sort((a, b) => (b.monto_total_licitacion || 0) - (a.monto_total_licitacion || 0));
    } else if (ordenarPor === 'saldo') {
      resultado.sort((a, b) => {
        const saldoA = saldos[a.codigo]?.saldo || 0;
        const saldoB = saldos[b.codigo]?.saldo || 0;
        return saldoA - saldoB;
      });
    }
    
    return resultado;
  }, [licitaciones, filtroInstitucion, filtroLinea, filtroMes, ordenarPor, ordenesPorLicitacion, saldos]);

  const limpiarFiltros = () => {
    setFiltroInstitucion('');
    setFiltroLinea('');
    setFiltroMes('');
    setOrdenarPor('');
  };

  // Obtener licitación actualizada por código
  const getLicitacion = useCallback((codigo) => {
    return licitaciones.find(l => l.codigo === codigo);
  }, [licitaciones]);

  return (
    <DataContext.Provider value={{
      licitaciones,
      instituciones,
      lineas,
      saldos,
      ordenesPorLicitacion,
      notificaciones,
      contadorNotif,
      loading,
      refreshing,
      syncing,
      isOffline,
      lastSync,
      error,
      filtroInstitucion,
      setFiltroInstitucion,
      filtroLinea,
      setFiltroLinea,
      filtroMes,
      setFiltroMes,
      ordenarPor,
      setOrdenarPor,
      cargarDatos,
      cargarNotificaciones,
      agregarLicitacion,
      eliminarLicitacion,
      asignarLicitacion,
      actualizarDatosLicitacion,
      obtenerItemsLicitacion,
      obtenerItemsOC,
      actualizarItemsOC,
      getLicitacionesFiltradas,
      getLicitacion,
      limpiarFiltros
    }}>
      {children}
    </DataContext.Provider>
  );
};
