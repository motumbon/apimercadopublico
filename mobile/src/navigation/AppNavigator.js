import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { View, Text } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import LicitacionesScreen from '../screens/LicitacionesScreen';
import LicitacionDetalleScreen from '../screens/LicitacionDetalleScreen';
import NotificacionesScreen from '../screens/NotificacionesScreen';
import PerfilScreen from '../screens/PerfilScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const COLORS = {
  primary: '#1e40af',
  secondary: '#3b82f6',
  background: '#f1f5f9',
  white: '#ffffff',
  text: '#1e293b',
  textLight: '#64748b',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444'
};

function TabNavigator() {
  const { contadorNotif } = useData();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Inicio') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Licitaciones') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Notificaciones') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: '#e2e8f0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500'
        },
        headerStyle: {
          backgroundColor: COLORS.primary
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: 'bold'
        }
      })}
    >
      <Tab.Screen 
        name="Inicio" 
        component={HomeScreen}
        options={{ title: 'Seguimiento OC' }}
      />
      <Tab.Screen 
        name="Licitaciones" 
        component={LicitacionesScreen}
        options={{ title: 'Licitaciones' }}
      />
      <Tab.Screen 
        name="Notificaciones" 
        component={NotificacionesScreen}
        options={{
          title: 'Notificaciones',
          tabBarBadge: contadorNotif > 0 ? contadorNotif : null
        }}
      />
      <Tab.Screen 
        name="Perfil" 
        component={PerfilScreen}
        options={{ title: 'Mi Perfil' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary }}>
        <Text style={{ color: COLORS.white, fontSize: 18 }}>Cargando...</Text>
      </View>
    );
  }
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: 'bold' }
      }}
    >
      {!isAuthenticated ? (
        <>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen}
            options={{ title: 'Crear Cuenta' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen 
            name="Main" 
            component={TabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="LicitacionDetalle" 
            component={LicitacionDetalleScreen}
            options={{ title: 'Detalle Licitación' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
