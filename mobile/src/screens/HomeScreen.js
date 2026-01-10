import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatearMonto } from '../config/api';
import pushNotifications from '../services/pushNotifications';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

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

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { 
    licitaciones,
    instituciones,
    saldos, 
    ordenesPorLicitacion,
    loading, 
    refreshing, 
    cargarDatos,
    contadorNotif
  } = useData();
  
  // Helper para obtener nombre de institución
  const getNombreInstitucion = (institucionId) => {
    if (!institucionId) return null;
    const inst = instituciones.find(i => i.id === institucionId);
    return inst ? inst.nombre : null;
  };

  // Calcular estadísticas
  const totalLicitaciones = licitaciones.length;
  const totalOC = Object.values(ordenesPorLicitacion).reduce((sum, ocs) => sum + ocs.length, 0);
  const montoTotalOC = Object.values(saldos).reduce((sum, s) => sum + (s?.montoOC || 0), 0);
  const saldoTotal = Object.values(saldos).reduce((sum, s) => sum + (s?.saldo || 0), 0);

  // Últimas licitaciones con OC
  const ultimasConOC = licitaciones
    .filter(l => (ordenesPorLicitacion[l.codigo] || []).length > 0)
    .slice(0, 5);

  // Función de diagnóstico DETALLADA para probar registro de push
  const testPushRegistration = async () => {
    let diagnosticLog = '';
    
    try {
      // Paso 1: Verificar dispositivo
      diagnosticLog += `1. Device.isDevice: ${Device.isDevice}\n`;
      diagnosticLog += `   Platform: ${Platform.OS}\n`;
      diagnosticLog += `   Brand: ${Device.brand || 'N/A'}\n`;
      diagnosticLog += `   Model: ${Device.modelName || 'N/A'}\n\n`;
      
      if (!Device.isDevice) {
        Alert.alert('❌ Error Paso 1', `No es dispositivo físico.\n\n${diagnosticLog}`);
        return;
      }
      
      // Paso 2: Verificar permisos
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      diagnosticLog += `2. Permisos existentes: ${existingStatus}\n`;
      
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        diagnosticLog += `   Permisos solicitados: ${status}\n`;
      }
      diagnosticLog += `   Permisos finales: ${finalStatus}\n\n`;
      
      if (finalStatus !== 'granted') {
        Alert.alert('❌ Error Paso 2', `Permisos no otorgados.\n\n${diagnosticLog}`);
        return;
      }
      
      // Paso 3: Configurar canal Android
      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
          });
          diagnosticLog += `3. Canal Android: OK\n\n`;
        } catch (e) {
          diagnosticLog += `3. Canal Android ERROR: ${e.message}\n\n`;
        }
      }
      
      // Paso 4: Obtener token
      diagnosticLog += `4. Obteniendo token...\n`;
      const projectId = '4c0421e4-574a-4efd-9d5d-595c9c00a1e6';
      diagnosticLog += `   ProjectId: ${projectId}\n`;
      
      try {
        const tokenResponse = await Notifications.getExpoPushTokenAsync({
          projectId: projectId
        });
        
        const token = tokenResponse.data;
        diagnosticLog += `   Token: ${token ? token.substring(0, 40) + '...' : 'NULL'}\n\n`;
        
        if (!token) {
          Alert.alert('❌ Error Paso 4', `Token es null.\n\n${diagnosticLog}`);
          return;
        }
        
        // Paso 5: Registrar en servidor
        diagnosticLog += `5. Registrando en servidor...\n`;
        pushNotifications.expoPushToken = token;
        
        const registered = await pushNotifications.registerTokenWithServer();
        diagnosticLog += `   Resultado: ${registered ? 'OK' : 'FALLÓ'}\n`;
        
        if (registered) {
          Alert.alert('✅ ÉXITO COMPLETO', `Token registrado correctamente.\n\n${diagnosticLog}`);
        } else {
          Alert.alert('❌ Error Paso 5', `No se pudo registrar en servidor.\n\n${diagnosticLog}`);
        }
        
      } catch (tokenError) {
        diagnosticLog += `   ERROR: ${tokenError.message}\n`;
        diagnosticLog += `   Code: ${tokenError.code || 'N/A'}\n`;
        Alert.alert('❌ Error Paso 4', `Error obteniendo token:\n${tokenError.message}\n\n${diagnosticLog}`);
      }
      
    } catch (error) {
      Alert.alert('❌ Error General', `${error.message}\n\n${diagnosticLog}`);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => cargarDatos(true)}
          colors={[COLORS.primary]}
        />
      }
    >
      {/* Header de bienvenida */}
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeHeader}>
          <View>
            <Text style={styles.welcomeText}>Hola,</Text>
            <Text style={styles.userName}>{user?.nombre || user?.email}</Text>
          </View>
          <TouchableOpacity 
            style={styles.notifButton}
            onPress={() => navigation.navigate('Notificaciones')}
          >
            <Ionicons name="notifications-outline" size={24} color={COLORS.white} />
            {contadorNotif > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{contadorNotif}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.welcomeSubtext}>
          Seguimiento de licitaciones y órdenes de compra
        </Text>
        
        {/* Botón de diagnóstico push - temporal */}
        <TouchableOpacity 
          style={styles.diagButton}
          onPress={testPushRegistration}
        >
          <Ionicons name="bug-outline" size={16} color={COLORS.white} />
          <Text style={styles.diagButtonText}>Probar Push</Text>
        </TouchableOpacity>
      </View>

      {/* Tarjetas de estadísticas */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
          <Ionicons name="document-text" size={28} color={COLORS.primary} />
          <Text style={styles.statNumber}>{totalLicitaciones}</Text>
          <Text style={styles.statLabel}>Licitaciones</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
          <Ionicons name="cart" size={28} color={COLORS.success} />
          <Text style={[styles.statNumber, { color: COLORS.success }]}>{totalOC}</Text>
          <Text style={styles.statLabel}>Órdenes de Compra</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
          <Ionicons name="cash" size={28} color={COLORS.warning} />
          <Text style={[styles.statNumber, { color: COLORS.warning, fontSize: 16 }]}>
            {formatearMonto(montoTotalOC)}
          </Text>
          <Text style={styles.statLabel}>Total OC</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: '#f1f5f9' }]}>
          <Ionicons name="wallet" size={28} color={COLORS.textLight} />
          <Text style={[styles.statNumber, { color: COLORS.text, fontSize: 16 }]}>
            {formatearMonto(saldoTotal)}
          </Text>
          <Text style={styles.statLabel}>Saldo Total</Text>
        </View>
      </View>

      {/* Accesos rápidos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accesos Rápidos</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate('Licitaciones')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="search" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.quickActionText}>Ver Licitaciones</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate('Licitaciones', { openAdd: true })}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="add-circle" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.quickActionText}>Agregar Nueva</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Últimas licitaciones con OC */}
      {ultimasConOC.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Últimas con OC</Text>
          {ultimasConOC.map(lic => (
            <TouchableOpacity 
              key={lic.codigo}
              style={styles.licCard}
              onPress={() => navigation.navigate('LicitacionDetalle', { licitacion: lic })}
            >
              <View style={styles.licHeader}>
                <Text style={styles.licCodigo}>{lic.codigo}</Text>
                <View style={styles.ocBadge}>
                  <Text style={styles.ocBadgeText}>
                    {(ordenesPorLicitacion[lic.codigo] || []).length} OC
                  </Text>
                </View>
              </View>
              <Text style={styles.licNombre} numberOfLines={2}>{lic.nombre}</Text>
              {/* Institución y Línea */}
              <View style={styles.institucionRow}>
                <Ionicons name="business-outline" size={12} color={COLORS.textLight} />
                <Text style={styles.institucionText}>
                  {getNombreInstitucion(lic.institucion_id) || 'Sin asignar'}
                </Text>
                {lic.linea && <Text style={styles.lineaText}>• {lic.linea}</Text>}
              </View>
              <View style={styles.licFooter}>
                <Text style={styles.licMonto}>
                  {formatearMonto(saldos[lic.codigo]?.montoOC || 0)}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textLight,
    fontSize: 16
  },
  welcomeCard: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 15,
    paddingBottom: 25
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16
  },
  userName: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold'
  },
  welcomeSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 10
  },
  diagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
    gap: 6
  },
  diagButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '500'
  },
  notifButton: {
    padding: 8,
    position: 'relative'
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold'
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginTop: 15,
    gap: 12
  },
  statCard: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 8
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center'
  },
  section: {
    padding: 15,
    paddingTop: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12
  },
  quickAction: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center'
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  quickActionText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500'
  },
  licCard: {
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10
  },
  licHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  licCodigo: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  },
  ocBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
  },
  ocBadgeText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600'
  },
  licNombre: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 6
  },
  institucionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10
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
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  licMonto: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.success
  }
});
