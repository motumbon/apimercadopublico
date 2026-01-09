import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { licitacionesAPI, ordenesAPI, institucionesAPI, notificacionesAPI } from '../config/api';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  const [licitaciones, setLicitaciones] = useState([]);
  const [instituciones, setInstituciones] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [saldos, setSaldos] = useState({});
  const [ordenesPorLicitacion, setOrdenesPorLicitacion] = useState({});
  const [notificaciones, setNotificaciones] = useState([]);
  const [contadorNotif, setContadorNotif] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Filtros
  const [filtroInstitucion, setFiltroInstitucion] = useState('');
  const [filtroLinea, setFiltroLinea] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [ordenarPor, setOrdenarPor] = useState('');

  // Cargar datos al autenticarse
  useEffect(() => {
    if (isAuthenticated) {
      cargarDatos();
      cargarNotificaciones();
      
      // Polling cada 2 minutos para sincronización
      const interval = setInterval(() => {
        cargarDatos(true);
        cargarNotificaciones();
      }, 2 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const cargarDatos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    try {
      const [licsRes, instsRes, linsRes] = await Promise.all([
        licitacionesAPI.getAll(),
        institucionesAPI.getAll(),
        institucionesAPI.getLineas()
      ]);
      
      setLicitaciones(licsRes.data.data || []);
      setInstituciones(instsRes.data.data || []);
      setLineas(linsRes.data.data || []);
      
      // Cargar saldos y órdenes de cada licitación
      const newSaldos = {};
      const newOrdenes = {};
      
      for (const lic of (licsRes.data.data || [])) {
        try {
          const [saldoRes, ordenesRes] = await Promise.all([
            licitacionesAPI.getSaldo(lic.codigo),
            licitacionesAPI.getOne(lic.codigo)
          ]);
          newSaldos[lic.codigo] = saldoRes.data;
          newOrdenes[lic.codigo] = ordenesRes.data.ordenes || [];
        } catch (e) {}
      }
      
      setSaldos(newSaldos);
      setOrdenesPorLicitacion(newOrdenes);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const cargarNotificaciones = async () => {
    try {
      const [notifsRes, countRes] = await Promise.all([
        notificacionesAPI.getAll(),
        notificacionesAPI.getNoLeidas()
      ]);
      setNotificaciones(notifsRes.data.data || []);
      setContadorNotif(countRes.data.count || 0);
    } catch (e) {}
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
      await cargarDatos();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || e.message };
    }
  };

  const actualizarDatosLicitacion = async (codigo, montoTotal, fechaVencimiento) => {
    try {
      await licitacionesAPI.actualizarDatos(codigo, montoTotal, fechaVencimiento);
      await cargarDatos();
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
      limpiarFiltros
    }}>
      {children}
    </DataContext.Provider>
  );
};
