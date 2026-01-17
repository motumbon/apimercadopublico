import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../contexts/DataContext';
import { notificacionesAPI } from '../config/api';

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

export default function NotificacionesScreen({ navigation }) {
  const { notificaciones, cargarNotificaciones, refreshing, licitaciones } = useData();

  const formatearTiempo = (fecha) => {
    const ahora = new Date();
    const notif = new Date(fecha);
    const diff = ahora - notif;
    
    const minutos = Math.floor(diff / 60000);
    if (minutos < 60) return `Hace ${minutos} min`;
    
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `Hace ${horas}h`;
    
    const dias = Math.floor(horas / 24);
    if (dias < 7) return `Hace ${dias}d`;
    
    return notif.toLocaleDateString('es-CL');
  };

  const handleNotificacionPress = async (item) => {
    try {
      // Marcar como leída
      await notificacionesAPI.marcarLeida(item.id);
      cargarNotificaciones();
      
      // Navegar a la licitación si hay código
      if (item.licitacion_codigo) {
        const licitacion = licitaciones.find(l => l.codigo === item.licitacion_codigo);
        if (licitacion) {
          navigation.navigate('LicitacionDetalle', { licitacion });
        }
      }
    } catch (e) {
      console.log('Error:', e.message);
    }
  };

  const handleMarcarLeida = async (id) => {
    try {
      await notificacionesAPI.marcarLeida(id);
      cargarNotificaciones();
    } catch (e) {}
  };

  const handleEliminar = async (id) => {
    try {
      await notificacionesAPI.eliminar(id);
      cargarNotificaciones();
    } catch (e) {}
  };

  const handleMarcarTodasLeidas = async () => {
    try {
      await notificacionesAPI.marcarTodasLeidas();
      cargarNotificaciones();
    } catch (e) {}
  };

  const handleEliminarTodas = () => {
    Alert.alert(
      'Eliminar Todas',
      '¿Estás seguro de eliminar todas las notificaciones?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificacionesAPI.eliminarTodas();
              cargarNotificaciones();
            } catch (e) {}
          }
        }
      ]
    );
  };

  const getIcono = (tipo) => {
    switch (tipo) {
      case 'nueva_oc':
        return { name: 'cart', color: COLORS.success };
      case 'actualizacion':
        return { name: 'refresh', color: COLORS.primary };
      default:
        return { name: 'notifications', color: COLORS.secondary };
    }
  };

  const renderNotificacion = ({ item }) => {
    const icono = getIcono(item.tipo);
    
    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.leida && styles.notifNoLeida]}
        onPress={() => handleNotificacionPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${icono.color}20` }]}>
          <Ionicons name={icono.name} size={22} color={icono.color} />
        </View>
        
        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text style={styles.notifTitulo}>{item.titulo}</Text>
            {!item.leida && <View style={styles.dotNoLeida} />}
          </View>
          <Text style={styles.notifMensaje} numberOfLines={2}>{item.mensaje}</Text>
          <Text style={styles.notifTiempo}>{formatearTiempo(item.fecha_creada)}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleEliminar(item.id)}
        >
          <Ionicons name="close" size={18} color={COLORS.textLight} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {notificaciones.length > 0 && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleMarcarTodasLeidas}>
            <Ionicons name="checkmark-done" size={18} color={COLORS.primary} />
            <Text style={styles.actionText}>Marcar leídas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.actionDanger]} onPress={handleEliminarTodas}>
            <Ionicons name="trash" size={18} color={COLORS.danger} />
            <Text style={[styles.actionText, { color: COLORS.danger }]}>Eliminar todas</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notificaciones}
        renderItem={renderNotificacion}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={cargarNotificaciones}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={60} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No hay notificaciones</Text>
            <Text style={styles.emptySubtext}>Las notificaciones de nuevas OC aparecerán aquí</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  actions: {
    flexDirection: 'row',
    padding: 15,
    gap: 10
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary
  },
  actionDanger: {
    borderColor: COLORS.danger
  },
  actionText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 13
  },
  listContent: {
    padding: 15,
    paddingTop: 0
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'flex-start'
  },
  notifNoLeida: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  notifContent: {
    flex: 1
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  notifTitulo: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text
  },
  dotNoLeida: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary
  },
  notifMensaje: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
    lineHeight: 18
  },
  notifTiempo: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 6
  },
  deleteButton: {
    padding: 5
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 15
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40
  }
});
