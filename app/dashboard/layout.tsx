import AdminShell from '@/components/AdminShell';

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminShell
      title="Gestão de Patrimônio"
      subtitle="Painel administrativo para acompanhamento patrimonial, operação e auditoria."
      minimalTopbar
    >
      {children}
    </AdminShell>
  );
}
