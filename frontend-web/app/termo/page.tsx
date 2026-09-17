import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import TermoAceite from '@/components/TermoAceite';
import { getAuthSession } from '@/lib/auth-session';

export const metadata: Metadata = {
  title: 'Termo de Responsabilidade e LGPD | NWB Asset',
};

export default async function TermoPage() {
  const session = await getAuthSession();

  if (!session.token) {
    redirect('/login');
  }

  return <TermoAceite userName={session.userName} />;
}
