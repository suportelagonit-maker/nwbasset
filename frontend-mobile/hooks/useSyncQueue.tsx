import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { syncPendingActions } from '../services/api';
import { getPendingSyncQueue, savePendingSyncQueue, type PendingSyncAction, type SessionData } from '../services/storage';

type SyncQueueContextValue = {
  queue: PendingSyncAction[];
  loading: boolean;
  enqueue: (action: PendingSyncAction) => Promise<void>;
  syncNow: (session: SessionData) => Promise<{ synced: number; remaining: number }>;
};

const SyncQueueContext = createContext<SyncQueueContextValue | undefined>(undefined);

export function SyncQueueProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<PendingSyncAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPendingSyncQueue()
      .then(setQueue)
      .finally(() => setLoading(false));
  }, []);

  const persistQueue = useCallback(async (nextQueue: PendingSyncAction[]) => {
    setQueue(nextQueue);
    await savePendingSyncQueue(nextQueue);
  }, []);

  const enqueue = useCallback(
    async (action: PendingSyncAction) => {
      const nextQueue = [...queue, action];
      await persistQueue(nextQueue);
    },
    [persistQueue, queue]
  );

  const syncNow = useCallback(
    async (session: SessionData) => {
      const remaining = await syncPendingActions(session, queue);
      const synced = queue.length - remaining.length;
      await persistQueue(remaining);

      return { synced, remaining: remaining.length };
    },
    [persistQueue, queue]
  );

  const value = useMemo(
    () => ({
      queue,
      loading,
      enqueue,
      syncNow,
    }),
    [enqueue, loading, queue, syncNow]
  );

  return <SyncQueueContext.Provider value={value}>{children}</SyncQueueContext.Provider>;
}

export function useSyncQueue() {
  const context = useContext(SyncQueueContext);

  if (!context) {
    throw new Error('useSyncQueue must be used within SyncQueueProvider');
  }

  return context;
}
