import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../app/navigation';
import AppButton from '../components/AppButton';
import ScreenContainer from '../components/ScreenContainer';
import { useSession } from '../hooks/useSession';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { fetchInventariosAbertos, type Inventario } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Inventarios'>;

export default function InventariosScreen({ navigation }: Props) {
  const { session, signOut } = useSession();
  const { queue, syncNow } = useSyncQueue();
  const [inventarios, setInventarios] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function loadInventarios() {
    if (!session) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetchInventariosAbertos(session);
      setInventarios(response);
    } catch (error) {
      Alert.alert('Falha ao carregar inventarios', error instanceof Error ? error.message : 'Nao foi possivel consultar a API.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    if (!session) {
      return;
    }

    setSyncing(true);

    try {
      const result = await syncNow(session);
      Alert.alert('Sincronizacao concluida', `${result.synced} item(ns) enviados. ${result.remaining} pendente(s).`);
    } catch (error) {
      Alert.alert('Falha na sincronizacao', error instanceof Error ? error.message : 'Nao foi possivel sincronizar a fila local.');
    } finally {
      setSyncing(false);
      await loadInventarios();
    }
  }

  useEffect(() => {
    loadInventarios();
  }, [session]);

  return (
    <ScreenContainer style={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Operador: {session?.operador}</Text>
        <Text style={styles.heroMeta}>
          Empresa {session?.empresaId} | Filial {session?.filialId}
        </Text>
        <Text style={styles.heroMeta}>Fila offline pendente: {queue.length}</Text>
      </View>

      <View style={styles.actionsRow}>
        <View style={styles.actionItem}>
          <AppButton label="Atualizar" onPress={() => void loadInventarios()} loading={loading} />
        </View>
        <View style={styles.actionItem}>
          <AppButton label="Sincronizar" onPress={handleSync} loading={syncing} variant="secondary" />
        </View>
      </View>

      <View style={styles.actionsRow}>
        <View style={styles.actionItem}>
          <AppButton label="Sair" onPress={signOut} variant="secondary" />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Inventarios em aberto</Text>

      <View style={styles.listWrapper}>
        {loading ? <Text style={styles.emptyText}>Carregando inventarios...</Text> : null}

        {!loading && inventarios.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum inventario aberto ou em andamento encontrado.</Text>
        ) : null}

        {!loading &&
          inventarios.map((inventario) => (
            <Pressable
              key={inventario.id}
              onPress={() =>
                navigation.navigate('InventarioExecucao', {
                  inventarioId: inventario.id,
                  inventarioNome: inventario.nome,
                })
              }
              style={({ pressed }) => [styles.inventoryCard, pressed && styles.cardPressed]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{inventario.nome}</Text>
                <View style={[styles.badge, inventario.status === 'ABERTO' ? styles.badgeOpen : styles.badgeProgress]}>
                  <Text style={styles.badgeLabel}>{inventario.status}</Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>Inicio: {inventario.data_inicio}</Text>
              <Text style={styles.cardMeta}>Fim: {inventario.data_fim ?? 'Nao finalizado'}</Text>
              <View style={styles.openButtonRow}>
                <AppButton
                  label="Abrir inventario"
                  onPress={() =>
                    navigation.navigate('InventarioExecucao', {
                      inventarioId: inventario.id,
                      inventarioNome: inventario.nome,
                    })
                  }
                />
              </View>
            </Pressable>
          ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
  },
  heroCard: {
    borderRadius: 24,
    backgroundColor: '#0f3d39',
    padding: 18,
    gap: 8,
  },
  heroTitle: {
    color: '#fffaf3',
    fontSize: 22,
    fontWeight: '800',
  },
  heroMeta: {
    color: '#d6e4df',
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionItem: {
    flex: 1,
  },
  sectionTitle: {
    color: '#17352f',
    fontSize: 18,
    fontWeight: '800',
  },
  listWrapper: {
    gap: 14,
  },
  inventoryCard: {
    borderRadius: 22,
    backgroundColor: '#fffaf3',
    padding: 16,
    gap: 10,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    color: '#142521',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  cardMeta: {
    color: '#536762',
    fontSize: 14,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeOpen: {
    backgroundColor: '#d1fae5',
  },
  badgeProgress: {
    backgroundColor: '#fde68a',
  },
  badgeLabel: {
    color: '#17352f',
    fontSize: 12,
    fontWeight: '800',
  },
  openButtonRow: {
    marginTop: 8,
  },
  emptyText: {
    color: '#536762',
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
