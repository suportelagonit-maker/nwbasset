import { redirect } from 'next/navigation';

import ContagemInventario from '@/components/ContagemInventario';
import { getAuthSession } from '@/lib/auth-session';

/** O layout de /dashboard já monta o AdminShell: aqui vai só o conteúdo. */
export default async function ContagemPage({ params }: { params: Promise<{ inventarioId: string }> }) {
  const session = await getAuthSession();

  if (!session.token) {
    redirect('/login');
  }

  if (!session.empresaId) {
    redirect('/selecionar-empresa');
  }

  const { inventarioId } = await params;
  const identificador = Number(inventarioId);

  if (!Number.isInteger(identificador) || identificador <= 0) {
    redirect('/dashboard/modulos/inventarios');
  }

  return <ContagemInventario inventarioId={identificador} />;
}
