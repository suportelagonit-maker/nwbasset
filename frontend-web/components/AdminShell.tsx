import CascaNwbAsset from '@/components/CascaNwbAsset';
import { getAuthSession } from '@/lib/auth-session';

type AdminShellProps = {
  // title/subtitle/minimalTopbar seguem na assinatura por compatibilidade com as
  // paginas que ainda os passam; a casca do DS tem o proprio cabecalho.
  title?: string;
  subtitle?: string;
  minimalTopbar?: boolean;
  children: React.ReactNode;
};

export default async function AdminShell({ children }: AdminShellProps) {
  const session = await getAuthSession();
  const empresaNome = session.dashboardScope === 'geral' ? 'Painel geral' : session.empresaNome;
  const podeTrocarEmpresa = session.isSuperAdmin || (session.empresas?.length ?? 0) > 1;

  return (
    <CascaNwbAsset
      userName={session.userName}
      userEmail={session.userEmail}
      empresaNome={empresaNome}
      podeTrocarEmpresa={podeTrocarEmpresa}
      podePermissoes={session.isSuperAdmin}
    >
      {children}
    </CascaNwbAsset>
  );
}
