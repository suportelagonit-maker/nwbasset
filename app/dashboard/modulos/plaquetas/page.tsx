import { redirect } from 'next/navigation';

import PlaquetaManagement from '@/components/PlaquetaManagement';
import { getAuthSession } from '@/lib/auth-session';

export default async function PlaquetasPage() {
  const session = await getAuthSession();

  if (!session.token) {
    redirect('/login');
  }

  if (!session.empresaId) {
    redirect('/selecionar-empresa');
  }

  return (
    <PlaquetaManagement
      empresaId={session.empresaId}
      empresaNome={session.empresaNome}
      empresaLogoUrl={session.empresaLogoUrl}
    />
  );
}
