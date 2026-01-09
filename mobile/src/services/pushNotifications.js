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

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1e40af',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('⚠️ Permisos de notificación no otorgados');
        return null;
      }

      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                         Constants.easConfig?.projectId;
        
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: projectId
        })).data;
        
        console.log('📱 Expo Push Token:', token);
        this.expoPushToken = token;
        
        // Guardar token localmente
        await SecureStore.setItemAsync('expoPushToken', token);
        
      } catch (error) {
        console.error('Error obteniendo push token:', error);
      }
    } else {
      console.log('⚠️ Las notificaciones push requieren un dispositivo físico');
    }

    return token;
  }

  async registerTokenWithServer() {
    if (!this.expoPushToken) {
      await this.registerForPushNotifications();
    }

    if (this.expoPushToken) {
      try {
        await api.post('/push-tokens/register', {
          token: this.expoPushToken,
          platform: Platform.OS
        });
        console.log('✅ Token registrado en servidor');
        return true;
      } catch (error) {
        console.error('Error registrando token en servidor:', error);
        return false;
      }
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
