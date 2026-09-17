import { notFound, redirect } from 'next/navigation';

import DepreciacaoUnifiedManagement from '@/components/DepreciacaoUnifiedManagement';
import ExportacoesModuleManagement from '@/components/ExportacoesModuleManagement';
import GenericModuleManagement from '@/components/GenericModuleManagement';
import ResponsaveisUnifiedManagement from '@/components/ResponsaveisUnifiedManagement';
import ReportsModuleManagement from '@/components/ReportsModuleManagement';
import { getAuthSession } from '@/lib/auth-session';
import { getAdminModule, renderAdminIcon } from '@/lib/admin-navigation';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ModuloPage({ params }: PageProps) {
  const session = await getAuthSession();

  if (!session.token) {
    redirect('/login');
  }

  const { slug } = await params;

  if (slug === 'metodos-depreciacao') {
    redirect('/dashboard/modulos/depreciacoes');
  }

  if (slug === 'parametros-depreciacao') {
    redirect('/dashboard/modulos/depreciacoes');
  }

  if (slug === 'depreciacoes') {
    return <DepreciacaoUnifiedManagement empresaId={session.empresaId} />;
  }

  if (slug === 'responsaveis' || slug === 'responsabilidade-bens') {
    return (
      <ResponsaveisUnifiedManagement
        empresaId={session.empresaId}
        empresaNome={session.empresaNome}
        empresaLogoUrl={session.empresaLogoUrl}
        activeSlug={slug}
      />
    );
  }

  const module = getAdminModule(slug);

  if (!module) {
    notFound();
  }

  const crudSlugs = new Set([
    'bens',
    'tipos-bens',
    'tipos-produtos',
    'plaquetas',
    'inventarios',
    'transferencias-bens',
    'baixas-bens',
    'historico-localizacao-bens',
    'conciliacoes',
    'divergencias',
    'auditorias',
  ]);

  if (crudSlugs.has(slug)) {
    return (
      <GenericModuleManagement
        empresaId={session.empresaId}
        slug={slug}
        empresaNome={session.empresaNome}
        empresaLogoUrl={session.empresaLogoUrl}
      />
    );
  }

  if (slug === 'relatorios') {
    return (
      <ReportsModuleManagement empresaId={session.empresaId} empresaNome={session.empresaNome} empresaCnpj={session.empresaCnpj} />
    );
  }

  if (slug === 'exportacoes') {
    return <ExportacoesModuleManagement empresaId={session.empresaId} />;
  }

  return (
    <section className="panel-surface rounded-[22px] p-4 md:rounded-[28px] md:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[rgba(246,164,0,0.12)] text-[var(--accent)]">
          {renderAdminIcon(module.icon)}
        </div>

        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Módulo administrativo</p>
          <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-[var(--ink)]">{module.label}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">{module.description}</p>
        </div>
      </div>
    </section>
  );
}
