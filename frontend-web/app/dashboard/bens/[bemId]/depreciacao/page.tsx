import { redirect } from 'next/navigation';

import MemoriaCalculoDepreciacao from '@/components/MemoriaCalculoDepreciacao';
import { getAuthSession } from '@/lib/auth-session';

/** O layout de /dashboard já monta o AdminShell: aqui vai só o conteúdo. */
export default async function MemoriaCalculoPage({ params }: { params: Promise<{ bemId: string }> }) {
  const session = await getAuthSession();

  if (!session.token) {
    redirect('/login');
  }

  if (!session.empresaId) {
    redirect('/selecionar-empresa');
  }

  const { bemId } = await params;
  const identificador = Number(bemId);

  if (!Number.isInteger(identificador) || identificador <= 0) {
    redirect('/dashboard/modulos/bens');
  }

  return <MemoriaCalculoDepreciacao bemId={identificador} />;
}
