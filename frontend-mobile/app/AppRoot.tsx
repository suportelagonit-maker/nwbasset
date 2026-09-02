import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import BemDetalheScreen from '../screens/BemDetalheScreen';
import InventarioExecucaoScreen from '../screens/InventarioExecucaoScreen';
import InventariosScreen from '../screens/InventariosScreen';
import LoginScreen from '../screens/LoginScreen';
import RegistrarDivergenciaScreen from '../screens/RegistrarDivergenciaScreen';
import ScannerScreen from '../screens/ScannerScreen';
import { useSession, SessionProvider } from '../hooks/useSession';
import { SyncQueueProvider } from '../hooks/useSyncQueue';
import type { RootStackParamList } from './navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { loading, session } = useSession();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4efe8' }}>
        <ActivityIndicator size="large" color="#0f766e" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={session ? 'Inventarios' : 'Login'}
        screenOptions={{
          headerStyle: { backgroundColor: '#0f3d39' },
          headerTintColor: '#fffaf3',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#f4efe8' },
        }}
      >
        {!session ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Inventarios" component={InventariosScreen} options={{ title: 'Inventarios Abertos' }} />
            <Stack.Screen name="InventarioExecucao" component={InventarioExecucaoScreen} options={{ title: 'Execucao do Inventario' }} />
            <Stack.Screen name="Scanner" component={ScannerScreen} options={{ title: 'Leitura de Plaqueta' }} />
            <Stack.Screen name="BemDetalhe" component={BemDetalheScreen} options={{ title: 'Detalhe do Bem' }} />
            <Stack.Screen
              name="RegistrarDivergencia"
              component={RegistrarDivergenciaScreen}
              options={{ title: 'Registrar Divergencia' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function AppRoot() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <SyncQueueProvider>
          <AppNavigator />
        </SyncQueueProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
