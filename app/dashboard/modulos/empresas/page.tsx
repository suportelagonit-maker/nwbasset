import { redirect } from 'next/navigation';

import EmpresaManagement from '../../../../components/EmpresaManagement';
import { getEmpresas } from '@/lib/admin-api';
import { getAuthMeData, getAuthSession } from '@/lib/auth-session';
import { isMasterCompanyName } from '@/lib/empresa-context';

export default async function EmpresasPage() {
  const session = await getAuthSession();

  if (!session.token) {
    redirect('/login');
  }

  const authMe = await getAuthMeData(session.dashboardScope === 'empresa' ? session.empresaId : null);
  const isMasterContext =
    session.dashboardScope === 'geral'
      ? Boolean(authMe?.is_super_admin)
      : isMasterCompanyName(authMe?.empresa_atual?.nome_fantasia);

  if (!isMasterContext) {
    redirect('/dashboard/modulos/filiais');
  }

  const initialEmpresas = await getEmpresas(session).catch(() => []);

  return <EmpresaManagement initialEmpresas={initialEmpresas} />;
}
