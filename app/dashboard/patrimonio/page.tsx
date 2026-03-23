import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import DashboardPatrimonioClient from '@/components/DashboardPatrimonioClient';
import { AUTH_TOKEN_COOKIE, DASHBOARD_SCOPE_COOKIE, EMPRESA_ID_COOKIE } from '@/lib/auth-session';
import type { DashboardQueryFilters } from '@/lib/patrimonio-api';

export const dynamic = 'force-dynamic';

export default async function PatrimonioDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  const cookieEmpresaId = Number(cookieStore.get(EMPRESA_ID_COOKIE)?.value ?? '');
  const dashboardScope = cookieStore.get(DASHBOARD_SCOPE_COOKIE)?.value === 'geral' ? 'geral' : 'empresa';

  if (!token) {
    redirect('/login');
  }

  const isGeneralView = dashboardScope === 'geral';
  const filters: DashboardQueryFilters = {
    empresa_id:
      isGeneralView
        ? undefined
        : (Number.isInteger(cookieEmpresaId) && cookieEmpresaId > 0 ? cookieEmpresaId : undefined),
    filial_id: undefined,
  };

  return <DashboardPatrimonioClient filters={filters} isGeneralView={isGeneralView} />;
}
