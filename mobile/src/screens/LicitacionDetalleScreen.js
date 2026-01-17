import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useData } from '../contexts/DataContext';
import { formatearMonto, formatearFecha } from '../config/api';

const COLORS = {
  primary: '#1e40af',
  secondary: '#3b82f6',
  background: '#f1f5f9',
  white: '#ffffff',
  text: '#1e293b',
  textLight: '#64748b',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  border: '#e2e8f0'
};

const PROVEEDORES_DESTACADOS = ['RECETARIO MAGISTRAL', 'FRESENIUS KABI'];

export default function LicitacionDetalleScreen({ route, navigation }) {
  const { licitacion: licitacionInicial } = route.params;
  const {
    instituciones,
    lineas,
    saldos,
    ordenesPorLicitacion,
    cargarDatos,
    asignarLicitacion,
    actualizarDatosLicitacion,
    eliminarLicitacion,
    obtenerItemsLicitacion,
    obtenerItemsOC,
    actualizarItemsOC,
    getLicitacion
  } = useData();

  // Obtener datos actualizados del contexto (se actualiza inmediatamente)
  const licitacion = getLicitacion(licitacionInicial.codigo) || licitacionInicial;

  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [showOCItemsModal, setShowOCItemsModal] = useState(false);
  
  // Edición - usar useEffect para actualizar cuando cambia la licitación
  const [institucionEdit, setInstitucionEdit] = useState(String(licitacion.institucion_id || ''));
  const [lineaEdit, setLineaEdit] = useState(licitacion.linea || '');
  const [montoEdit, setMontoEdit] = useState(String(licitacion.monto_total_licitacion || ''));
  const [fechaEdit, setFechaEdit] = useState(licitacion.fecha_vencimiento || '');
  const [guardando, setGuardando] = useState(false);
  
  // Actualizar campos del formulario cuando cambia la licitación
  useEffect(() => {
    setInstitucionEdit(String(licitacion.institucion_id || ''));
    setLineaEdit(licitacion.linea || '');
    setMontoEdit(String(licitacion.monto_total_licitacion || ''));
    setFechaEdit(licitacion.fecha_vencimiento || '');
  }, [licitacion]);
  
  // Items
  const [itemsLicitacion, setItemsLicitacion] = useState([]);
  const [itemsOC, setItemsOC] = useState([]);
  const [cargandoItems, setCargandoItems] = useState(false);
  const [ocSeleccionada, setOcSeleccionada] = useState(null);
  const [actualizandoOC, setActualizandoOC] = useState(null);

  const ordenes = ordenesPorLicitacion[licitacion.codigo] || [];
  const saldo = saldos[licitacion.codigo] || {};
  const institucion = instituciones.find(i => i.id === licitacion.institucion_id);

  const handleRefresh = async () => {
    setRefreshing(true);
    await cargarDatos(true);
    setRefreshing(false);
  };

  const handleGuardar = async () => {
    setGuardando(true);
    
    await asignarLicitacion(licitacion.codigo, institucionEdit ? parseInt(institucionEdit) : null, lineaEdit);
    await actualizarDatosLicitacion(
      licitacion.codigo, 
      montoEdit ? parseFloat(montoEdit) : null,
      fechaEdit || null
    );
    
    setGuardando(false);
    setShowEditModal(false);
  };

  const handleVerItems = async () => {
    setShowItemsModal(true);
    setCargandoItems(true);
    const items = await obtenerItemsLicitacion(licitacion.codigo);
    setItemsLicitacion(items);
    setCargandoItems(false);
  };

  const handleVerItemsOC = async (oc) => {
    setOcSeleccionada(oc);
    setShowOCItemsModal(true);
    setCargandoItems(true);
    const items = await obtenerItemsOC(oc.codigo);
    setItemsOC(items);
    setCargandoItems(false);
  };

  const handleActualizarItemsOC = async (codigoOC) => {
    setActualizandoOC(codigoOC);
    const items = await actualizarItemsOC(codigoOC);
    if (ocSeleccionada?.codigo === codigoOC) {
      setItemsOC(items);
    }
    setActualizandoOC(null);
  };

  const abrirEnMercadoPublico = () => {
    Linking.openURL(`https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=kCw31V4M1mOLpHKCsYxrxw==&IdLicitacion=${licitacion.codigo}`);
  };

  const abrirOCEnNavegador = (codigoOC) => {
    Linking.openURL(`https://www.mercadopublico.cl/PurchaseOrder/Modules/PO/DetailsPurchaseOrder.aspx?codigoOC=${codigoOC}`);
  };

  const handleEliminar = () => {
    Alert.alert(
      'Eliminar Licitación',
      `¿Estás seguro de eliminar la licitación ${licitacion.codigo}?\n\nEsta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const result = await eliminarLicitacion(licitacion.codigo);
            if (result.success) {
              navigation.goBack();
            } else {
              Alert.alert('Error', result.error || 'No se pudo eliminar la licitación');
            }
          }
        }
      ]
    );
  };

  const getEstadoOCColor = (estado) => {
    if (estado?.includes('Aceptada')) return { bg: '#dcfce7', text: '#16a34a' };
    if (estado?.includes('Enviada')) return { bg: '#dbeafe', text: '#1e40af' };
    if (estado?.includes('Recepción')) return { bg: '#fef3c7', text: '#d97706' };
    return { bg: '#f1f5f9', text: '#64748b' };
  };

  const esProveedorDestacado = (nombre) => {
    if (!nombre) return false;
    return PROVEEDORES_DESTACADOS.some(p => nombre.toUpperCase().includes(p));
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Cabecera */}
        <View style={styles.header}>
          <Text style={styles.codigo}>{licitacion.codigo}</Text>
          <View style={[styles.estadoBadge, { backgroundColor: licitacion.estado === 'Adjudicada' ? '#dcfce7' : '#dbeafe' }]}>
            <Text style={[styles.estadoText, { color: licitacion.estado === 'Adjudicada' ? '#16a34a' : '#1e40af' }]}>
              {licitacion.estado}
            </Text>
          </View>
        </View>

        <Text style={styles.nombre}>{licitacion.nombre}</Text>

        {/* Acciones */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowEditModal(true)}>
            <Ionicons name="pencil" size={18} color={COLORS.primary} />
            <Text style={styles.actionText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleVerItems}>
            <Ionicons name="information-circle" size={18} color={COLORS.primary} />
            <Text style={styles.actionText}>Items</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={abrirEnMercadoPublico}>
            <Ionicons name="open-outline" size={18} color={COLORS.primary} />
            <Text style={styles.actionText}>Web</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleEliminar}>
            <Ionicons name="trash" size={18} color={COLORS.danger} />
            <Text style={[styles.actionText, { color: COLORS.danger }]}>Eliminar</Text>
          </TouchableOpacity>
        </View>

        {/* Info de institución */}
        {institucion && (
          <View style={styles.infoCard}>
            <Ionicons name="business" size={20} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Institución</Text>
              <Text style={styles.infoValue}>{institucion.nombre}</Text>
              {licitacion.linea && <Text style={styles.infoSubvalue}>{licitacion.linea}</Text>}
            </View>
          </View>
        )}

        {/* Montos */}
        <View style={styles.montosCard}>
          <View style={styles.montoItem}>
            <Text style={styles.montoLabel}>Monto Licitación</Text>
            <Text style={styles.montoValue}>{formatearMonto(licitacion.monto_total_licitacion || 0)}</Text>
          </View>
          <View style={styles.montoItem}>
            <Text style={styles.montoLabel}>Monto OC</Text>
            <Text style={[styles.montoValue, { color: COLORS.success }]}>{formatearMonto(saldo.montoOC || 0)}</Text>
          </View>
          <View style={styles.montoItem}>
            <Text style={styles.montoLabel}>Saldo</Text>
            <Text style={[styles.montoValue, { color: (saldo.saldo || 0) < 0 ? COLORS.danger : COLORS.text }]}>
              {formatearMonto(saldo.saldo || 0)}
            </Text>
          </View>
        </View>

        {licitacion.fecha_vencimiento && (
          <View style={styles.fechaCard}>
            <Ionicons name="calendar" size={20} color={COLORS.warning} />
            <Text style={styles.fechaText}>Vence: {formatearFecha(licitacion.fecha_vencimiento)}</Text>
          </View>
        )}

        {/* Órdenes de Compra */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Órdenes de Compra ({ordenes.length})</Text>
          
          {ordenes.length === 0 ? (
            <View style={styles.emptyOC}>
              <Ionicons name="cart-outline" size={40} color={COLORS.textLight} />
              <Text style={styles.emptyOCText}>No hay órdenes de compra</Text>
            </View>
          ) : (
            ordenes.map(oc => {
              const estadoColor = getEstadoOCColor(oc.estado);
              return (
                <TouchableOpacity 
                  key={oc.codigo} 
                  style={styles.ocCard}
                  onPress={() => handleVerItemsOC(oc)}
                  onLongPress={() => abrirOCEnNavegador(oc.codigo)}
                  delayLongPress={500}
                >
                  <View style={styles.ocHeader}>
                    <Text style={styles.ocCodigo}>{oc.codigo}</Text>
                    <TouchableOpacity
                      style={styles.refreshOCButton}
                      onPress={() => handleActualizarItemsOC(oc.codigo)}
                      disabled={actualizandoOC === oc.codigo}
                    >
                      <Ionicons 
                        name="refresh" 
                        size={16} 
                        color={COLORS.textLight}
                        style={actualizandoOC === oc.codigo && { opacity: 0.5 }}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.ocEstado, { backgroundColor: estadoColor.bg }]}>
                    <Text style={[styles.ocEstadoText, { color: estadoColor.text }]}>{oc.estado}</Text>
                  </View>
                  <Text style={styles.ocProveedor} numberOfLines={1}>{oc.proveedor}</Text>
                  <View style={styles.ocFooter}>
                    <Text style={styles.ocFecha}>{formatearFecha(oc.fecha_envio || oc.fecha_aceptacion)}</Text>
                    <Text style={styles.ocMonto}>{formatearMonto(oc.monto, oc.moneda)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal Editar */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Licitación</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Institución</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={institucionEdit} onValueChange={setInstitucionEdit} style={styles.picker}>
                <Picker.Item label="Sin asignar" value="" />
                {instituciones.map(inst => (
                  <Picker.Item key={inst.id} label={inst.nombre} value={String(inst.id)} />
                ))}
              </Picker>
            </View>

            <Text style={styles.inputLabel}>Línea</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={lineaEdit} onValueChange={setLineaEdit} style={styles.picker}>
                <Picker.Item label="Sin línea" value="" />
                {lineas.map(linea => (
                  <Picker.Item key={linea} label={linea} value={linea} />
                ))}
              </Picker>
            </View>

            <Text style={styles.inputLabel}>Monto Total Licitación</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 50000000"
              value={montoEdit}
              onChangeText={setMontoEdit}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Fecha Vencimiento (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 2026-12-31"
              value={fechaEdit}
              onChangeText={setFechaEdit}
            />

            <TouchableOpacity
              style={[styles.submitButton, guardando && styles.buttonDisabled]}
              onPress={handleGuardar}
              disabled={guardando}
            >
              {guardando ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitButtonText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Items Licitación */}
      <Modal visible={showItemsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Productos de la Licitación</Text>
              <TouchableOpacity onPress={() => setShowItemsModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {cargandoItems ? (
              <View style={styles.loadingItems}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Obteniendo productos...</Text>
              </View>
            ) : itemsLicitacion.length > 0 ? (
              <ScrollView style={styles.itemsList}>
                {itemsLicitacion.map((item, idx) => {
                  const destacado = esProveedorDestacado(item.proveedor_nombre);
                  return (
                    <View 
                      key={idx} 
                      style={[
                        styles.itemCard,
                        item.adjudicado && (destacado ? styles.itemDestacado : styles.itemAdjudicado)
                      ]}
                    >
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemCorrelativo}>#{item.correlativo}</Text>
                        <Text style={styles.itemCantidad}>{item.cantidad} {item.unidad_medida}</Text>
                      </View>
                      <Text style={styles.itemNombre}>{item.nombre_producto}</Text>
                      <Text style={styles.itemDescripcion} numberOfLines={2}>{item.descripcion}</Text>
                      {item.adjudicado ? (
                        <View style={styles.itemAdjudicacion}>
                          <Text style={[styles.itemProveedor, destacado && { color: COLORS.success }]}>
                            {item.proveedor_nombre}
                          </Text>
                          <Text style={styles.itemMonto}>{formatearMonto(item.monto_unitario)}</Text>
                        </View>
                      ) : (
                        <Text style={styles.sinAdjudicar}>Sin adjudicar</Text>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyItems}>
                <Ionicons name="cube-outline" size={50} color={COLORS.textLight} />
                <Text style={styles.emptyItemsText}>No se encontraron productos</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Items OC */}
      <Modal visible={showOCItemsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Productos de la OC</Text>
                <Text style={styles.modalSubtitle}>{ocSeleccionada?.codigo}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowOCItemsModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {cargandoItems ? (
              <View style={styles.loadingItems}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Obteniendo productos...</Text>
              </View>
            ) : itemsOC.length > 0 ? (
              <ScrollView style={styles.itemsList}>
                {itemsOC.map((item, idx) => (
                  <View key={idx} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemCorrelativo}>#{item.correlativo}</Text>
                      <Text style={styles.itemCantidad}>{item.cantidad} {item.unidad}</Text>
                    </View>
                    <Text style={styles.itemNombre}>{item.producto}</Text>
                    {item.especificacion_comprador && (
                      <Text style={styles.itemDescripcion} numberOfLines={2}>{item.especificacion_comprador}</Text>
                    )}
                    {item.especificacion_proveedor && (
                      <Text style={styles.itemProveedor} numberOfLines={2}>📦 {item.especificacion_proveedor}</Text>
                    )}
                    <View style={styles.itemFooter}>
                      <Text style={styles.itemPrecio}>Precio: {formatearMonto(item.precio_neto)}</Text>
                      <Text style={styles.itemTotal}>Total: {formatearMonto(item.total)}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyItems}>
                <Ionicons name="cube-outline" size={50} color={COLORS.textLight} />
                <Text style={styles.emptyItemsText}>No se encontraron productos</Text>
                <TouchableOpacity
                  style={styles.refreshItemsButton}
                  onPress={() => ocSeleccionada && handleActualizarItemsOC(ocSeleccionada.codigo)}
                >
                  <Ionicons name="refresh" size={18} color={COLORS.white} />
                  <Text style={styles.refreshItemsText}>Actualizar desde API</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: COLORS.white
  },
  codigo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8
  },
  estadoText: {
    fontSize: 13,
    fontWeight: '600'
  },
  nombre: {
    fontSize: 15,
    color: COLORS.text,
    padding: 15,
    paddingTop: 0,
    backgroundColor: COLORS.white,
    lineHeight: 22
  },
  actions: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 15,
    paddingBottom: 15,
    gap: 10
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#dbeafe',
    borderRadius: 8
  },
  actionText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 13
  },
  deleteButton: {
    backgroundColor: '#fee2e2'
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    margin: 15,
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12
  },
  infoContent: {
    flex: 1
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textLight
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text
  },
  infoSubvalue: {
    fontSize: 13,
    color: COLORS.secondary,
    marginTop: 2
  },
  montosCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 15,
    borderRadius: 12
  },
  montoItem: {
    flex: 1,
    alignItems: 'center'
  },
  montoLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 5
  },
  montoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text
  },
  fechaCard: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    gap: 10
  },
  fechaText: {
    color: COLORS.warning,
    fontWeight: '600'
  },
  section: {
    padding: 15
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15
  },
  emptyOC: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.white,
    borderRadius: 12
  },
  emptyOCText: {
    color: COLORS.textLight,
    marginTop: 10
  },
  ocCard: {
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10
  },
  ocHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  ocCodigo: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  },
  refreshOCButton: {
    padding: 5
  },
  ocEstado: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8
  },
  ocEstadoText: {
    fontSize: 11,
    fontWeight: '600'
  },
  ocProveedor: {
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 10
  },
  ocFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10
  },
  ocFecha: {
    fontSize: 12,
    color: COLORS.textLight
  },
  ocMonto: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.success
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 4
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  pickerContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  picker: {
    height: 50
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5
  },
  buttonDisabled: {
    opacity: 0.7
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold'
  },
  loadingItems: {
    alignItems: 'center',
    paddingVertical: 50
  },
  loadingText: {
    color: COLORS.textLight,
    marginTop: 15
  },
  itemsList: {
    maxHeight: 500
  },
  itemCard: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10
  },
  itemDestacado: {
    backgroundColor: '#dcfce7'
  },
  itemAdjudicado: {
    backgroundColor: '#fef3c7'
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  itemCorrelativo: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600'
  },
  itemCantidad: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600'
  },
  itemNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4
  },
  itemDescripcion: {
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 18
  },
  itemAdjudicacion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  itemProveedor: {
    fontSize: 12,
    color: COLORS.warning,
    flex: 1
  },
  itemMonto: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.text
  },
  sinAdjudicar: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: 8
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  itemPrecio: {
    fontSize: 12,
    color: COLORS.textLight
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.success
  },
  emptyItems: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyItemsText: {
    color: COLORS.textLight,
    marginTop: 10,
    marginBottom: 20
  },
  refreshItemsButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8
  },
  refreshItemsText: {
    color: COLORS.white,
    fontWeight: '600'
  }
});
