import { redirect } from 'next/navigation';

import EmpresaSelectionForm from '@/components/EmpresaSelectionForm';
import { getAuthSession } from '@/lib/auth-session';

export default async function SelecionarEmpresaPage() {
  const session = await getAuthSession();

  if (!session.token) {
    redirect('/login');
  }

  if (session.empresaId) {
    redirect(`/dashboard/patrimonio?empresa_id=${session.empresaId}`);
  }

  return (
    <main className="auth-art-page auth-art-page--company flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="auth-art-mesh" aria-hidden="true" />
      <div className="auth-art-orb auth-art-orb--one" aria-hidden="true" />
      <div className="auth-art-orb auth-art-orb--two" aria-hidden="true" />

      <div className="relative z-[1] flex w-full max-w-6xl justify-center lg:justify-end">
        <div className="flex w-full justify-center lg:justify-end">
          <EmpresaSelectionForm />
        </div>
      </div>
    </main>
  );
}

