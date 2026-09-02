import AdminFrame from '@/components/AdminFrame';
import { getAuthSession } from '@/lib/auth-session';
import { isMasterCompanyName } from '@/lib/empresa-context';

type AdminShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  minimalTopbar?: boolean;
};

export default async function AdminShell({ title, subtitle, children, minimalTopbar = false }: AdminShellProps) {
  const session = await getAuthSession();
  const userInitial = (session.userName ?? session.userEmail ?? 'W').trim().charAt(0).toUpperCase();
  const empresaNome = session.dashboardScope === 'geral' ? 'Painel geral' : session.empresaNome;
  const empresaCnpj = session.dashboardScope === 'geral' ? null : session.empresaCnpj;
  const empresaLogoUrl =
    session.dashboardScope === 'geral'
      ? null
      : session.empresaLogoUrl ??
        session.empresas.find((empresa) => empresa.id === session.empresaId)?.logo_url ??
        null;
  const showEmpresasMenu =
    session.dashboardScope === 'geral'
      ? session.isSuperAdmin
      : isMasterCompanyName(session.empresaNome);

  return (
    <AdminFrame
      title={title}
      subtitle={subtitle}
      minimalTopbar={minimalTopbar}
      userInitial={userInitial}
      userName={session.userName}
      userEmail={session.userEmail}
      empresaNome={empresaNome}
      empresaCnpj={empresaCnpj}
      empresaLogoUrl={empresaLogoUrl}
      isSuperAdmin={session.isSuperAdmin}
      empresas={session.empresas}
      empresaAtualId={session.empresaId}
      dashboardScope={session.dashboardScope}
      showEmpresasMenu={showEmpresasMenu}
    >
      {children}
    </AdminFrame>
  );
}


