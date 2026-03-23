import Image from 'next/image';
import Link from 'next/link';

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
      categoria: string | null;
      marca: string | null;
      modelo: string | null;
      status_bem: string;
      estado_conservacao: string;
    };
    empresa: {
      id: number | null;
      nome_fantasia: string | null;
    };
    filial: {
      id: number | null;
      nome: string | null;
    };
    local: {
      id: number | null;
      nome: string | null;
    };
    responsavel: {
      id: number | null;
      nome: string | null;
      matricula: string | null;
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

export default async function PatrimonioConsultaPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  const params = await searchParams;
  const codigo = params.codigo ?? '';
  const payload = await getLookup(codigo);

  return (
    <main className="auth-art-page flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="auth-art-mesh" aria-hidden="true" />
      <div className="auth-art-orb auth-art-orb--one" aria-hidden="true" />
      <div className="auth-art-orb auth-art-orb--two" aria-hidden="true" />

      <div className="relative z-[1] w-full max-w-3xl rounded-[32px] border border-[rgba(246,164,0,0.12)] bg-white/92 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Image src="/logoasset.png" alt="NWB Asset" width={180} height={54} className="h-auto w-[140px] object-contain md:w-[180px]" priority />
          <span className="inline-flex rounded-full border border-[rgba(246,164,0,0.28)] bg-[#fff8ec] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-deep)]">
            Consulta patrimonial
          </span>
        </div>

        {!payload ? (
          <section className="rounded-[26px] border border-[var(--line)] bg-white p-8">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">Plaqueta não encontrada</h1>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Não foi possível localizar um patrimônio para o código informado.
            </p>
          </section>
        ) : (
          <section className="space-y-5">
            <div className="rounded-[26px] border border-[var(--line)] bg-white p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--muted)]">Patrimonio</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--ink)]">{payload.data.bem.descricao}</h1>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[20px] border border-[var(--line)] bg-[#fffaf2] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Plaqueta</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{payload.data.plaqueta.numero_plaqueta}</p>
                </div>
                <div className="rounded-[20px] border border-[var(--line)] bg-[#fffaf2] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Tombo</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{payload.data.bem.numero_tombo}</p>
                </div>
                <div className="rounded-[20px] border border-[var(--line)] bg-[#fffaf2] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Status</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{payload.data.bem.status_bem}</p>
                </div>
                <div className="rounded-[20px] border border-[var(--line)] bg-[#fffaf2] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Conservação</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{payload.data.bem.estado_conservacao}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-[26px] border border-[var(--line)] bg-white p-6">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Estrutura</p>
                <div className="mt-4 space-y-3 text-sm text-[var(--ink)]">
                  <p><span className="font-semibold">Empresa:</span> {payload.data.empresa.nome_fantasia ?? 'Não informada'}</p>
                  <p><span className="font-semibold">Filial:</span> {payload.data.filial.nome ?? 'Não informada'}</p>
                  <p><span className="font-semibold">Local:</span> {payload.data.local.nome ?? 'Não informado'}</p>
                  <p><span className="font-semibold">Responsável:</span> {payload.data.responsavel.nome ?? 'Não informado'}</p>
                </div>
              </div>
              <div className="rounded-[26px] border border-[var(--line)] bg-white p-6">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Detalhes</p>
                <div className="mt-4 space-y-3 text-sm text-[var(--ink)]">
                  <p><span className="font-semibold">Categoria:</span> {payload.data.bem.categoria ?? 'Não informada'}</p>
                  <p><span className="font-semibold">Marca:</span> {payload.data.bem.marca ?? 'Não informada'}</p>
                  <p><span className="font-semibold">Modelo:</span> {payload.data.bem.modelo ?? 'Não informado'}</p>
                  <p><span className="font-semibold">Código:</span> {payload.data.plaqueta.codigo_barras_conteudo}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="mt-6 flex justify-end">
          <Link href="/login" className="inline-flex rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)]">
            Ir para o sistema
          </Link>
        </div>
      </div>
    </main>
  );
}
