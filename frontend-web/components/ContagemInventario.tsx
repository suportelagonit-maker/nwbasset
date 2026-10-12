'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import LeitorCodigo from '@/components/LeitorCodigo';
import { handleUnauthorizedClientResponse } from '@/lib/client-auth';
import { ouvirNfc, suportaNfc } from '@/lib/leitura-nfc';
import {
  enfileirar,
  listarPendentes,
  novoOrigemId,
  removerEnviadas,
  suportaFilaLocal,
  type LeituraPendente,
} from '@/lib/fila-contagem';

/**
 * Contagem de inventário em campo.
 *
 * Feita para quem está em pé no almoxarifado com o celular na mão: um botão
 * grande para ler, retorno imediato do que aconteceu com cada leitura e
 * nenhuma dependência de rede para continuar contando.
 */

type Resumo = {
  total: number;
  encontrados: number;
  pendentes: number;
  percentual: number;
  local_diferente: number;
  nao_identificadas: number;
  status: string;
};

type ItemPendente = {
  id: number;
  numero_tombo: string | null;
  descricao: string | null;
  local: string | null;
};

type LocalOpcao = { id: number; nome: string };

type ResponsavelOpcao = { id: number; nome: string };

type Paginacao = { pagina: number; por_pagina: number; total: number; ultima_pagina: number };

type RetornoLeitura = {
  origem_id: string | null;
  codigo: string;
  resultado: string;
  mensagem: string;
  exige_atencao: boolean;
  bem: { numero_tombo: string | null; descricao: string | null } | null;
};

const CORES: Record<string, string> = {
  CONTADO: 'bg-[rgba(74,222,128,0.16)] text-[#15803d]',
  JA_CONTADO: 'bg-[rgba(246,164,0,0.16)] text-[var(--accent-deep)]',
  LOCAL_DIFERENTE: 'bg-[rgba(246,164,0,0.16)] text-[var(--accent-deep)]',
  RESPONSAVEL_DIFERENTE: 'bg-[rgba(246,164,0,0.16)] text-[var(--accent-deep)]',
  FORA_DO_INVENTARIO: 'bg-[rgba(225,29,72,0.12)] text-[var(--rose)]',
  NAO_IDENTIFICADO: 'bg-[rgba(225,29,72,0.12)] text-[var(--rose)]',
};

export default function ContagemInventario({ inventarioId }: { inventarioId: number }) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [nome, setNome] = useState('');
  const [pendentes, setPendentes] = useState<ItemPendente[]>([]);
  const [locais, setLocais] = useState<LocalOpcao[]>([]);
  const [localAtual, setLocalAtual] = useState<string>('');
  const [responsaveis, setResponsaveis] = useState<ResponsavelOpcao[]>([]);
  const [responsavelAtual, setResponsavelAtual] = useState<string>('');
  const [paginacao, setPaginacao] = useState<Paginacao | null>(null);
  const [paginaPendentes, setPaginaPendentes] = useState(1);
  const [buscaPendentes, setBuscaPendentes] = useState('');
  const [escopo, setEscopo] = useState<string[]>([]);
  const [tipo, setTipo] = useState('COMPLETO');
  const [nfcLigado, setNfcLigado] = useState(false);
  const [leitorAberto, setLeitorAberto] = useState(false);
  const [historico, setHistorico] = useState<RetornoLeitura[]>([]);
  const [naFila, setNaFila] = useState(0);
  const [online, setOnline] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [codigoManual, setCodigoManual] = useState('');

  const localAtualRef = useRef(localAtual);
  localAtualRef.current = localAtual;
  const responsavelAtualRef = useRef(responsavelAtual);
  responsavelAtualRef.current = responsavelAtual;
  const pararNfcRef = useRef<(() => void) | null>(null);
  const enviandoRef = useRef(false);

  const atualizarContadorDaFila = useCallback(async () => {
    if (!suportaFilaLocal()) {
      return;
    }
    setNaFila((await listarPendentes(inventarioId)).length);
  }, [inventarioId]);

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch(`/api/admin/inventarios/${inventarioId}/contagem?pagina=${paginaPendentes}&por_pagina=50&busca=${encodeURIComponent(buscaPendentes)}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const corpo = (await resposta.json().catch(() => null)) as { data?: Record<string, never>; message?: string } | null;

      if (handleUnauthorizedClientResponse(resposta.status, corpo?.message)) {
        return;
      }

      if (!resposta.ok || !corpo?.data) {
        throw new Error(corpo?.message ?? 'Não foi possível carregar a contagem.');
      }

      const dados = corpo.data as unknown as {
        inventario: { nome: string; tipo: string };
        resumo: Resumo;
        pendentes: ItemPendente[];
        paginacao: Paginacao;
      };

      setNome(dados.inventario.nome);
      setTipo(dados.inventario.tipo ?? 'COMPLETO');
      setResumo(dados.resumo);
      setPendentes((atual) =>
        dados.paginacao.pagina > 1 ? [...atual, ...dados.pendentes] : dados.pendentes,
      );
      setPaginacao(dados.paginacao);
      setErro(null);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar a contagem.');
    }
  }, [inventarioId, paginaPendentes, buscaPendentes]);

  const enviarFila = useCallback(async () => {
    // A trava e um ref de proposito: com leituras em sequencia rapida, o
    // estado "enviando" chega tarde e a leitura ficaria presa na fila ate
    // a proxima leitura ou a volta da rede.
    if (!suportaFilaLocal() || enviandoRef.current) {
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);

    try {
      // Esvazia a fila inteira, nao so o primeiro lote: o que chegou
      // enquanto este envio corria tambem sobe agora.
      for (;;) {
        const fila = await listarPendentes(inventarioId);

        if (fila.length === 0) {
          break;
        }

        // Em lotes: uma fila de um dia inteiro não cabe numa requisição só.
        const lote = fila.slice(0, 100);
        const resposta = await fetch(`/api/admin/inventarios/${inventarioId}/leituras`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            leituras: lote.map((item) => ({
              codigo: item.codigo,
              origem_id: item.origem_id,
              local_id: item.local_id,
              responsavel_id: item.responsavel_id ?? null,
              lido_em: item.lido_em,
            })),
          }),
        });
        const corpo = (await resposta.json().catch(() => null)) as
          | { data?: { leituras: RetornoLeitura[]; resumo: Resumo }; message?: string }
          | null;

        if (handleUnauthorizedClientResponse(resposta.status, corpo?.message)) {
          return;
        }

        if (!resposta.ok) {
          throw new Error(corpo?.message ?? 'Falha ao enviar as leituras.');
        }

        await removerEnviadas(lote.map((item) => item.origem_id));

        if (corpo?.data) {
          setResumo(corpo.data.resumo);
          setHistorico((atual) => [...corpo.data!.leituras.slice().reverse(), ...atual].slice(0, 30));
        }

        setErro(null);
        await atualizarContadorDaFila();
      }

      await carregar();
    } catch (falha) {
      // A fila fica onde está: a leitura não se perde por falha de rede.
      setErro(falha instanceof Error ? falha.message : 'Falha ao enviar as leituras.');
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }, [atualizarContadorDaFila, carregar, inventarioId]);

  useEffect(() => () => pararNfcRef.current?.(), []);

  useEffect(() => {
    setOnline(navigator.onLine);

    const aoVoltar = () => {
      setOnline(true);
      void enviarFila();
    };
    const aoCair = () => setOnline(false);

    window.addEventListener('online', aoVoltar);
    window.addEventListener('offline', aoCair);

    return () => {
      window.removeEventListener('online', aoVoltar);
      window.removeEventListener('offline', aoCair);
    };
  }, [enviarFila]);

  useEffect(() => {
    void (async () => {
      await carregar();
      await atualizarContadorDaFila();
      await enviarFila();

      const [respostaLocais, respostaResponsaveis] = await Promise.all([
        fetch('/api/admin/locais?per_page=300', { headers: { Accept: 'application/json' }, cache: 'no-store' }).catch(() => null),
        fetch('/api/admin/responsaveis?per_page=300', { headers: { Accept: 'application/json' }, cache: 'no-store' }).catch(() => null),
      ]);

      if (respostaLocais?.ok) {
        const corpo = (await respostaLocais.json().catch(() => null)) as { data?: LocalOpcao[] } | null;
        setLocais(corpo?.data ?? []);
      }

      if (respostaResponsaveis?.ok) {
        const corpo = (await respostaResponsaveis.json().catch(() => null)) as { data?: ResponsavelOpcao[] } | null;
        setResponsaveis(corpo?.data ?? []);
      }
    })();
    // Só na montagem: as dependências são estáveis e recarregar aqui
    // reenviaria a fila a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function registrar(codigo: string) {
    const limpo = codigo.trim();

    if (limpo === '') {
      return;
    }

    const leitura: LeituraPendente = {
      origem_id: novoOrigemId(),
      inventario_id: inventarioId,
      codigo: limpo,
      local_id: localAtualRef.current ? Number(localAtualRef.current) : null,
      responsavel_id: responsavelAtualRef.current ? Number(responsavelAtualRef.current) : null,
      lido_em: new Date().toISOString(),
    };

    if (suportaFilaLocal()) {
      await enfileirar(leitura);
      await atualizarContadorDaFila();
      await enviarFila();
      return;
    }

    // Navegador sem IndexedDB: envia direto, sem rede de segurança.
    setHistorico((atual) => [
      { origem_id: null, codigo: limpo, resultado: 'CONTADO', mensagem: 'Enviando…', exige_atencao: false, bem: null },
      ...atual,
    ]);
  }

  async function alternarNfc() {
    if (nfcLigado) {
      pararNfcRef.current?.();
      pararNfcRef.current = null;
      setNfcLigado(false);
      return;
    }

    const parar = await ouvirNfc(
      (codigo) => void registrar(codigo),
      (mensagem) => {
        setErro(mensagem);
        setNfcLigado(false);
      },
    );

    pararNfcRef.current = parar;
    setNfcLigado(true);
  }

  /** Define quais locais esta contagem cobre (inventário rotativo). */
  async function salvarEscopo() {
    setEnviando(true);

    try {
      const resposta = await fetch(`/api/admin/inventarios/${inventarioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ locais: escopo.map(Number) }),
      });
      const corpo = (await resposta.json().catch(() => null)) as
        | { message?: string; errors?: Record<string, string[]> }
        | null;

      if (handleUnauthorizedClientResponse(resposta.status, corpo?.message)) {
        return;
      }

      if (!resposta.ok) {
        const primeiro = corpo?.errors ? Object.values(corpo.errors)[0]?.[0] : null;
        throw new Error(primeiro ?? corpo?.message ?? 'Não foi possível definir o escopo.');
      }

      setPaginaPendentes(1);
      await carregar();
      setErro(null);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível definir o escopo.');
    } finally {
      setEnviando(false);
    }
  }

  async function finalizar() {
    if (!window.confirm('Finalizar a contagem e gerar a conciliação?\n\nOs bens não lidos entram como divergência.')) {
      return;
    }

    setEnviando(true);

    try {
      await enviarFila();
      const resposta = await fetch(`/api/admin/inventarios/${inventarioId}/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({}),
      });
      const corpo = (await resposta.json().catch(() => null)) as { message?: string } | null;

      if (handleUnauthorizedClientResponse(resposta.status, corpo?.message)) {
        return;
      }

      if (!resposta.ok) {
        throw new Error(corpo?.message ?? 'Não foi possível finalizar.');
      }

      await carregar();
      setErro(null);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível finalizar.');
    } finally {
      setEnviando(false);
    }
  }

  const finalizado = resumo?.status === 'FINALIZADO';

  return (
    <div className="grid gap-4">
      <LeitorCodigo
        aberto={leitorAberto}
        onFechar={() => setLeitorAberto(false)}
        onLer={(codigo) => void registrar(codigo)}
        confirmar={false}
        titulo="Contagem do inventário"
        descricao="Aponte a câmera para a etiqueta. Pode ler uma atrás da outra."
      />

      <section className="panel-surface rounded-[22px] p-4 md:rounded-[28px] md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Contagem</p>
            <h2 className="mt-1.5 text-[1.3rem] font-semibold tracking-[-0.03em] text-[var(--ink)]">{nome || 'Inventário'}</h2>
          </div>

          <div className="flex items-center gap-2">
            {!online ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(246,164,0,0.16)] px-3 py-1 text-[11px] font-semibold text-[var(--accent-deep)]">
                Sem rede · contagem continua
              </span>
            ) : null}
            {naFila > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(37,99,235,0.1)] px-3 py-1 text-[11px] font-semibold text-[var(--blue)]">
                {naFila} {naFila === 1 ? 'leitura aguardando' : 'leituras aguardando'}
              </span>
            ) : null}
          </div>
        </div>

        {resumo ? (
          <>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[#eef2f7]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-[width]"
                style={{ width: `${Math.min(100, resumo.percentual)}%` }}
              />
            </div>
            <p className="mt-2 text-[13px] text-[var(--muted)]">
              <span className="font-semibold text-[var(--ink)]">
                {resumo.encontrados} de {resumo.total}
              </span>{' '}
              contados · {resumo.pendentes} pendentes
              {resumo.local_diferente > 0 ? ` · ${resumo.local_diferente} em local diferente` : ''}
              {resumo.nao_identificadas > 0 ? ` · ${resumo.nao_identificadas} não identificadas` : ''}
            </p>
          </>
        ) : null}

        <label className="admin-field mt-4">
          Onde você está contando
          <select value={localAtual} onChange={(evento) => setLocalAtual(evento.target.value)} className="admin-input">
            <option value="">Não informar o local</option>
            {locais.map((local) => (
              <option key={local.id} value={local.id}>
                {local.nome}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] leading-4 text-[var(--muted)]">
            Informando o local, o sistema aponta os bens que estão fora do lugar cadastrado.
          </span>
        </label>

        <label className="admin-field mt-3">
          Responsável conferido
          <select
            value={responsavelAtual}
            onChange={(evento) => setResponsavelAtual(evento.target.value)}
            className="admin-input"
          >
            <option value="">Não conferir o responsável</option>
            {responsaveis.map((pessoa) => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.nome}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] leading-4 text-[var(--muted)]">
            Preenchido, o sistema aponta o bem que está com pessoa diferente da cadastrada.
          </span>
        </label>

        {!finalizado ? (
          <button
            type="button"
            onClick={() => setLeitorAberto(true)}
            className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 text-[15px] font-semibold text-white transition hover:opacity-90"
          >
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 8V6a2 2 0 0 1 2-2h2M17 4h2a2 2 0 0 1 2 2v2M21 16v2a2 2 0 0 1-2 2h-2M7 20H5a2 2 0 0 1-2-2v-2" />
              <path d="M7 9v6M10 9v6M13 9v6M17 9v6" />
            </svg>
            Ler etiqueta
          </button>
        ) : (
          <p className="mt-4 rounded-2xl border border-[var(--line)] bg-[#fafafa] px-4 py-3.5 text-[13px] text-[var(--muted)]">
            Este inventário foi finalizado. A conciliação já foi gerada.
          </p>
        )}

        {!finalizado ? (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(evento) => {
              evento.preventDefault();
              void registrar(codigoManual);
              setCodigoManual('');
            }}
          >
            <input
              value={codigoManual}
              onChange={(evento) => setCodigoManual(evento.target.value)}
              placeholder="Ou digite o número da plaqueta"
              className="admin-input flex-1"
            />
            <button
              type="submit"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-[13px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)]"
            >
              Contar
            </button>
          </form>
        ) : null}

        {!finalizado && suportaNfc() ? (
          <button
            type="button"
            onClick={() => void alternarNfc()}
            className={`mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border px-4 text-[13px] font-semibold transition ${
              nfcLigado
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-deep)]'
                : 'border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--accent)]'
            }`}
          >
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 8a16 16 0 0 1 0 8M8 6a20 20 0 0 1 0 12M12 4.5a24 24 0 0 1 0 15M16 6a20 20 0 0 1 0 12M20 8a16 16 0 0 1 0 8" />
            </svg>
            {nfcLigado ? 'Lendo por aproximação — encoste no bem' : 'Ler por aproximação (NFC)'}
          </button>
        ) : null}

        {erro ? <p className="mt-3 text-[13px] font-medium text-[var(--rose)]">{erro}</p> : null}

        {!finalizado && resumo && resumo.encontrados === 0 && locais.length > 0 ? (
          <details className="mt-4 rounded-2xl border border-[var(--line)] bg-[#fafafa] px-4 py-3">
            <summary className="cursor-pointer text-[13px] font-semibold text-[var(--ink)]">
              Contar só alguns locais {tipo === 'ROTATIVO' ? '(rotativo ativo)' : '(inventário rotativo)'}
            </summary>
            <p className="mt-2 text-[12px] leading-5 text-[var(--muted)]">
              Escolha os locais desta rodada. O que ficar de fora não entra na contagem nem vira divergência.
              Só dá para mudar antes da primeira leitura.
            </p>
            <div className="mt-3 grid gap-1.5">
              {locais.map((local) => (
                <label key={local.id} className="inline-flex items-center gap-2 text-[13px] text-[var(--ink)]">
                  <input
                    type="checkbox"
                    checked={escopo.includes(String(local.id))}
                    onChange={(evento) =>
                      setEscopo((atual) =>
                        evento.target.checked
                          ? [...atual, String(local.id)]
                          : atual.filter((item) => item !== String(local.id)),
                      )
                    }
                    className="h-4 w-4 rounded border border-[var(--line)]"
                  />
                  {local.nome}
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void salvarEscopo()}
              disabled={enviando}
              className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-[12px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] disabled:opacity-60"
            >
              {escopo.length === 0 ? 'Contar a filial inteira' : `Contar só ${escopo.length} local(is)`}
            </button>
          </details>
        ) : null}
      </section>

      {historico.length > 0 ? (
        <section className="panel-surface rounded-[22px] p-4 md:rounded-[28px] md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Últimas leituras</p>
          <div className="mt-3 grid gap-2">
            {historico.slice(0, 12).map((leitura, indice) => (
              <div
                key={`${leitura.origem_id ?? leitura.codigo}-${indice}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--line)] bg-[#fafafa] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    {leitura.bem?.numero_tombo ?? leitura.codigo}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-[var(--muted)]">
                    {leitura.bem?.descricao ?? leitura.mensagem}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${CORES[leitura.resultado] ?? ''}`}>
                  {leitura.mensagem}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!finalizado && (pendentes.length > 0 || buscaPendentes) ? (
        <section className="panel-surface rounded-[22px] p-4 md:rounded-[28px] md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Ainda não contados ({paginacao?.total ?? pendentes.length})
          </p>
          <input
            value={buscaPendentes}
            onChange={(evento) => {
              setPaginaPendentes(1);
              setBuscaPendentes(evento.target.value);
            }}
            placeholder="Buscar por tombo ou descrição"
            className="admin-input mt-3"
          />
          {pendentes.length === 0 ? (
            <p className="mt-3 text-[13px] text-[var(--muted)]">Nenhum pendente corresponde à busca.</p>
          ) : null}
          <div className="mt-3 grid gap-2">
            {pendentes.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[var(--line)] bg-[#fafafa] px-4 py-3">
                <p className="text-sm font-semibold text-[var(--ink)]">{item.numero_tombo ?? 'Sem tombo'}</p>
                <p className="mt-0.5 truncate text-[12px] text-[var(--muted)]">
                  {item.descricao}
                  {item.local ? ` · ${item.local}` : ''}
                </p>
              </div>
            ))}
          </div>
          {paginacao && paginacao.pagina < paginacao.ultima_pagina ? (
            <button
              type="button"
              onClick={() => setPaginaPendentes((atual) => atual + 1)}
              className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-[12px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)]"
            >
              Ver mais {paginacao.total - pendentes.length} pendentes
            </button>
          ) : null}
        </section>
      ) : null}

      {!finalizado ? (
        <button
          type="button"
          onClick={() => void finalizar()}
          disabled={enviando}
          className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--line)] bg-white px-5 text-[13px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)] disabled:opacity-60"
        >
          {enviando ? 'Processando…' : 'Finalizar contagem e conciliar'}
        </button>
      ) : null}
    </div>
  );
}
