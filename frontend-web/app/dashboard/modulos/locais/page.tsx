import { redirect } from 'next/navigation';

import LocalManagement from '../../../../components/LocalManagement';
import { getAuthSession } from '@/lib/auth-session';

export default async function LocaisPage() {
  const session = await getAuthSession();

  if (!session.token) {
    redirect('/login');
  }

  return <LocalManagement empresaId={session.empresaId} />;
}

