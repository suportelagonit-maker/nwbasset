import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../app/navigation';
import AppButton from '../components/AppButton';
import ScreenContainer from '../components/ScreenContainer';
import { useSession } from '../hooks/useSession';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { fetchInventarioItens, type InventarioItem } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'InventarioExecucao'>;

export default function InventarioExecucaoScreen({ navigation, route }: Props) {
  const { inventarioId, inventarioNome } = route.params;
  const { session } = useSession();
  const { queue, syncNow } = useSyncQueue();
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function loadItems() {
    if (!session) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetchInventarioItens(session, inventarioId);
      setItems(response);
    } catch (error) {
      Alert.alert('Falha ao carregar itens', error instanceof Error ? error.message : 'Nao foi possivel consultar os itens do inventario.');
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
      await loadItems();
    }
  }

  useEffect(() => {
    loadItems();
  }, [session, inventarioId]);

  const total = items.length;
  const localizados = items.filter((item) => item.localizado).length;
  const pendentes = total - localizados;

  return (
    <ScreenContainer style={styles.content}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{inventarioNome}</Text>
        <Text style={styles.summaryMeta}>Itens totais: {total}</Text>
        <Text style={styles.summaryMeta}>Localizados: {localizados}</Text>
        <Text style={styles.summaryMeta}>Pendentes: {pendentes}</Text>
        <Text style={styles.summaryMeta}>Fila offline: {queue.length}</Text>
      </View>

      <View style={styles.actionRow}>
        <View style={styles.actionItem}>
          <AppButton label="Ler QR Code" onPress={() => navigation.navigate('Scanner', { inventarioId })} />
        </View>
        <View style={styles.actionItem}>
          <AppButton label="Atualizar" onPress={() => void loadItems()} loading={loading} variant="secondary" />
        </View>
      </View>

      <View style={styles.actionRow}>
        <View style={styles.actionItem}>
          <AppButton label="Sincronizar" onPress={handleSync} loading={syncing} variant="secondary" />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Itens do inventario</Text>

      {loading ? <Text style={styles.emptyText}>Carregando itens...</Text> : null}

      {!loading && items.length === 0 ? <Text style={styles.emptyText}>Nenhum item de inventario encontrado.</Text> : null}

      {!loading &&
        items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() =>
              navigation.navigate('BemDetalhe', {
                inventarioId,
                inventarioItemId: item.id,
                bemPatrimonialId: item.bem_patrimonial_id,
              })
            }
            style={({ pressed }) => [styles.itemCard, pressed && styles.cardPressed]}
          >
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>Bem #{item.bem_patrimonial_id}</Text>
              <View style={[styles.badge, item.localizado ? styles.badgeFound : styles.badgePending]}>
                <Text style={styles.badgeLabel}>{item.localizado ? 'LOCALIZADO' : 'PENDENTE'}</Text>
              </View>
            </View>
            <Text style={styles.itemMeta}>Verificacao: {item.data_verificacao ?? 'Nao verificado'}</Text>
            <Text style={styles.itemMeta}>Observacoes: {item.observacoes ?? 'Sem observacoes'}</Text>
          </Pressable>
        ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
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
  },
  summaryMeta: {
    color: '#536762',
    fontSize: 14,
  },
  actionRow: {
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
  itemCard: {
    borderRadius: 20,
    backgroundColor: '#fffaf3',
    padding: 16,
    gap: 8,
  },
  cardPressed: {
    opacity: 0.92,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  itemTitle: {
    color: '#132a26',
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  itemMeta: {
    color: '#536762',
    fontSize: 14,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeFound: {
    backgroundColor: '#d1fae5',
  },
  badgePending: {
    backgroundColor: '#fee2e2',
  },
  badgeLabel: {
    color: '#17352f',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyText: {
    color: '#536762',
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
