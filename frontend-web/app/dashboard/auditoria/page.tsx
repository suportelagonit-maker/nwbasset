import { redirect } from 'next/navigation';

import TrilhaAuditoria from '@/components/TrilhaAuditoria';
import { getAuthSession } from '@/lib/auth-session';

/** O layout de /dashboard já monta o AdminShell: aqui vai só o conteúdo. */
export default async function AuditoriaPage() {
  const session = await getAuthSession();

  if (!session.token) {
    redirect('/login');
  }

  if (!session.empresaId) {
    redirect('/selecionar-empresa');
  }

  return <TrilhaAuditoria />;
}
