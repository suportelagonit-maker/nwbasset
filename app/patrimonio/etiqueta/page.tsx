import Image from 'next/image';

import EtiquetaPrintActions from '@/components/EtiquetaPrintActions';
import PatrimonioEtiquetaCard from '@/components/PatrimonioEtiquetaCard';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5000/api/v1').replace(/\/$/, '');

type LookupPayload = {
  data: {
    plaqueta: {
      codigo_plaqueta: string;
      numero_plaqueta: string;
      codigo_barras_conteudo: string;
      link_consulta: string;
      status: string;
      data_aplicacao: string | null;
    };
    bem: {
      id: number;
      numero_tombo: string;
      descricao: string;
    };
    empresa: {
      id: number | null;
      nome_fantasia: string | null;
      logo_url: string | null;
    };
  };
};

async function getLookup(codigo: string): Promise<LookupPayload | null> {
  if (!codigo) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/public/plaquetas/lookup?codigo=${encodeURIComponent(codigo)}`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as LookupPayload;
}

export default async function PatrimonioEtiquetaPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string; copias?: string }>;
}) {
  const params = await searchParams;
  const codigo = params.codigo ?? '';
  const copies = Math.min(12, Math.max(1, Number(params.copias ?? '6') || 6));
  const payload = await getLookup(codigo);

  if (!payload) {
    return (
      <main className="auth-art-page flex min-h-screen items-center justify-center px-4 py-10">
        <div className="relative z-[1] w-full max-w-2xl rounded-[32px] border border-[rgba(246,164,0,0.12)] bg-white p-8 text-center shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
          <Image src="/logoasset.png" alt="NWB Asset" width={180} height={54} className="mx-auto h-auto w-[180px] object-contain" priority />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[var(--ink)]">Etiqueta não encontrada</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            Não foi possível localizar uma plaqueta para o código informado.
          </p>
        </div>
      </main>
    );
  }

  const barcodeValue = payload.data.plaqueta.link_consulta || payload.data.plaqueta.codigo_barras_conteudo;
  const empresaLogoSrc = payload.data.empresa.logo_url;

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-6xl rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-white p-6 shadow-[0_24px_72px_rgba(15,23,42,0.08)] print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="mb-6 flex items-start justify-between gap-4 print:hidden">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--muted)]">Etiqueta patrimonial</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ink)]">
              Plaqueta {payload.data.plaqueta.numero_plaqueta}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Modelo de etiqueta no padrão patrimonial com logo, código de barras legível no celular e número grande para conferência física.
            </p>
          </div>

          <EtiquetaPrintActions consultaHref={`/patrimonio/consulta?codigo=${encodeURIComponent(codigo)}`} />
        </header>

        <section className="mb-6 grid gap-4 rounded-[24px] border border-[var(--line)] bg-[#fbfcfe] p-5 md:grid-cols-4 print:hidden">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Empresa</p>
            <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{payload.data.empresa.nome_fantasia ?? 'Não informada'}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Bem</p>
            <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{payload.data.bem.descricao}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Tombo</p>
            <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{payload.data.bem.numero_tombo}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Leitura</p>
            <p className="mt-2 break-all text-xs text-[var(--muted)]">{barcodeValue}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 justify-items-center gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2 print:gap-3">
          {Array.from({ length: copies }).map((_, index) => (
            <PatrimonioEtiquetaCard
              key={`${payload.data.plaqueta.numero_plaqueta}-${index}`}
              numeroPlaqueta={payload.data.plaqueta.numero_plaqueta}
              barcodeValue={barcodeValue}
              empresaNome={payload.data.empresa.nome_fantasia}
              logoSrc={empresaLogoSrc}
            />
          ))}
        </section>
      </div>
    </main>
  );
}
