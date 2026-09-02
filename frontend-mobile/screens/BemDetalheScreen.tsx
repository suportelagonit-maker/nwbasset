import { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../app/navigation';
import AppButton from '../components/AppButton';
import InputField from '../components/InputField';
import ScreenContainer from '../components/ScreenContainer';
import { useSession } from '../hooks/useSession';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { confirmarPresenca, fetchBem, type BemPatrimonial } from '../services/api';
import { getBemPhoto, saveBemPhoto } from '../services/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'BemDetalhe'>;

export default function BemDetalheScreen({ navigation, route }: Props) {
  const { inventarioId, inventarioItemId, bemPatrimonialId } = route.params;
  const { session } = useSession();
  const { enqueue } = useSyncQueue();
  const [bem, setBem] = useState<BemPatrimonial | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [capturingPhoto, setCapturingPhoto] = useState(false);

  async function loadBem() {
    if (!session) {
      return;
    }

    setLoading(true);

    try {
      const [bemResponse, savedPhoto] = await Promise.all([
        fetchBem(session, bemPatrimonialId),
        getBemPhoto(inventarioId, bemPatrimonialId),
      ]);

      setBem(bemResponse);
      setPhotoUri(savedPhoto);
    } catch (error) {
      Alert.alert('Falha ao carregar bem', error instanceof Error ? error.message : 'Nao foi possivel consultar o bem patrimonial.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmarPresenca() {
    if (!session) {
      return;
    }

    setConfirming(true);

    try {
      await confirmarPresenca(session, inventarioItemId, observacoes.trim() || undefined);
      Alert.alert('Presenca confirmada', 'O item foi enviado com sucesso para a API.');
    } catch {
      await enqueue({
        id: `${Date.now()}-confirm-presence`,
        type: 'confirm_presence',
        payload: {
          inventarioId,
          inventarioItemId,
          observacoes: observacoes.trim() || undefined,
        },
      });

      Alert.alert('Modo offline', 'A confirmacao foi salva localmente e sera enviada na proxima sincronizacao.');
    } finally {
      setConfirming(false);
    }
  }

  async function handleTirarFoto() {
    setCapturingPhoto(true);

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permissao negada', 'Permita o uso da camera para registrar a foto do bem.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        cameraType: ImagePicker.CameraType.back,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const [asset] = result.assets;
      await saveBemPhoto(inventarioId, bemPatrimonialId, asset.uri);
      setPhotoUri(asset.uri);
    } catch (error) {
      Alert.alert('Falha ao capturar foto', error instanceof Error ? error.message : 'Nao foi possivel abrir a camera.');
    } finally {
      setCapturingPhoto(false);
    }
  }

  useEffect(() => {
    void loadBem();
  }, [session, inventarioId, bemPatrimonialId]);

  return (
    <ScreenContainer style={styles.content}>
      {loading ? <Text style={styles.loadingText}>Carregando dados do bem...</Text> : null}

      {!loading && bem ? (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{bem.descricao}</Text>
            <Text style={styles.summaryMeta}>Tombo: {bem.numero_tombo}</Text>
            <Text style={styles.summaryMeta}>Serie: {bem.numero_serie ?? 'Nao informado'}</Text>
            <Text style={styles.summaryMeta}>Categoria: {bem.categoria ?? 'Nao informada'}</Text>
            <Text style={styles.summaryMeta}>Marca / Modelo: {bem.marca ?? '-'} / {bem.modelo ?? '-'}</Text>
            <Text style={styles.summaryMeta}>Status: {bem.status_bem}</Text>
            <Text style={styles.summaryMeta}>Estado: {bem.estado_conservacao}</Text>
            <Text style={styles.summaryMeta}>Local ID: {bem.local_id}</Text>
            <Text style={styles.summaryMeta}>Responsavel ID: {bem.responsavel_id ?? 'Nao informado'}</Text>
          </View>

          <View style={styles.card}>
            <InputField
              label="Observacoes da verificacao"
              value={observacoes}
              onChangeText={setObservacoes}
              placeholder="Ex.: bem encontrado em perfeito estado"
              multiline
            />

            <AppButton label="Confirmar presenca" onPress={() => void handleConfirmarPresenca()} loading={confirming} />
            <AppButton label="Tirar foto do bem" onPress={() => void handleTirarFoto()} loading={capturingPhoto} variant="secondary" />
            <AppButton
              label="Registrar divergencia"
              onPress={() =>
                navigation.navigate('RegistrarDivergencia', {
                  inventarioId,
                  bemPatrimonialId,
                  inventarioItemId,
                })
              }
              variant="danger"
            />
          </View>

          <View style={styles.photoCard}>
            <Text style={styles.photoTitle}>Evidencia fotografica</Text>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
            ) : (
              <Text style={styles.photoEmpty}>Nenhuma foto registrada localmente para este bem.</Text>
            )}
            <Text style={styles.photoNote}>
              A foto fica salva no dispositivo nesta fase. O backend atual ainda nao possui endpoint de upload.
            </Text>
          </View>
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  loadingText: {
    color: '#536762',
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 20,
  },
  summaryCard: {
    borderRadius: 24,
    backgroundColor: '#fffaf3',
    padding: 18,
    gap: 6,
  },
  summaryTitle: {
    color: '#14302a',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryMeta: {
    color: '#536762',
    fontSize: 14,
  },
  card: {
    gap: 12,
    borderRadius: 24,
    backgroundColor: '#fffaf3',
    padding: 18,
  },
  photoCard: {
    gap: 10,
    borderRadius: 24,
    backgroundColor: '#fffaf3',
    padding: 18,
  },
  photoTitle: {
    color: '#14302a',
    fontSize: 18,
    fontWeight: '800',
  },
  photo: {
    width: '100%',
    height: 240,
    borderRadius: 18,
    backgroundColor: '#d5dfdb',
  },
  photoEmpty: {
    color: '#536762',
    fontSize: 14,
  },
  photoNote: {
    color: '#6a7f79',
    fontSize: 13,
    lineHeight: 19,
  },
});
