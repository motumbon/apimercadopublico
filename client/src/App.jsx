import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  RefreshCw, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  FileText,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  Clock,
  Building2,
  Edit3,
  Save,
  X,
  LogOut,
  User,
  Filter,
  ArrowUpDown,
  Bell,
  BellRing,
  ExternalLink,
  Cloud,
  Package
} from 'lucide-react';
import {
  obtenerLicitaciones,
  agregarLicitacion,
  obtenerLicitacionConOrdenes,
  eliminarLicitacion,
  agregarOrdenesDeCompra,
  detectarOCAutomaticamente,
  formatearMonto,
  formatearFecha,
  obtenerInstituciones,
  obtenerLineas,
  asignarLicitacion,
  actualizarDatosLicitacion,
  obtenerSaldoLicitacion,
  registrarUsuario,
  loginUsuario,
  setToken,
  removeToken,
  getStoredUser,
  setStoredUser,
  removeStoredUser,
  cambiarPassword,
  eliminarCuenta,
  exportarDatos,
  sincronizarConRailway,
  obtenerNotificaciones,
  contarNotificacionesNoLeidas,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
  eliminarNotificacion,
  eliminarTodasNotificaciones,
  buscarOCManual,
  obtenerItemsOC,
  actualizarItemsOC
} from './services/api';

function App() {
  // Autenticación
  const [usuario, setUsuario] = useState(null);
  const [vistaAuth, setVistaAuth] = useState('login'); // 'login', 'registro', 'perfil'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authNombre, setAuthNombre] = useState('');
  const [authPasswordActual, setAuthPasswordActual] = useState('');
  const [authPasswordNuevo, setAuthPasswordNuevo] = useState('');
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState('');
  
  // Licitaciones
  const [licitaciones, setLicitaciones] = useState([]);
  const [codigoBusqueda, setCodigoBusqueda] = useState('');
  const [expandida, setExpandida] = useState(null);
  const [ordenesExpandidas, setOrdenesExpandidas] = useState({});
  const [itemsExpandidos, setItemsExpandidos] = useState({}); // { codigoOC: items[] }
  const [ocExpandida, setOcExpandida] = useState(null); // codigo de OC expandida
  const [cargandoItems, setCargandoItems] = useState(false);
  const [actualizandoItems, setActualizandoItems] = useState(null); // codigo de OC actualizando
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);
  const [codigosOC, setCodigosOC] = useState('');
  const [agregandoOC, setAgregandoOC] = useState(false);
  const [detectandoOC, setDetectandoOC] = useState(false);
  
  // Instituciones y líneas
  const [instituciones, setInstituciones] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [institucionSeleccionada, setInstitucionSeleccionada] = useState('');
  const [lineaSeleccionada, setLineaSeleccionada] = useState('');
  
  // Filtros
  const [filtroInstitucion, setFiltroInstitucion] = useState('');
  const [filtroLinea, setFiltroLinea] = useState('');
  const [filtroMesOC, setFiltroMesOC] = useState(''); // formato: 'YYYY-MM'
  const [ordenarPor, setOrdenarPor] = useState(''); // 'monto', 'saldo'
  
  // Edición de licitación (botón lápiz)
  const [modoEdicion, setModoEdicion] = useState(null);
  const [editandoLicitacion, setEditandoLicitacion] = useState(null);
  
  // Montos totales OC por licitación
  const [montosOC, setMontosOC] = useState({});
  const [montoTotalEdit, setMontoTotalEdit] = useState('');
  const [fechaVencimientoEdit, setFechaVencimientoEdit] = useState('');
  const [saldosLicitaciones, setSaldosLicitaciones] = useState({});
  
  // Sincronización con Railway
  const [mostrarSync, setMostrarSync] = useState(false);
  const [railwayUrl, setRailwayUrl] = useState(localStorage.getItem('railwayUrl') || 'https://web-production-fe1d1.up.railway.app');
  const [railwayEmail, setRailwayEmail] = useState(localStorage.getItem('railwayEmail') || '');
  const [railwayPassword, setRailwayPassword] = useState('');
  const [sincronizando, setSincronizando] = useState(false);
  const [importandoNube, setImportandoNube] = useState(false);
  
  // Notificaciones
  const [notificaciones, setNotificaciones] = useState([]);
  const [contadorNotif, setContadorNotif] = useState(0);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);

  // Verificar si hay usuario guardado al cargar
  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUsuario(storedUser);
    }
  }, []);

  // Cargar datos cuando hay usuario autenticado
  useEffect(() => {
    if (usuario) {
      cargarDatos();
      cargarNotificaciones();
      // Actualizar contador de notificaciones cada 30 segundos
      const interval = setInterval(cargarContadorNotificaciones, 30000);
      return () => clearInterval(interval);
    }
  }, [usuario]);
  
  async function cargarNotificaciones() {
    try {
      const notifs = await obtenerNotificaciones();
      setNotificaciones(notifs);
      const count = await contarNotificacionesNoLeidas();
      setContadorNotif(count);
    } catch (e) {
      console.log('Error cargando notificaciones:', e.message);
    }
  }
  
  async function cargarContadorNotificaciones() {
    try {
      const count = await contarNotificacionesNoLeidas();
      setContadorNotif(count);
    } catch (e) {}
  }
  
  async function handleMarcarTodasLeidas() {
    try {
      await marcarTodasNotificacionesLeidas();
      await cargarNotificaciones();
    } catch (e) {
      setError('Error: ' + e.message);
    }
  }
  
  async function handleEliminarTodasNotificaciones() {
    try {
      await eliminarTodasNotificaciones();
      setNotificaciones([]);
      setContadorNotif(0);
    } catch (e) {
      setError('Error: ' + e.message);
    }
  }
  
  async function handleEliminarNotificacion(id) {
    try {
      await eliminarNotificacion(id);
      await cargarNotificaciones();
    } catch (e) {
      setError('Error: ' + e.message);
    }
  }

  async function cargarDatos() {
    setCargando(true);
    try {
      const [lics, insts, lins] = await Promise.all([
        obtenerLicitaciones(),
        obtenerInstituciones(),
        obtenerLineas()
      ]);
      setLicitaciones(lics);
      setInstituciones(insts);
      setLineas(lins);
      
      // Cargar saldos, montos OC y OC para todas las licitaciones
      const saldos = {};
      const montos = {};
      const todasOC = {};
      for (const lic of lics) {
        try {
          const saldo = await obtenerSaldoLicitacion(lic.codigo);
          saldos[lic.codigo] = saldo;
          montos[lic.codigo] = saldo.montoOC;
          
          // Cargar OC de cada licitación para el filtro de mes
          const data = await obtenerLicitacionConOrdenes(lic.codigo);
          todasOC[lic.codigo] = data.ordenes || [];
        } catch (e) {}
      }
      setSaldosLicitaciones(saldos);
      setMontosOC(montos);
      setOrdenesExpandidas(todasOC);
    } catch (err) {
      setError('Error al cargar datos: ' + err.message);
    } finally {
      setCargando(false);
    }
  }

  // ========== AUTENTICACIÓN ==========
  
  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    try {
      const data = await loginUsuario(authEmail, authPassword);
      setToken(data.token);
      setStoredUser(data.usuario);
      setUsuario(data.usuario);
      setAuthEmail('');
      setAuthPassword('');
      setMensaje('Bienvenido ' + (data.usuario.nombre || data.usuario.email));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRegistro(e) {
    e.preventDefault();
    setError(null);
    if (authPassword !== authPasswordConfirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    try {
      const data = await registrarUsuario(authEmail, authPassword, authNombre);
      setToken(data.token);
      setStoredUser(data.usuario);
      setUsuario(data.usuario);
      setAuthEmail('');
      setAuthPassword('');
      setAuthNombre('');
      setAuthPasswordConfirm('');
      setMensaje('Cuenta creada correctamente');
    } catch (err) {
      setError(err.message);
    }
  }

  function handleLogout() {
    removeToken();
    removeStoredUser();
    setUsuario(null);
    setLicitaciones([]);
    setMensaje(null);
    setVistaAuth('login');
  }

  async function handleCambiarPassword(e) {
    e.preventDefault();
    setError(null);
    if (authPasswordNuevo !== authPasswordConfirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    try {
      await cambiarPassword(authPasswordActual, authPasswordNuevo);
      setMensaje('Contraseña cambiada correctamente');
      setAuthPasswordActual('');
      setAuthPasswordNuevo('');
      setAuthPasswordConfirm('');
      setVistaAuth('login');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleEliminarCuenta() {
    if (!confirm('¿Estás seguro de eliminar tu cuenta? Se eliminarán todas tus licitaciones.')) return;
    const password = prompt('Ingresa tu contraseña para confirmar:');
    if (!password) return;
    try {
      await eliminarCuenta(password);
      handleLogout();
      setMensaje('Cuenta eliminada correctamente');
    } catch (err) {
      setError(err.message);
    }
  }
  
  // Sincronización con Railway
  async function handleSincronizarRailway() {
    if (!railwayUrl || !railwayEmail || !railwayPassword) {
      setError('Completa todos los campos');
      return;
    }
    
    setSincronizando(true);
    setError(null);
    
    try {
      // Guardar configuración
      localStorage.setItem('railwayUrl', railwayUrl);
      localStorage.setItem('railwayEmail', railwayEmail);
      
      // 1. Hacer login en Railway para obtener token
      const loginRes = await fetch(`${railwayUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: railwayEmail, password: railwayPassword })
      });
      const loginData = await loginRes.json();
      
      if (!loginData.success) {
        throw new Error(loginData.error || 'Error de autenticación en Railway');
      }
      
      const railwayToken = loginData.token;
      
      // 2. Exportar datos locales
      const exportacion = await exportarDatos();
      
      // 3. Enviar a Railway
      const resultado = await sincronizarConRailway(railwayUrl, railwayToken, exportacion.data);
      
      setMensaje(`✓ Sincronización exitosa: ${resultado.message}`);
      setMostrarSync(false);
      setRailwayPassword('');
    } catch (err) {
      setError('Error sincronizando: ' + err.message);
    } finally {
      setSincronizando(false);
    }
  }

  async function handleBuscarOC() {
    setImportandoNube(true);
    setError(null);
    setMensaje(null);
    
    try {
      setMensaje('Buscando nuevas OC en Mercado Público...');
      const resultado = await buscarOCManual();
      
      if (resultado.ordenes?.length > 0) {
        setMensaje(`✓ ${resultado.ordenes.length} OC nuevas detectadas. Recargando página...`);
        // Recargar la página después de 2 segundos para mostrar las OC
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMensaje(`Búsqueda completada. ${resultado.message || 'No se encontraron OC nuevas.'}`);
        setImportandoNube(false);
      }
    } catch (err) {
      setError('Error: ' + err.message);
      setImportandoNube(false);
    }
  }
  
  async function handleAsignarLicitacion(codigo) {
    if (!institucionSeleccionada || !lineaSeleccionada) {
      setError('Selecciona institución y línea');
      return;
    }
    try {
      await asignarLicitacion(codigo, parseInt(institucionSeleccionada), lineaSeleccionada);
      setMensaje('Licitación asignada correctamente');
      setInstitucionSeleccionada('');
      setLineaSeleccionada('');
      await cargarDatos();
    } catch (err) {
      setError('Error: ' + err.message);
    }
  }
  
  async function handleGuardarDatosLicitacion(codigo) {
    try {
      const monto = montoTotalEdit ? parseFloat(montoTotalEdit) : null;
      await actualizarDatosLicitacion(codigo, monto, fechaVencimientoEdit || null);
      setMensaje('Datos guardados correctamente');
      setEditandoLicitacion(null);
      setMontoTotalEdit('');
      setFechaVencimientoEdit('');
      await cargarDatos();
    } catch (err) {
      setError('Error: ' + err.message);
    }
  }
  
  function iniciarEdicion(lic) {
    setEditandoLicitacion(lic.codigo);
    setMontoTotalEdit(lic.monto_total_licitacion || '');
    setFechaVencimientoEdit(lic.fecha_vencimiento || '');
  }

  async function handleAgregar(e) {
    e.preventDefault();
    if (!codigoBusqueda.trim()) return;

    setCargando(true);
    setError(null);
    setMensaje(null);

    try {
      const result = await agregarLicitacion(codigoBusqueda.trim());
      setMensaje(result.message);
      setCodigoBusqueda('');
      await cargarDatos();
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setCargando(false);
    }
  }

  // Función para filtrar y ordenar licitaciones
  function getLicitacionesFiltradas() {
    let resultado = [...licitaciones];
    
    // Filtrar por institución
    if (filtroInstitucion) {
      resultado = resultado.filter(l => l.institucion_id === parseInt(filtroInstitucion));
    }
    
    // Filtrar por línea
    if (filtroLinea) {
      resultado = resultado.filter(l => l.linea === filtroLinea);
    }
    
    // Filtrar por mes de OC
    if (filtroMesOC) {
      resultado = resultado.filter(l => {
        const ordenes = ordenesExpandidas[l.codigo] || [];
        return ordenes.some(oc => {
          const fechaOC = oc.fecha_envio || oc.fecha_aceptacion;
          if (!fechaOC) return false;
          const mesOC = fechaOC.substring(0, 7); // formato YYYY-MM
          return mesOC === filtroMesOC;
        });
      });
    }
    
    // Ordenar
    if (ordenarPor === 'monto') {
      resultado.sort((a, b) => (b.monto_total_licitacion || 0) - (a.monto_total_licitacion || 0));
    } else if (ordenarPor === 'saldo') {
      resultado.sort((a, b) => {
        const saldoA = saldosLicitaciones[a.codigo]?.saldo ?? Infinity;
        const saldoB = saldosLicitaciones[b.codigo]?.saldo ?? Infinity;
        return saldoA - saldoB; // Menor saldo primero
      });
    } else if (ordenarPor === 'fecha') {
      // Ordenar por fecha de vencimiento: vencidas primero, luego próximas a vencer
      const hoy = new Date();
      resultado.sort((a, b) => {
        const fechaA = a.fecha_vencimiento ? new Date(a.fecha_vencimiento) : new Date('9999-12-31');
        const fechaB = b.fecha_vencimiento ? new Date(b.fecha_vencimiento) : new Date('9999-12-31');
        const diasA = Math.ceil((fechaA - hoy) / (1000 * 60 * 60 * 24));
        const diasB = Math.ceil((fechaB - hoy) / (1000 * 60 * 60 * 24));
        return diasA - diasB; // Vencidas y próximas primero
      });
    }
    
    return resultado;
  }

  async function handleDetectarOC(codigoLicitacion) {
    setDetectandoOC(true);
    setError(null);
    setMensaje(null);
    
    try {
      const result = await detectarOCAutomaticamente(codigoLicitacion);
      setMensaje(result.message);
    } catch (err) {
      setError('Error al detectar OC: ' + err.message);
    } finally {
      setDetectandoOC(false);
      // Forzar recarga completa de datos
      await cargarDatos();
      // Recargar órdenes de la licitación expandida
      try {
        const data = await obtenerLicitacionConOrdenes(codigoLicitacion);
        setOrdenesExpandidas(prev => ({ ...prev, [codigoLicitacion]: data.ordenes }));
      } catch (e) {}
    }
  }

  async function handleAgregarOC(codigoLicitacion) {
    if (!codigosOC.trim()) return;
    
    // Parsear códigos separados por comas, espacios o saltos de línea
    const codigos = codigosOC
      .split(/[,\s\n]+/)
      .map(c => c.trim())
      .filter(c => c.length > 0);
    
    if (codigos.length === 0) return;
    
    setAgregandoOC(true);
    setError(null);
    setMensaje(null);
    
    try {
      const result = await agregarOrdenesDeCompra(codigoLicitacion, codigos);
      setMensaje(result.message);
      setCodigosOC('');
      await cargarDatos();
      // Recargar órdenes de la licitación expandida
      if (expandida === codigoLicitacion) {
        const data = await obtenerLicitacionConOrdenes(codigoLicitacion);
        setOrdenesExpandidas(prev => ({ ...prev, [codigoLicitacion]: data.ordenes }));
      }
    } catch (err) {
      setError('Error al agregar OC: ' + err.message);
    } finally {
      setAgregandoOC(false);
    }
  }

  async function handleEliminar(codigo) {
    if (!confirm(`¿Eliminar licitación ${codigo} y todas sus órdenes de compra?`)) return;

    try {
      await eliminarLicitacion(codigo);
      setMensaje('Licitación eliminada correctamente');
      await cargarDatos();
    } catch (err) {
      setError('Error al eliminar: ' + err.message);
    }
  }

  async function toggleExpandir(codigo) {
    if (expandida === codigo) {
      setExpandida(null);
      return;
    }

    try {
      const data = await obtenerLicitacionConOrdenes(codigo);
      setOrdenesExpandidas(prev => ({ ...prev, [codigo]: data.ordenes }));
      setExpandida(codigo);
    } catch (err) {
      setError('Error al cargar órdenes: ' + err.message);
    }
  }

  async function navegarALicitacion(notif) {
    // Cerrar panel de notificaciones
    setMostrarNotificaciones(false);
    
    // Marcar como leída
    if (!notif.leida) {
      try {
        await marcarNotificacionLeida(notif.id);
        await cargarNotificaciones();
      } catch (e) {}
    }
    
    // Verificar si la licitación existe
    const licitacionCodigo = notif.licitacion_codigo;
    if (!licitacionCodigo) return;
    
    // Expandir la licitación y cargar sus OC
    try {
      const data = await obtenerLicitacionConOrdenes(licitacionCodigo);
      setOrdenesExpandidas(prev => ({ ...prev, [licitacionCodigo]: data.ordenes }));
      setExpandida(licitacionCodigo);
      
      // Hacer scroll a la licitación después de un pequeño delay
      setTimeout(() => {
        const elemento = document.getElementById(`licitacion-${licitacionCodigo}`);
        if (elemento) {
          elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err) {
      setError('Error al navegar a la licitación: ' + err.message);
    }
  }

  async function toggleItemsOC(codigoOC) {
    if (ocExpandida === codigoOC) {
      setOcExpandida(null);
      return;
    }
    
    setOcExpandida(codigoOC);
    
    // Cargar items de BD si no están cargados
    if (!itemsExpandidos[codigoOC]) {
      setCargandoItems(true);
      try {
        const items = await obtenerItemsOC(codigoOC);
        setItemsExpandidos(prev => ({ ...prev, [codigoOC]: items }));
      } catch (err) {
        // No mostrar error, simplemente no hay items
      } finally {
        setCargandoItems(false);
      }
    }
  }

  async function handleActualizarItemsOC(codigoOC, e) {
    e.stopPropagation();
    setActualizandoItems(codigoOC);
    setError(null);
    
    try {
      const resultado = await actualizarItemsOC(codigoOC);
      setItemsExpandidos(prev => ({ ...prev, [codigoOC]: resultado.items }));
      setMensaje(`Items actualizados: ${resultado.items.length} productos`);
      setOcExpandida(codigoOC); // Expandir para mostrar items
    } catch (err) {
      setError('Error al actualizar items: ' + err.message);
    } finally {
      setActualizandoItems(null);
    }
  }

  function getEstadoColor(estado) {
    const colores = {
      'Publicada': 'bg-blue-100 text-blue-800',
      'Cerrada': 'bg-gray-100 text-gray-800',
      'Adjudicada': 'bg-green-100 text-green-800',
      'Desierta': 'bg-yellow-100 text-yellow-800',
      'Revocada': 'bg-red-100 text-red-800',
      'Suspendida': 'bg-orange-100 text-orange-800',
      'Aceptada': 'bg-green-100 text-green-800',
      'Enviada a Proveedor': 'bg-blue-100 text-blue-800',
      'Cancelada': 'bg-red-100 text-red-800',
      'Recepción Conforme': 'bg-emerald-100 text-emerald-800'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800';
  }

  // Si no hay usuario, mostrar pantalla de autenticación
  if (!usuario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 w-full max-w-md">
          <div className="flex items-center gap-3 mb-6 justify-center">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Seguimiento de Licitaciones</h1>
              <p className="text-sm text-slate-500">Mercado Público Chile</p>
            </div>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}
          
          {vistaAuth === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="text-lg font-semibold text-center">Iniciar Sesión</h2>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg"
                required
              />
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg"
                required
              />
              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Ingresar
              </button>
              <p className="text-center text-sm text-slate-500">
                ¿No tienes cuenta?{' '}
                <button type="button" onClick={() => { setVistaAuth('registro'); setError(null); }} className="text-blue-600 hover:underline">
                  Crear cuenta
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegistro} className="space-y-4">
              <h2 className="text-lg font-semibold text-center">Crear Cuenta</h2>
              <input
                type="text"
                value={authNombre}
                onChange={(e) => setAuthNombre(e.target.value)}
                placeholder="Nombre (opcional)"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg"
              />
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg"
                required
              />
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Contraseña (mín. 6 caracteres)"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg"
                required
              />
              <input
                type="password"
                value={authPasswordConfirm}
                onChange={(e) => setAuthPasswordConfirm(e.target.value)}
                placeholder="Confirmar contraseña"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg"
                required
              />
              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Crear Cuenta
              </button>
              <p className="text-center text-sm text-slate-500">
                ¿Ya tienes cuenta?{' '}
                <button type="button" onClick={() => { setVistaAuth('login'); setError(null); }} className="text-blue-600 hover:underline">
                  Iniciar sesión
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Vista de perfil
  if (vistaAuth === 'perfil') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Mi Cuenta</h2>
              <button onClick={() => setVistaAuth('login')} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}
            {mensaje && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                {mensaje}
              </div>
            )}
            
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Email</p>
              <p className="font-medium">{usuario.email}</p>
              {usuario.nombre && (
                <>
                  <p className="text-sm text-slate-500 mt-2">Nombre</p>
                  <p className="font-medium">{usuario.nombre}</p>
                </>
              )}
            </div>
            
            <form onSubmit={handleCambiarPassword} className="space-y-4 mb-6">
              <h3 className="font-semibold">Cambiar Contraseña</h3>
              <input
                type="password"
                value={authPasswordActual}
                onChange={(e) => setAuthPasswordActual(e.target.value)}
                placeholder="Contraseña actual"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <input
                type="password"
                value={authPasswordNuevo}
                onChange={(e) => setAuthPasswordNuevo(e.target.value)}
                placeholder="Nueva contraseña"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <input
                type="password"
                value={authPasswordConfirm}
                onChange={(e) => setAuthPasswordConfirm(e.target.value)}
                placeholder="Confirmar nueva contraseña"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                Cambiar Contraseña
              </button>
            </form>
            
            <button
              onClick={handleEliminarCuenta}
              className="w-full py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
            >
              Eliminar Cuenta
            </button>
          </div>
        </div>
      </div>
    );
  }

  const licitacionesFiltradas = getLicitacionesFiltradas();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Seguimiento de Licitaciones</h1>
                <p className="text-sm text-slate-500">Mercado Público Chile</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Botón de notificaciones */}
              <div className="relative">
                <button
                  onClick={() => { setMostrarNotificaciones(!mostrarNotificaciones); cargarNotificaciones(); }}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    contadorNotif > 0 
                      ? 'text-orange-600 bg-orange-50 hover:bg-orange-100 animate-pulse' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {contadorNotif > 0 ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                  {contadorNotif > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {contadorNotif > 9 ? '9+' : contadorNotif}
                    </span>
                  )}
                </button>
                
                {/* Panel de notificaciones */}
                {mostrarNotificaciones && (
                  <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-[500px] overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white flex items-center gap-2">
                          <Bell className="w-5 h-5" />
                          Notificaciones
                        </h3>
                        <button 
                          onClick={() => setMostrarNotificaciones(false)}
                          className="text-white/80 hover:text-white"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto">
                      {notificaciones.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                          <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                          <p>No hay notificaciones</p>
                        </div>
                      ) : (
                        notificaciones.map(notif => (
                          <div 
                            key={notif.id} 
                            className={`p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                              !notif.leida ? 'bg-blue-50/50' : ''
                            }`}
                            onClick={() => navegarALicitacion(notif)}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${!notif.leida ? 'bg-orange-100' : 'bg-slate-100'}`}>
                                <ShoppingCart className={`w-4 h-4 ${!notif.leida ? 'text-orange-600' : 'text-slate-500'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${!notif.leida ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                                  {notif.titulo}
                                </p>
                                <p className="text-sm text-slate-600 mt-1">{notif.mensaje}</p>
                                <p className="text-xs text-slate-400 mt-2">
                                  {new Date(notif.fecha_creada).toLocaleString('es-CL')}
                                </p>
                                {notif.licitacion_codigo && (
                                  <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                                    <ExternalLink className="w-3 h-3" />
                                    Ver licitación {notif.licitacion_codigo}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEliminarNotificacion(notif.id); }}
                                className="text-slate-400 hover:text-red-500 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {notificaciones.length > 0 && (
                      <div className="p-3 border-t border-slate-200 bg-slate-50 flex gap-2">
                        <button
                          onClick={handleMarcarTodasLeidas}
                          className="flex-1 text-sm text-blue-600 hover:bg-blue-50 py-2 rounded-lg"
                        >
                          Marcar todas leídas
                        </button>
                        <button
                          onClick={handleEliminarTodasNotificaciones}
                          className="flex-1 text-sm text-red-600 hover:bg-red-50 py-2 rounded-lg"
                        >
                          Eliminar todas
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => setMostrarSync(true)}
                className="flex items-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Sincronizar
              </button>
              <button
                onClick={handleBuscarOC}
                disabled={importandoNube}
                className="flex items-center gap-2 px-3 py-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg text-sm font-medium disabled:opacity-50"
                title="Buscar nuevas OC en Mercado Público"
              >
                {importandoNube ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Cloud className="w-4 h-4" />
                )}
                {importandoNube ? 'Buscando...' : 'Buscar OC'}
              </button>
              <button
                onClick={() => { setVistaAuth('perfil'); setError(null); setMensaje(null); }}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <User className="w-4 h-4" />
                <span className="text-sm">{usuario.nombre || usuario.email}</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modal de Sincronización */}
      {mostrarSync && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Sincronizar con Railway</h2>
              <button onClick={() => setMostrarSync(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-slate-600 mb-4">
              Envía los datos de tu aplicación local a Railway para que estén disponibles online.
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL de Railway</label>
                <input
                  type="url"
                  value={railwayUrl}
                  onChange={(e) => setRailwayUrl(e.target.value)}
                  placeholder="https://tu-app.railway.app"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email de Railway</label>
                <input
                  type="email"
                  value={railwayEmail}
                  onChange={(e) => setRailwayEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña de Railway</label>
                <input
                  type="password"
                  value={railwayPassword}
                  onChange={(e) => setRailwayPassword(e.target.value)}
                  placeholder="Tu contraseña de la cuenta en Railway"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setMostrarSync(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSincronizarRailway}
                disabled={sincronizando || !railwayUrl || !railwayEmail || !railwayPassword}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sincronizando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Sincronizar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mensajes */}
        {mensaje && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 text-sm">{mensaje}</p>
            <button onClick={() => setMensaje(null)} className="ml-auto text-green-600 hover:text-green-800">×</button>
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">×</button>
          </div>
        )}

        {/* Formulario de búsqueda */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
          <form onSubmit={handleAgregar} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={codigoBusqueda}
                onChange={(e) => setCodigoBusqueda(e.target.value)}
                placeholder="Código de licitación (ej: 4309-76-LR25)"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={cargando || !codigoBusqueda.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </form>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">Filtros:</span>
            </div>
            <select
              value={filtroInstitucion}
              onChange={(e) => setFiltroInstitucion(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
            >
              <option value="">Todas las instituciones</option>
              {instituciones.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.nombre}</option>
              ))}
            </select>
            <select
              value={filtroLinea}
              onChange={(e) => setFiltroLinea(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
            >
              <option value="">Todas las líneas</option>
              {lineas.map(lin => (
                <option key={lin} value={lin}>{lin}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 ml-auto">
              <ArrowUpDown className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">Ordenar:</span>
            </div>
            <select
              value={ordenarPor}
              onChange={(e) => setOrdenarPor(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
            >
              <option value="">Sin ordenar</option>
              <option value="fecha">Por fecha vencimiento</option>
              <option value="monto">Por monto licitación</option>
              <option value="saldo">Por saldo (menor primero)</option>
            </select>
            <select
              value={filtroMesOC}
              onChange={(e) => setFiltroMesOC(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
            >
              <option value="">Todos los meses</option>
              {(() => {
                const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                const opciones = [];
                const hoy = new Date();
                // Generar 24 meses: 12 hacia adelante y 12 hacia atrás desde hoy
                for (let i = 12; i >= -12; i--) {
                  const fecha = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
                  const valor = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
                  const texto = `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
                  opciones.push(<option key={valor} value={valor}>{texto}</option>);
                }
                return opciones;
              })()}
            </select>
            {(filtroInstitucion || filtroLinea || ordenarPor || filtroMesOC) && (
              <button
                onClick={() => { setFiltroInstitucion(''); setFiltroLinea(''); setOrdenarPor(''); setFiltroMesOC(''); }}
                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Lista de licitaciones */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900">
              Licitaciones ({licitacionesFiltradas.length})
            </h2>
          </div>

          {cargando && licitaciones.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>Cargando...</p>
            </div>
          ) : licitacionesFiltradas.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay licitaciones {(filtroInstitucion || filtroLinea || filtroMesOC) ? 'con estos filtros' : 'almacenadas'}</p>
              <p className="text-sm mt-2">Agrega una licitación usando el formulario de arriba</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {licitacionesFiltradas.map((lic) => (
                <div key={lic.codigo} id={`licitacion-${lic.codigo}`} className="hover:bg-slate-50 transition-colors">
                  <div 
                    className="px-6 py-4 cursor-pointer"
                    onClick={() => toggleExpandir(lic.codigo)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-sm font-medium text-blue-600">{lic.codigo}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(lic.estado)}`}>
                            {lic.estado}
                          </span>
                          {lic.linea && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {lic.linea}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-900 font-medium truncate">{lic.nombre}</p>
                        <p className="text-sm text-slate-500 mt-1">{lic.organismo}</p>
                        {lic.institucion_id && (
                          <p className="text-xs text-purple-600 mt-1">
                            <Building2 className="w-3 h-3 inline mr-1" />
                            {instituciones.find(i => i.id === lic.institucion_id)?.nombre}
                          </p>
                        )}
                        {/* Mostrar Monto Total OC siempre visible */}
                        <div className="flex gap-4 mt-2 text-sm flex-wrap">
                          <div>
                            <span className="text-slate-500">Total OC:</span>{' '}
                            <span className="font-semibold text-green-600">{formatearMonto(montosOC[lic.codigo] || 0)}</span>
                          </div>
                          {lic.monto_total_licitacion && (
                            <>
                              <div>
                                <span className="text-slate-500">Monto Licitación:</span>{' '}
                                <span className="font-semibold text-slate-900">{formatearMonto(lic.monto_total_licitacion)}</span>
                              </div>
                              {saldosLicitaciones[lic.codigo] && (
                                <div>
                                  <span className="text-slate-500">Saldo:</span>{' '}
                                  <span className={`font-semibold ${saldosLicitaciones[lic.codigo].saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatearMonto(saldosLicitaciones[lic.codigo].saldo)}
                                  </span>
                                  {lic.monto_total_licitacion > 0 && (
                                    <span className={`ml-2 text-sm ${saldosLicitaciones[lic.codigo].saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      ({((saldosLicitaciones[lic.codigo].saldo / lic.monto_total_licitacion) * 100).toFixed(1)}%)
                                    </span>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {lic.fecha_vencimiento && (() => {
                          const hoy = new Date();
                          const vencimiento = new Date(lic.fecha_vencimiento);
                          const diasRestantes = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));
                          let colorDias = 'text-green-600';
                          if (diasRestantes < 0) colorDias = 'text-red-600';
                          else if (diasRestantes < 90) colorDias = 'text-red-600';
                          else if (diasRestantes < 180) colorDias = 'text-yellow-600';
                          
                          return (
                            <p className="text-xs text-orange-600 mt-1">
                              <Clock className="w-3 h-3 inline mr-1" />
                              Vence: {formatearFecha(lic.fecha_vencimiento)}
                              <span className={`ml-2 font-bold ${colorDias}`}>
                                {diasRestantes < 0 
                                  ? `Vencida hace ${Math.abs(diasRestantes)} días`
                                  : diasRestantes === 0 
                                    ? 'Vence hoy'
                                    : `Quedan ${diasRestantes} días`}
                              </span>
                            </p>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Cierre</p>
                          <p className="font-medium text-slate-900">{formatearFecha(lic.fecha_cierre)}</p>
                        </div>
                        {/* Botón editar (lápiz) */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setModoEdicion(modoEdicion === lic.codigo ? null : lic.codigo); }}
                          className={`p-2 rounded-lg transition-colors ${modoEdicion === lic.codigo ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                          title="Editar"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEliminar(lic.codigo); }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        {expandida === lic.codigo ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Panel de edición (visible solo al presionar lápiz) */}
                  {modoEdicion === lic.codigo && (
                    <div className="px-6 py-4 bg-slate-100 border-t border-slate-200">
                      <div className="space-y-4">
                        {/* Asignar Institución y Línea */}
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-sm text-purple-800 font-medium mb-2">Asignar a Institución y Línea</p>
                          <div className="flex gap-2 flex-wrap">
                            <select
                              value={institucionSeleccionada}
                              onChange={(e) => setInstitucionSeleccionada(e.target.value)}
                              className="px-3 py-2 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="">Seleccionar institución...</option>
                              {instituciones.map(inst => (
                                <option key={inst.id} value={inst.id}>{inst.nombre}</option>
                              ))}
                            </select>
                            <select
                              value={lineaSeleccionada}
                              onChange={(e) => setLineaSeleccionada(e.target.value)}
                              className="px-3 py-2 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="">Seleccionar línea...</option>
                              {lineas.map(lin => (
                                <option key={lin} value={lin}>{lin}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleAsignarLicitacion(lic.codigo)}
                              disabled={!institucionSeleccionada || !lineaSeleccionada}
                              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
                            >
                              Asignar
                            </button>
                          </div>
                        </div>
                        
                        {/* Editar Monto Total y Fecha Vencimiento */}
                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                          <p className="text-sm text-amber-800 font-medium mb-2">Datos de la Licitación</p>
                          <div className="flex gap-2 flex-wrap items-end">
                            <div>
                              <label className="text-xs text-amber-600 block">Monto Total Licitación</label>
                              <input
                                type="number"
                                value={montoTotalEdit}
                                onChange={(e) => setMontoTotalEdit(e.target.value)}
                                placeholder={lic.monto_total_licitacion || 'Monto total'}
                                className="w-40 px-3 py-2 text-sm border border-amber-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-amber-600 block">Fecha Vencimiento</label>
                              <input
                                type="date"
                                value={fechaVencimientoEdit || lic.fecha_vencimiento || ''}
                                onChange={(e) => setFechaVencimientoEdit(e.target.value)}
                                className="px-3 py-2 text-sm border border-amber-300 rounded-lg"
                              />
                            </div>
                            <button
                              onClick={() => handleGuardarDatosLicitacion(lic.codigo)}
                              className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 flex items-center gap-1"
                            >
                              <Save className="w-4 h-4" /> Guardar
                            </button>
                          </div>
                        </div>
                        
                        {/* Agregar OC manualmente */}
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-800 mb-2 font-medium">Agregar OC manualmente</p>
                          <p className="text-xs text-blue-600 mb-3">
                            Códigos separados por comas (ej: 4309-19024-SE25, 4309-19025-SE25)
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={codigosOC}
                              onChange={(e) => setCodigosOC(e.target.value)}
                              placeholder="4309-19024-SE25, 4309-19025-SE25..."
                              className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded-lg"
                            />
                            <button
                              onClick={() => handleAgregarOC(lic.codigo)}
                              disabled={agregandoOC || !codigosOC.trim()}
                              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                              {agregandoOC ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                              Agregar OC
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Órdenes de compra expandidas */}
                  {expandida === lic.codigo && ordenesExpandidas[lic.codigo] && (
                    <div className="px-6 pb-6">
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-green-600" />
                            Órdenes de Compra ({ordenesExpandidas[lic.codigo].length})
                          </h3>
                          {/* Botón para detectar OC automáticamente */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDetectarOC(lic.codigo); }}
                            disabled={detectandoOC}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                          >
                            {detectandoOC ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Detectando...
                              </>
                            ) : (
                              <>
                                <Search className="w-4 h-4" />
                                Detectar OC
                              </>
                            )}
                          </button>
                        </div>
                        
                        {ordenesExpandidas[lic.codigo].length === 0 ? (
                          <p className="text-slate-500 text-sm">No hay órdenes de compra asociadas. Usa el formulario de arriba para agregar OC.</p>
                        ) : (
                          <div className="space-y-3">
                            {ordenesExpandidas[lic.codigo].map((orden) => (
                              <div key={orden.codigo} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                <div 
                                  className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                                  onClick={() => toggleItemsOC(orden.codigo)}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <button className="text-slate-400 hover:text-slate-600">
                                          <ChevronDown className={`w-4 h-4 transition-transform ${ocExpandida === orden.codigo ? 'rotate-180' : ''}`} />
                                        </button>
                                        <a 
                                          href={`https://www.mercadopublico.cl/PurchaseOrder/Modules/PO/DetailsPurchaseOrder.aspx?codigoOC=${orden.codigo}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-mono text-sm font-medium text-green-600 hover:text-green-800 hover:underline flex items-center gap-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {orden.codigo}
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(orden.estado)}`}>
                                          {orden.estado}
                                        </span>
                                      </div>
                                      <p className="text-sm text-slate-900 truncate ml-6">{orden.nombre}</p>
                                      <p className="text-sm text-slate-500 mt-1 ml-6">
                                        <span className="font-medium">Proveedor:</span> {orden.proveedor || 'N/A'}
                                      </p>
                                      <p className="text-xs text-slate-400 mt-1 ml-6">
                                        Envío: {formatearFecha(orden.fecha_envio)}
                                      </p>
                                    </div>
                                    <div className="text-right ml-4 flex items-start gap-2">
                                      <div>
                                        <p className="text-lg font-bold text-slate-900">
                                          {formatearMonto(orden.monto, orden.moneda)}
                                        </p>
                                        <p className="text-xs text-slate-500">{orden.moneda}</p>
                                      </div>
                                      <button
                                        onClick={(e) => handleActualizarItemsOC(orden.codigo, e)}
                                        disabled={actualizandoItems === orden.codigo}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="Actualizar detalle de productos"
                                      >
                                        <RefreshCw className={`w-4 h-4 ${actualizandoItems === orden.codigo ? 'animate-spin' : ''}`} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Items/Productos de la OC */}
                                {ocExpandida === orden.codigo && (
                                  <div className="border-t border-slate-200 bg-slate-50 p-4">
                                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                      <Package className="w-4 h-4" />
                                      Productos/Servicios
                                    </h4>
                                    {cargandoItems ? (
                                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Cargando items...
                                      </div>
                                    ) : itemsExpandidos[orden.codigo]?.length > 0 ? (
                                      <div className="space-y-2">
                                        <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 pb-2 border-b border-slate-200">
                                          <div className="col-span-1">Cant.</div>
                                          <div className="col-span-6">Producto/Material</div>
                                          <div className="col-span-2 text-right">P. Unit.</div>
                                          <div className="col-span-3 text-right">Total</div>
                                        </div>
                                        {itemsExpandidos[orden.codigo].map((item, idx) => (
                                          <div key={idx} className="grid grid-cols-12 gap-2 text-sm py-2 border-b border-slate-100 last:border-0">
                                            <div className="col-span-1 font-medium">{item.cantidad}</div>
                                            <div className="col-span-6">
                                              <p className="font-medium text-slate-900">{item.especificacion_proveedor || item.producto}</p>
                                              {item.especificacion_comprador && (
                                                <p className="text-xs text-slate-500 mt-0.5">{item.especificacion_comprador}</p>
                                              )}
                                            </div>
                                            <div className="col-span-2 text-right text-slate-600">{formatearMonto(item.precio_neto)}</div>
                                            <div className="col-span-3 text-right font-semibold text-slate-900">{formatearMonto(item.total)}</div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-slate-500">No se encontraron items para esta OC</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                            <div className="mt-4 pt-4 border-t border-slate-200">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-slate-900">Total Órdenes de Compra</span>
                                <span className="text-xl font-bold text-green-600">
                                  {formatearMonto(ordenesExpandidas[lic.codigo].reduce((sum, o) => sum + (o.monto || 0), 0))}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-slate-500">
            Datos obtenidos de la API de{' '}
            <a href="https://www.mercadopublico.cl" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Mercado Público Chile
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
