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
  ArrowUpDown
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
  eliminarCuenta
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
  const [ordenarPor, setOrdenarPor] = useState(''); // 'monto', 'saldo'
  
  // Edición de licitación (botón lápiz)
  const [modoEdicion, setModoEdicion] = useState(null);
  
  // Montos totales OC por licitación
  const [montosOC, setMontosOC] = useState({});
  const [montoTotalEdit, setMontoTotalEdit] = useState('');
  const [fechaVencimientoEdit, setFechaVencimientoEdit] = useState('');
  const [saldosLicitaciones, setSaldosLicitaciones] = useState({});

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
    }
  }, [usuario]);

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
      
      // Cargar saldos y montos OC para todas las licitaciones
      const saldos = {};
      const montos = {};
      for (const lic of lics) {
        try {
          const saldo = await obtenerSaldoLicitacion(lic.codigo);
          saldos[lic.codigo] = saldo;
          montos[lic.codigo] = saldo.montoOC;
        } catch (e) {}
      }
      setSaldosLicitaciones(saldos);
      setMontosOC(montos);
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
    
    // Ordenar
    if (ordenarPor === 'monto') {
      resultado.sort((a, b) => (b.monto_total_licitacion || 0) - (a.monto_total_licitacion || 0));
    } else if (ordenarPor === 'saldo') {
      resultado.sort((a, b) => {
        const saldoA = saldosLicitaciones[a.codigo]?.saldo ?? Infinity;
        const saldoB = saldosLicitaciones[b.codigo]?.saldo ?? Infinity;
        return saldoA - saldoB; // Menor saldo primero
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
              <option value="">Por fecha</option>
              <option value="monto">Por monto licitación</option>
              <option value="saldo">Por saldo (menor primero)</option>
            </select>
            {(filtroInstitucion || filtroLinea || ordenarPor) && (
              <button
                onClick={() => { setFiltroInstitucion(''); setFiltroLinea(''); setOrdenarPor(''); }}
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
              <p>No hay licitaciones {(filtroInstitucion || filtroLinea) ? 'con estos filtros' : 'almacenadas'}</p>
              <p className="text-sm mt-2">Agrega una licitación usando el formulario de arriba</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {licitacionesFiltradas.map((lic) => (
                <div key={lic.codigo} className="hover:bg-slate-50 transition-colors">
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
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {lic.fecha_vencimiento && (
                          <p className="text-xs text-orange-600 mt-1">
                            <Clock className="w-3 h-3 inline mr-1" />
                            Vence: {formatearFecha(lic.fecha_vencimiento)}
                          </p>
                        )}
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
                              <div key={orden.codigo} className="bg-white rounded-lg p-4 border border-slate-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-mono text-sm font-medium text-green-600">{orden.codigo}</span>
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(orden.estado)}`}>
                                        {orden.estado}
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-900 truncate">{orden.nombre}</p>
                                    <p className="text-sm text-slate-500 mt-1">
                                      <span className="font-medium">Proveedor:</span> {orden.proveedor || 'N/A'}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                      Envío: {formatearFecha(orden.fecha_envio)}
                                    </p>
                                  </div>
                                  <div className="text-right ml-4">
                                    <p className="text-lg font-bold text-slate-900">
                                      {formatearMonto(orden.monto, orden.moneda)}
                                    </p>
                                    <p className="text-xs text-slate-500">{orden.moneda}</p>
                                  </div>
                                </div>
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
