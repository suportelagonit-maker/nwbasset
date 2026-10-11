/**
 * Fila de leituras do inventário, guardada no próprio aparelho.
 *
 * Inventário acontece em almoxarifado, subsolo e galpão — lugares onde o
 * sinal cai. Se a leitura dependesse da rede, o operador teria de parar de
 * contar, e contagem interrompida é contagem refeita.
 *
 * Por isso toda leitura entra primeiro na fila local e só depois vai ao
 * servidor. Cada uma leva um `origem_id` gerado aqui: reenviar a fila
 * inteira (porque a rede caiu no meio do envio) não conta nada duas vezes,
 * porque o servidor reconhece o que já recebeu.
 *
 * Fica em IndexedDB, não em localStorage: a fila pode ter milhares de
 * leituras e precisa sobreviver ao navegador ser fechado no meio do
 * caminho.
 */

export type LeituraPendente = {
  origem_id: string;
  inventario_id: number;
  codigo: string;
  local_id: number | null;
  lido_em: string;
};

const BANCO = 'nwbasset-inventario';
const DEPOSITO = 'leituras';
const VERSAO = 1;

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BANCO, VERSAO);

    pedido.onupgradeneeded = () => {
      const bd = pedido.result;
      if (!bd.objectStoreNames.contains(DEPOSITO)) {
        const deposito = bd.createObjectStore(DEPOSITO, { keyPath: 'origem_id' });
        deposito.createIndex('inventario', 'inventario_id', { unique: false });
      }
    };

    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error ?? new Error('Não foi possível abrir a fila local.'));
  });
}

async function comDeposito<T>(modo: IDBTransactionMode, acao: (deposito: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const bd = await abrir();

  try {
    return await new Promise<T>((resolve, reject) => {
      const transacao = bd.transaction(DEPOSITO, modo);
      const pedido = acao(transacao.objectStore(DEPOSITO));
      pedido.onsuccess = () => resolve(pedido.result);
      pedido.onerror = () => reject(pedido.error ?? new Error('Falha na fila local.'));
    });
  } finally {
    bd.close();
  }
}

/** Identificador da leitura, único por aparelho. */
export function novoOrigemId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function enfileirar(leitura: LeituraPendente): Promise<void> {
  await comDeposito('readwrite', (deposito) => deposito.put(leitura));
}

export async function listarPendentes(inventarioId: number): Promise<LeituraPendente[]> {
  const todas = await comDeposito<LeituraPendente[]>('readonly', (deposito) => deposito.getAll());

  return todas
    .filter((leitura) => leitura.inventario_id === inventarioId)
    .sort((a, b) => a.lido_em.localeCompare(b.lido_em));
}

export async function removerEnviadas(origemIds: string[]): Promise<void> {
  for (const id of origemIds) {
    await comDeposito('readwrite', (deposito) => deposito.delete(id));
  }
}

export function suportaFilaLocal(): boolean {
  return typeof indexedDB !== 'undefined';
}
