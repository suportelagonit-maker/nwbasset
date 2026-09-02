import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';

import type { RootStackParamList } from '../app/navigation';
import AppButton from '../components/AppButton';
import { useSession } from '../hooks/useSession';
import { fetchInventarioItens, findBemByScannedCode } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Scanner'>;

export default function ScannerScreen({ navigation, route }: Props) {
  const { inventarioId } = route.params;
  const { session } = useSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [resolving, setResolving] = useState(false);

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (!session || locked || resolving) {
      return;
    }

    setLocked(true);
    setResolving(true);

    try {
      const plaqueta = await findBemByScannedCode(session, result.data);

      if (!plaqueta) {
        Alert.alert('Plaqueta nao encontrada', 'O codigo de barras ou QR Code lido nao foi localizado nas plaquetas ativas da empresa.');
        setLocked(false);
        return;
      }

      const itens = await fetchInventarioItens(session, inventarioId);
      const inventarioItem = itens.find((item) => item.bem_patrimonial_id === plaqueta.bem_patrimonial_id);

      if (!inventarioItem) {
        Alert.alert('Bem fora do inventario', 'A plaqueta existe, mas o bem nao foi carregado neste inventario.');
        setLocked(false);
        return;
      }

      navigation.replace('BemDetalhe', {
        inventarioId,
        inventarioItemId: inventarioItem.id,
        bemPatrimonialId: plaqueta.bem_patrimonial_id,
      });
    } catch (error) {
        Alert.alert('Falha na leitura', error instanceof Error ? error.message : 'Nao foi possivel processar o codigo lido.');
      setLocked(false);
    } finally {
      setResolving(false);
    }
  }

  if (!permission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>Verificando permissao da camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionTitle}>Camera desabilitada</Text>
        <Text style={styles.permissionText}>Permita o uso da camera para ler codigo de barras ou QR Code das plaquetas patrimoniais.</Text>
        <View style={styles.buttonWrap}>
          <AppButton label="Liberar camera" onPress={() => void requestPermission()} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8'] }}
        onBarcodeScanned={locked ? undefined : handleBarcodeScanned}
      />

      <View style={styles.overlay}>
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Aponte para a plaqueta</Text>
          <Text style={styles.instructionsText}>
            Posicione o codigo de barras ou QR Code dentro da area destacada para localizar o bem no inventario.
          </Text>
        </View>

        <View style={styles.scanFrame} />

        <View style={styles.bottomBar}>
          <Pressable onPress={() => setLocked(false)} style={styles.bottomButton}>
            <Text style={styles.bottomButtonLabel}>{resolving ? 'Processando...' : 'Ler novamente'}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.goBack()} style={[styles.bottomButton, styles.secondaryButton]}>
            <Text style={styles.bottomButtonLabel}>Voltar</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: '#f4efe8',
  },
  permissionTitle: {
    color: '#112a26',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  permissionText: {
    color: '#536762',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  buttonWrap: {
    width: '100%',
    maxWidth: 280,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.34)',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  instructions: {
    marginTop: 24,
    gap: 6,
  },
  instructionsTitle: {
    color: '#fffaf3',
    fontSize: 24,
    fontWeight: '800',
  },
  instructionsText: {
    color: '#d8e1de',
    fontSize: 14,
    lineHeight: 20,
  },
  scanFrame: {
    alignSelf: 'center',
    width: 260,
    height: 260,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#facc15',
    backgroundColor: 'transparent',
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomButton: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#0f766e',
  },
  secondaryButton: {
    backgroundColor: '#1f2937',
  },
  bottomButtonLabel: {
    color: '#fffaf3',
    fontSize: 15,
    fontWeight: '800',
  },
});
