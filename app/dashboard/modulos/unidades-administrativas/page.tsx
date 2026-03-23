import { redirect } from 'next/navigation';

import UnidadeAdministrativaManagement from '../../../../components/UnidadeAdministrativaManagement';
import { getAuthSession } from '@/lib/auth-session';

export default async function UnidadesAdministrativasPage() {
  const session = await getAuthSession();

  if (!session.token) {
    redirect('/login');
  }

  return <UnidadeAdministrativaManagement empresaId={session.empresaId} />;
}
