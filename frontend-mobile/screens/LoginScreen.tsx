import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import AppButton from '../components/AppButton';
import InputField from '../components/InputField';
import ScreenContainer from '../components/ScreenContainer';
import { useSession } from '../hooks/useSession';
import { login as loginApi } from '../services/api';

export default function LoginScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('admin@nwbasset.local');
  const [password, setPassword] = useState('NwbAsset@123');
  const [empresaId, setEmpresaId] = useState('1');
  const [filialId, setFilialId] = useState('1');
  const [deviceName, setDeviceName] = useState('nwbasset-mobile');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim()) {
      Alert.alert('Validacao', 'Informe o e-mail do usuario.');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Validacao', 'Informe a senha do usuario.');
      return;
    }

    const empresa = Number(empresaId);
    const filial = Number(filialId);

    if (!Number.isInteger(empresa) || empresa <= 0) {
      Alert.alert('Validacao', 'Informe um empresa_id valido.');
      return;
    }

    if (!Number.isInteger(filial) || filial <= 0) {
      Alert.alert('Validacao', 'Informe um filial_id valido.');
      return;
    }

    setLoading(true);

    try {
      const auth = await loginApi({
        email: email.trim(),
        password: password.trim(),
        deviceName: deviceName.trim() || 'nwbasset-mobile',
        empresaId: empresa,
      });

      await signIn({
        operador: auth.usuario.nome,
        empresaId: auth.empresa_atual?.id ?? empresa,
        filialId: filial,
        apiToken: auth.access_token,
      });
    } catch (error) {
      Alert.alert('Falha ao iniciar sessao', error instanceof Error ? error.message : 'Nao foi possivel autenticar na API.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer style={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>NWB Asset Mobile</Text>
        <Text style={styles.title}>Inventario patrimonial via QR Code</Text>
        <Text style={styles.subtitle}>
          Login real na API Laravel com token Sanctum, empresa ativa e sincronizacao do inventario por QR Code.
        </Text>
      </View>

      <View style={styles.card}>
        <InputField label="E-mail" value={email} onChangeText={setEmail} placeholder="usuario@empresa.local" />
        <InputField
          label="Senha"
          value={password}
          onChangeText={setPassword}
          placeholder="Senha"
          secureTextEntry
        />
        <InputField
          label="Empresa ID"
          value={empresaId}
          onChangeText={setEmpresaId}
          placeholder="1"
          keyboardType="number-pad"
        />
        <InputField
          label="Filial ID"
          value={filialId}
          onChangeText={setFilialId}
          placeholder="1"
          keyboardType="number-pad"
        />
        <InputField
          label="Device name"
          value={deviceName}
          onChangeText={setDeviceName}
          placeholder="nwbasset-mobile"
        />

        <AppButton label="Entrar no inventario" onPress={handleLogin} loading={loading} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 28,
  },
  hero: {
    gap: 10,
    marginTop: 32,
  },
  kicker: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#112a26',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  subtitle: {
    color: '#4b635e',
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    gap: 14,
    marginTop: 12,
    borderRadius: 24,
    backgroundColor: '#fffaf3',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
});
