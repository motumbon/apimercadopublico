import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import api from '../config/api';

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PushNotificationService {
  constructor() {
    this.expoPushToken = null;
  }

  async registerForPushNotifications() {
    let token;
    
    console.log('[PUSH] Iniciando registro de notificaciones push...');
    console.log('[PUSH] Es dispositivo físico:', Device.isDevice);
    console.log('[PUSH] Plataforma:', Platform.OS);

    if (Platform.OS === 'android') {
      console.log('[PUSH] Configurando canal de notificaciones Android...');
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1e40af',
      });
    }

    if (Device.isDevice) {
      console.log('[PUSH] Verificando permisos...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      console.log('[PUSH] Estado de permisos existente:', existingStatus);
      
      if (existingStatus !== 'granted') {
        console.log('[PUSH] Solicitando permisos...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('[PUSH] Nuevo estado de permisos:', status);
      }
      
      if (finalStatus !== 'granted') {
        console.log('⚠️ [PUSH] Permisos de notificación NO otorgados');
        return null;
      }

      console.log('[PUSH] Permisos OK, obteniendo token...');
      
      try {
        // Usar projectId hardcodeado para asegurar que funcione
        const projectId = '4c0421e4-574a-4efd-9d5d-595c9c00a1e6';
        console.log('[PUSH] Usando projectId:', projectId);
        
        const tokenResponse = await Notifications.getExpoPushTokenAsync({
          projectId: projectId
        });
        
        token = tokenResponse.data;
        console.log('📱 [PUSH] Expo Push Token obtenido:', token);
        this.expoPushToken = token;
        
        // Guardar token localmente
        await SecureStore.setItemAsync('expoPushToken', token);
        console.log('[PUSH] Token guardado localmente');
        
      } catch (error) {
        console.error('[PUSH] Error obteniendo push token:', error.message);
        console.error('[PUSH] Error completo:', JSON.stringify(error));
      }
    } else {
      console.log('⚠️ [PUSH] Las notificaciones push requieren un dispositivo físico');
    }

    return token;
  }

  async registerTokenWithServer() {
    console.log('[PUSH] Iniciando registro de token en servidor...');
    
    if (!this.expoPushToken) {
      console.log('[PUSH] No hay token, obteniendo uno nuevo...');
      await this.registerForPushNotifications();
    }

    if (this.expoPushToken) {
      console.log('[PUSH] Token disponible, registrando en servidor...');
      console.log('[PUSH] Token a registrar:', this.expoPushToken.substring(0, 40) + '...');
      
      try {
        const response = await api.post('/push-tokens/register', {
          token: this.expoPushToken,
          platform: Platform.OS
        });
        console.log('✅ [PUSH] Token registrado en servidor exitosamente');
        console.log('[PUSH] Respuesta servidor:', JSON.stringify(response.data));
        return true;
      } catch (error) {
        console.error('[PUSH] Error registrando token en servidor:', error.message);
        if (error.response) {
          console.error('[PUSH] Status:', error.response.status);
          console.error('[PUSH] Data:', JSON.stringify(error.response.data));
        }
        return false;
      }
    } else {
      console.log('[PUSH] No se pudo obtener token push');
    }
    return false;
  }

  async unregisterToken() {
    try {
      await api.delete('/push-tokens/unregister');
      await SecureStore.deleteItemAsync('expoPushToken');
      this.expoPushToken = null;
      console.log('🗑️ Token eliminado');
    } catch (error) {
      console.error('Error eliminando token:', error);
    }
  }

  // Escuchar notificaciones recibidas
  addNotificationReceivedListener(callback) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // Escuchar cuando el usuario toca una notificación
  addNotificationResponseReceivedListener(callback) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Enviar notificación local (para pruebas)
  async sendLocalNotification(title, body, data = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Inmediata
    });
  }
}

export default new PushNotificationService();
