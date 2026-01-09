import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

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

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const { licitaciones, saldos, ordenesPorLicitacion } = useData();

  // Estadísticas
  const totalLicitaciones = licitaciones.length;
  const totalOC = Object.values(ordenesPorLicitacion).reduce((sum, ocs) => sum + ocs.length, 0);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', style: 'destructive', onPress: logout }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header del perfil */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={40} color={COLORS.white} />
        </View>
        <Text style={styles.nombre}>{user?.nombre || 'Usuario'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Estadísticas */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalLicitaciones}</Text>
          <Text style={styles.statLabel}>Licitaciones</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalOC}</Text>
          <Text style={styles.statLabel}>Órdenes de Compra</Text>
        </View>
      </View>

      {/* Información de la app */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Ionicons name="information-circle-outline" size={22} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Versión</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
          </View>
          
          <View style={styles.infoDivider} />
          
          <View style={styles.infoItem}>
            <Ionicons name="sync-outline" size={22} color={COLORS.success} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Sincronización</Text>
              <Text style={styles.infoValue}>Automática (cada 2 min)</Text>
            </View>
          </View>
          
          <View style={styles.infoDivider} />
          
          <View style={styles.infoItem}>
            <Ionicons name="server-outline" size={22} color={COLORS.secondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Servidor</Text>
              <Text style={styles.infoValue}>Railway (Online)</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Acerca de */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acerca de</Text>
        
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>Seguimiento OC</Text>
          <Text style={styles.aboutText}>
            Aplicación para seguimiento de licitaciones y órdenes de compra de Mercado Público Chile.
          </Text>
          <Text style={styles.aboutText}>
            Los datos se sincronizan automáticamente con el servidor, manteniendo la información actualizada en todos tus dispositivos.
          </Text>
        </View>
      </View>

      {/* Cerrar sesión */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    paddingVertical: 30,
    paddingBottom: 40
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15
  },
  nombre: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white
  },
  email: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 15,
    marginTop: -25,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 5
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 15
  },
  section: {
    padding: 15
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 5
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15
  },
  infoContent: {
    marginLeft: 15,
    flex: 1
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textLight
  },
  infoValue: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
    marginTop: 2
  },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 15
  },
  aboutCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10
  },
  aboutText: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: 10
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.danger
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.danger
  }
});
