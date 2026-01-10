import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../config/api';
import pushNotifications from '../services/pushNotifications';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const userStr = await SecureStore.getItemAsync('user');
      
      if (token && userStr) {
        setUser(JSON.parse(userStr));
        
        // Registrar token push al restaurar sesión
        console.log('[AUTH] Sesión restaurada, registrando token push...');
        setTimeout(async () => {
          try {
            await pushNotifications.registerForPushNotifications();
            await pushNotifications.registerTokenWithServer();
          } catch (e) {
            console.error('[AUTH] Error registrando push en checkAuth:', e);
          }
        }, 2000);
      }
    } catch (e) {
      console.log('Error checking auth:', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await authAPI.login(email, password);
      const { token, usuario } = response.data;
      
      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(usuario));
      
      setUser(usuario);
      
      // Registrar token push después del login
      console.log('[AUTH] Login exitoso, registrando token push...');
      setTimeout(async () => {
        try {
          await pushNotifications.registerForPushNotifications();
          await pushNotifications.registerTokenWithServer();
          console.log('[AUTH] Registro de push completado después de login');
        } catch (e) {
          console.error('[AUTH] Error registrando push después de login:', e);
        }
      }, 2000);
      
      return { success: true };
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const register = async (email, password, nombre) => {
    setError(null);
    try {
      const response = await authAPI.register(email, password, nombre);
      const { token, usuario } = response.data;
      
      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(usuario));
      
      setUser(usuario);
      return { success: true };
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    // Eliminar token push del servidor
    await pushNotifications.unregisterToken();
    
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      setError,
      login,
      register,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};
