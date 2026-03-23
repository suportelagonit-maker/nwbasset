import { redirect } from 'next/navigation';

import FilialManagement from '../../../../components/FilialManagement';
import { getAuthSession } from '@/lib/auth-session';

export default async function FiliaisPage() {
  const session = await getAuthSession();

  if (!session.token) {
    redirect('/login');
  }

  return <FilialManagement empresaId={session.empresaId} />;
}
