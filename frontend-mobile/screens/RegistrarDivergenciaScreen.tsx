import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../app/navigation';
import AppButton from '../components/AppButton';
import InputField from '../components/InputField';
import ScreenContainer from '../components/ScreenContainer';
import { useSession } from '../hooks/useSession';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { registrarDivergencia } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'RegistrarDivergencia'>;

const DIVERGENCIA_OPTIONS = [
  'NAO_ENCONTRADO',
  'SEM_TOMBO',
  'LOCAL_DIFERENTE',
  'RESPONSAVEL_DIFERENTE',
] as const;

export default function RegistrarDivergenciaScreen({ navigation, route }: Props) {
  const { inventarioId, bemPatrimonialId } = route.params;
  const { session } = useSession();
  const { enqueue } = useSyncQueue();
  const [tipoDivergencia, setTipoDivergencia] = useState<(typeof DIVERGENCIA_OPTIONS)[number]>('NAO_ENCONTRADO');
  const [descricao, setDescricao] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSalvar() {
    if (!session) {
      return;
    }

    if (!descricao.trim()) {
      Alert.alert('Validacao', 'Descreva a divergencia encontrada.');
      return;
    }

    setSaving(true);

    try {
      await registrarDivergencia(session, {
        inventarioId,
        bemPatrimonialId,
        tipoDivergencia,
        descricao: descricao.trim(),
      });

      Alert.alert('Divergencia registrada', 'A divergencia foi enviada com sucesso para a API.');
      navigation.goBack();
    } catch {
      await enqueue({
        id: `${Date.now()}-divergence`,
        type: 'register_divergence',
        payload: {
          inventarioId,
          bemPatrimonialId,
          tipoDivergencia,
          descricao: descricao.trim(),
        },
      });

      Alert.alert('Modo offline', 'A divergencia foi salva localmente e sera sincronizada depois.');
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer style={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Tipo de divergencia</Text>
        <View style={styles.optionsWrap}>
          {DIVERGENCIA_OPTIONS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setTipoDivergencia(option)}
              style={({ pressed }) => [
                styles.optionChip,
                tipoDivergencia === option && styles.optionChipActive,
                pressed && styles.optionChipPressed,
              ]}
            >
              <Text style={[styles.optionLabel, tipoDivergencia === option && styles.optionLabelActive]}>{option}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <InputField
          label="Descricao da divergencia"
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Detalhe o que foi encontrado em campo"
          multiline
        />
        <AppButton label="Salvar divergencia" onPress={() => void handleSalvar()} loading={saving} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  card: {
    gap: 14,
    borderRadius: 24,
    backgroundColor: '#fffaf3',
    padding: 18,
  },
  title: {
    color: '#14302a',
    fontSize: 18,
    fontWeight: '800',
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(15, 61, 57, 0.14)',
    backgroundColor: '#f5f0e8',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionChipActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  optionChipPressed: {
    opacity: 0.9,
  },
  optionLabel: {
    color: '#17352f',
    fontSize: 13,
    fontWeight: '700',
  },
  optionLabelActive: {
    color: '#fffaf3',
  },
});
