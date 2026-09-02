import AsyncStorage from '@react-native-async-storage/async-storage';

export type SessionData = {
  operador: string;
  empresaId: number;
  filialId: number;
  apiToken?: string;
};

export type PendingSyncAction =
  | {
      id: string;
      type: 'confirm_presence';
      payload: {
        inventarioId: number;
        inventarioItemId: number;
        observacoes?: string;
      };
    }
  | {
      id: string;
      type: 'register_divergence';
      payload: {
        inventarioId: number;
        bemPatrimonialId: number;
        tipoDivergencia: string;
        descricao: string;
      };
    };

const SESSION_KEY = '@nwbasset_mobile_session';
const QUEUE_KEY = '@nwbasset_mobile_sync_queue';

function getPhotoKey(inventarioId: number, bemPatrimonialId: number): string {
  return `@nwbasset_mobile_photo:${inventarioId}:${bemPatrimonialId}`;
}

export async function getSession(): Promise<SessionData | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as SessionData) : null;
}

export async function saveSession(session: SessionData): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function getPendingSyncQueue(): Promise<PendingSyncAction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as PendingSyncAction[]) : [];
}

export async function savePendingSyncQueue(queue: PendingSyncAction[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function saveBemPhoto(inventarioId: number, bemPatrimonialId: number, uri: string): Promise<void> {
  await AsyncStorage.setItem(getPhotoKey(inventarioId, bemPatrimonialId), uri);
}

export async function getBemPhoto(inventarioId: number, bemPatrimonialId: number): Promise<string | null> {
  return AsyncStorage.getItem(getPhotoKey(inventarioId, bemPatrimonialId));
}

export async function clearBemPhoto(inventarioId: number, bemPatrimonialId: number): Promise<void> {
  await AsyncStorage.removeItem(getPhotoKey(inventarioId, bemPatrimonialId));
}
