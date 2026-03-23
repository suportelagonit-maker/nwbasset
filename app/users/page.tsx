import AdminShell from '@/components/AdminShell';
import UsersManagement from '@/components/UsersManagement';

export default async function UsersPage() {
  return (
    <AdminShell
      title="Usuários e acessos"
      subtitle="Gestão de usuários vinculados à empresa ativa, com permissões definidas por caixas de seleção."
    >
      <UsersManagement />
    </AdminShell>
  );
}
