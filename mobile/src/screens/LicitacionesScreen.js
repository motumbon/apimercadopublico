import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
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

const MESES = [
  { value: '', label: 'Todos los meses' },
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' }
];

export default function LicitacionesScreen({ navigation, route }) {
  const {
    instituciones,
    lineas,
    saldos,
    ordenesPorLicitacion,
    loading,
    refreshing,
    cargarDatos,
    agregarLicitacion,
    eliminarLicitacion,
    filtroInstitucion,
    setFiltroInstitucion,
    filtroLinea,
    setFiltroLinea,
    filtroMes,
    setFiltroMes,
    ordenarPor,
    setOrdenarPor,
    getLicitacionesFiltradas,
    limpiarFiltros
  } = useData();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [codigoNuevo, setCodigoNuevo] = useState('');
  const [agregando, setAgregando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (route.params?.openAdd) {
      setShowAddModal(true);
    }
  }, [route.params]);

  const licitacionesFiltradas = getLicitacionesFiltradas();
  const hayFiltros = filtroInstitucion || filtroLinea || filtroMes || ordenarPor;

  const handleAgregar = async () => {
    if (!codigoNuevo.trim()) {
      setError('Ingresa un código de licitación');
      return;
    }

    setAgregando(true);
    setError(null);

    const result = await agregarLicitacion(codigoNuevo.trim());
    
    setAgregando(false);
    
    if (result.success) {
      setCodigoNuevo('');
      setShowAddModal(false);
      Alert.alert('Éxito', 'Licitación agregada correctamente');
    } else {
      setError(result.error);
    }
  };

  const handleEliminar = (codigo, nombre) => {
    Alert.alert(
      'Eliminar Licitación',
      `¿Estás seguro de eliminar "${codigo}"?\n\n${nombre}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const result = await eliminarLicitacion(codigo);
            if (!result.success) {
              Alert.alert('Error', result.error);
            }
          }
        }
      ]
    );
  };

  const getEstadoColor = (estado) => {
    const colores = {
      'Publicada': { bg: '#dbeafe', text: '#1e40af' },
      'Cerrada': { bg: '#f1f5f9', text: '#64748b' },
      'Adjudicada': { bg: '#dcfce7', text: '#16a34a' },
      'Desierta': { bg: '#fef3c7', text: '#d97706' },
      'Revocada': { bg: '#fee2e2', text: '#dc2626' }
    };
    return colores[estado] || { bg: '#f1f5f9', text: '#64748b' };
  };

  const renderLicitacion = ({ item: lic }) => {
    const ordenes = ordenesPorLicitacion[lic.codigo] || [];
    const saldo = saldos[lic.codigo];
    const estadoColor = getEstadoColor(lic.estado);
    const institucion = instituciones.find(i => i.id === lic.institucion_id);

    return (
      <TouchableOpacity
        style={styles.licCard}
        onPress={() => navigation.navigate('LicitacionDetalle', { licitacion: lic })}
        activeOpacity={0.7}
      >
        <View style={styles.licHeader}>
          <View style={styles.licHeaderLeft}>
            <Text style={styles.licCodigo}>{lic.codigo}</Text>
            <View style={[styles.estadoBadge, { backgroundColor: estadoColor.bg }]}>
              <Text style={[styles.estadoText, { color: estadoColor.text }]}>{lic.estado}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleEliminar(lic.codigo, lic.nombre)}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        </View>

        <Text style={styles.licNombre} numberOfLines={2}>{lic.nombre}</Text>

        {institucion && (
          <View style={styles.institucionRow}>
            <Ionicons name="business-outline" size={14} color={COLORS.textLight} />
            <Text style={styles.institucionText}>{institucion.nombre}</Text>
            {lic.linea && <Text style={styles.lineaText}>• {lic.linea}</Text>}
          </View>
        )}

        <View style={styles.licFooter}>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>OC</Text>
            <Text style={styles.footerValue}>{ordenes.length}</Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Monto OC</Text>
            <Text style={[styles.footerValue, { color: COLORS.success }]}>
              {formatearMonto(saldo?.montoOC || 0)}
            </Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Saldo</Text>
            <Text style={[styles.footerValue, { color: (saldo?.saldo || 0) < 0 ? COLORS.danger : COLORS.text }]}>
              {formatearMonto(saldo?.saldo || 0)}
            </Text>
          </View>
        </View>

        {lic.fecha_vencimiento && (
          <View style={styles.vencimientoRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.warning} />
            <Text style={styles.vencimientoText}>
              Vence: {formatearFecha(lic.fecha_vencimiento)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Barra de acciones */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>Agregar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, hayFiltros && styles.filterButtonActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="filter" size={18} color={hayFiltros ? COLORS.white : COLORS.primary} />
          <Text style={[styles.filterButtonText, hayFiltros && { color: COLORS.white }]}>
            Filtros {hayFiltros && '•'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contador */}
      <View style={styles.counterRow}>
        <Text style={styles.counterText}>
          {licitacionesFiltradas.length} licitaciones
        </Text>
        {hayFiltros && (
          <TouchableOpacity onPress={limpiarFiltros}>
            <Text style={styles.clearFilters}>Limpiar filtros</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lista */}
      <FlatList
        data={licitacionesFiltradas}
        renderItem={renderLicitacion}
        keyExtractor={(item) => item.codigo}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => cargarDatos(true)}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={60} color={COLORS.textLight} />
            <Text style={styles.emptyText}>
              {hayFiltros ? 'No hay licitaciones con estos filtros' : 'No hay licitaciones'}
            </Text>
            {!hayFiltros && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.emptyButtonText}>Agregar primera licitación</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Modal Agregar */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agregar Licitación</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Código de licitación</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 1380-92-LQ25"
              value={codigoNuevo}
              onChangeText={setCodigoNuevo}
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={[styles.submitButton, agregando && styles.buttonDisabled]}
              onPress={handleAgregar}
              disabled={agregando}
            >
              {agregando ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitButtonText}>Buscar y Agregar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Filtros */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Institución</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filtroInstitucion}
                onValueChange={setFiltroInstitucion}
                style={styles.picker}
              >
                <Picker.Item label="Todas las instituciones" value="" />
                {instituciones.map(inst => (
                  <Picker.Item key={inst.id} label={inst.nombre} value={String(inst.id)} />
                ))}
              </Picker>
            </View>

            <Text style={styles.inputLabel}>Línea</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filtroLinea}
                onValueChange={setFiltroLinea}
                style={styles.picker}
              >
                <Picker.Item label="Todas las líneas" value="" />
                {lineas.map(linea => (
                  <Picker.Item key={linea} label={linea} value={linea} />
                ))}
              </Picker>
            </View>

            <Text style={styles.inputLabel}>Mes de OC</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filtroMes}
                onValueChange={setFiltroMes}
                style={styles.picker}
              >
                {MESES.map(mes => (
                  <Picker.Item key={mes.value} label={mes.label} value={mes.value} />
                ))}
              </Picker>
            </View>

            <Text style={styles.inputLabel}>Ordenar por</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={ordenarPor}
                onValueChange={setOrdenarPor}
                style={styles.picker}
              >
                <Picker.Item label="Sin ordenar" value="" />
                <Picker.Item label="Por monto" value="monto" />
                <Picker.Item label="Por saldo (menor primero)" value="saldo" />
              </Picker>
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  limpiarFiltros();
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.clearButtonText}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyButtonText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
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
  actionBar: {
    flexDirection: 'row',
    padding: 15,
    gap: 10
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 15
  },
  filterButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.primary
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary
  },
  filterButtonText: {
    color: COLORS.primary,
    fontWeight: '600'
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 10
  },
  counterText: {
    color: COLORS.textLight,
    fontSize: 14
  },
  clearFilters: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500'
  },
  listContent: {
    padding: 15,
    paddingTop: 0
  },
  licCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12
  },
  licHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  licHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  licCodigo: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  estadoText: {
    fontSize: 11,
    fontWeight: '600'
  },
  deleteButton: {
    padding: 5
  },
  licNombre: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 10,
    lineHeight: 20
  },
  institucionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12
  },
  institucionText: {
    fontSize: 12,
    color: COLORS.textLight
  },
  lineaText: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '500'
  },
  licFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12
  },
  footerItem: {
    flex: 1,
    alignItems: 'center'
  },
  footerLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 3
  },
  footerValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text
  },
  vencimientoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  vencimientoText: {
    fontSize: 12,
    color: COLORS.warning,
    fontWeight: '500'
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 15,
    marginBottom: 20
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10
  },
  emptyButtonText: {
    color: COLORS.white,
    fontWeight: '600'
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
    padding: 20,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    gap: 8
  },
  errorText: {
    color: COLORS.danger,
    flex: 1
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
    marginBottom: 20,
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
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold'
  },
  filterActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  clearButtonText: {
    color: COLORS.textLight,
    fontWeight: '600'
  },
  applyButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  applyButtonText: {
    color: COLORS.white,
    fontWeight: '600'
  }
});
