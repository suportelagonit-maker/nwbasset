import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import CentralAjuda from '@/components/CentralAjuda';
import { getAuthSession } from '@/lib/auth-session';

export const metadata: Metadata = {
  title: 'Central de Ajuda | NWB Asset',
  description: 'Passo a passo de todas as funcionalidades do NWB Asset.',
};

export default async function AjudaPage() {
  const session = await getAuthSession();

  if (!session.token) {
    redirect('/login');
  }

  return <CentralAjuda />;
}
