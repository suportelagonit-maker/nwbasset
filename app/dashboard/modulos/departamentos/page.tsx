import { redirect } from 'next/navigation';

import DepartamentoManagement from '../../../../components/DepartamentoManagement';
import { getAuthSession } from '@/lib/auth-session';

export default async function DepartamentosPage() {
  const session = await getAuthSession();

  if (!session.token) {
    redirect('/login');
  }

  return <DepartamentoManagement empresaId={session.empresaId} />;
}
