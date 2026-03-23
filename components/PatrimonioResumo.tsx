import DashboardCard from '@/components/DashboardCard';
import type { PatrimonioResumo as PatrimonioResumoData } from '@/lib/patrimonio-api';

type PatrimonioResumoProps = {
  resumo: PatrimonioResumoData;
};

export default function PatrimonioResumo({ resumo }: PatrimonioResumoProps) {
  return (
    <section className="grid gap-5 xl:grid-cols-4">
      <DashboardCard label="Quantidade" value={resumo.total_bens} accent="neutral" subtitle="Bens Patrimoniais" />
      <DashboardCard
        label="Valor total"
        value={resumo.valor_total_patrimonio}
        accent="mint"
        isCurrency
        subtitle="Valor Patrimonial"
        wave
      />
      <DashboardCard label="Quantidade" value={resumo.bens_depreciados} accent="neutral" subtitle="Bens Depreciados" />
      <DashboardCard
        label="Quantidade"
        value={resumo.bens_sem_plaqueta}
        accent="amber"
        subtitle="Bens sem Plaqueta"
        wave
      />
    </section>
  );
}
