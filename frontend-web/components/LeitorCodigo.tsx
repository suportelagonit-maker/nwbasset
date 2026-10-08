'use client';

import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Leitor de código de barras / QR pela câmera do aparelho.
 *
 * Usa a câmera traseira (`facingMode: environment`) e tenta ler por dois
 * caminhos: o zxing (varrendo a imagem inteira e duas faixas centrais, com
 * realce de contraste para etiquetas desbotadas) e, se ele não iniciar, o
 * `BarcodeDetector` nativo do navegador.
 *
 * O componente devolve o código lido; o que fazer com ele é de quem chama.
 * `validar` permite recusar leituras parciais (a tela de plaquetas exige um
 * número com no mínimo quatro dígitos, por exemplo).
 */

export type LeitorCodigoProps = {
  aberto: boolean;
  onFechar: () => void;
  onLer: (codigo: string) => void;
  titulo?: string;
  descricao?: string;
  /** Mostra o valor lido para conferência antes de usar (padrão: true). */
  confirmar?: boolean;
  /** Devolve uma mensagem quando a leitura ainda não serve; null quando serve. */
  validar?: (codigo: string) => string | null;
};

const FORMATOS_ZXING = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.QR_CODE,
];

const FORMATOS_NATIVO = ['code_128', 'code_39', 'itf', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'];

export default function LeitorCodigo({
  aberto,
  onFechar,
  onLer,
  titulo = 'Ler código',
  descricao = 'Aponte a câmera para o código de barras ou QR Code da etiqueta.',
  confirmar = true,
  validar,
}: LeitorCodigoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const leitorRef = useRef<BrowserMultiFormatReader | null>(null);
  const detectorRef = useRef<{ detect: (fonte: CanvasImageSource) => Promise<Array<{ rawValue?: string }>> } | null>(null);
  const quadroRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ultimaTentativaRef = useRef(0);
  const ultimaRecusaRef = useRef({ valor: '', em: 0 });
  const ativoRef = useRef(false);

  const [erro, setErro] = useState<string | null>(null);
  const [lido, setLido] = useState<string | null>(null);
  /** Muda para reiniciar a câmera sem fechar o modal ("Ler outro"). */
  const [reinicio, setReinicio] = useState(0);

  const parar = useCallback(() => {
    ativoRef.current = false;

    if (quadroRef.current) {
      cancelAnimationFrame(quadroRef.current);
      quadroRef.current = null;
    }

    leitorRef.current = null;
    detectorRef.current = null;
    canvasRef.current = null;
    ultimaTentativaRef.current = 0;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((faixa) => faixa.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /** Aceita (ou recusa, com aviso) um código lido. */
  const aceitar = useCallback(
    (bruto: string) => {
      const valor = bruto.trim();
      if (!valor) {
        return false;
      }

      const recusa = validar?.(valor) ?? null;
      if (recusa) {
        const agora = Date.now();
        if (ultimaRecusaRef.current.valor !== valor || agora - ultimaRecusaRef.current.em > 1000) {
          ultimaRecusaRef.current = { valor, em: agora };
          setErro(recusa);
        }
        return false;
      }

      ultimaRecusaRef.current = { valor: '', em: 0 };
      setErro(null);
      navigator.vibrate?.(60);
      parar();

      if (confirmar) {
        setLido(valor);
      } else {
        onLer(valor);
        onFechar();
      }

      return true;
    },
    [confirmar, onFechar, onLer, parar, validar],
  );

  useEffect(() => {
    if (!aberto) {
      parar();
      setLido(null);
      setErro(null);
      return;
    }

    ativoRef.current = true;
    ultimaRecusaRef.current = { valor: '', em: 0 };

    const prepararCanvas = (largura: number, altura: number) => {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      if (canvas.width !== largura || canvas.height !== altura) {
        canvas.width = largura;
        canvas.height = altura;
      }
      return canvas;
    };

    /** Preto no branco: etiqueta gasta ou mal iluminada passa a ser legível. */
    const realcarContraste = (ctx: CanvasRenderingContext2D, largura: number, altura: number) => {
      const quadro = ctx.getImageData(0, 0, largura, altura);
      const dados = quadro.data;
      for (let i = 0; i < dados.length; i += 4) {
        const luminancia = dados[i] * 0.2126 + dados[i + 1] * 0.7152 + dados[i + 2] * 0.0722;
        const valor = luminancia > 130 ? 255 : 0;
        dados[i] = valor;
        dados[i + 1] = valor;
        dados[i + 2] = valor;
      }
      ctx.putImageData(quadro, 0, 0);
    };

    const abrirCamera = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;

      const [faixa] = stream.getVideoTracks();
      try {
        const capacidades = faixa.getCapabilities?.() as MediaTrackCapabilities & { zoom?: { max?: number } };
        if (capacidades?.zoom && typeof capacidades.zoom.max === 'number' && capacidades.zoom.max > 1) {
          await faixa.applyConstraints({ advanced: [{ zoom: Math.min(2, capacidades.zoom.max) } as MediaTrackConstraintSet] });
        }
      } catch {
        // zoom é opcional
      }

      if (!videoRef.current) {
        throw new Error('Não foi possível iniciar a câmera.');
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      return stream;
    };

    const varrer = async () => {
      const video = videoRef.current;
      if (!video || !ativoRef.current) {
        return;
      }

      const agora = Date.now();
      if (agora - ultimaTentativaRef.current < 140) {
        quadroRef.current = requestAnimationFrame(() => void varrer());
        return;
      }
      ultimaTentativaRef.current = agora;

      try {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          const largura = video.videoWidth;
          const altura = video.videoHeight;
          const regioes = [
            { x: 0, y: 0, width: largura, height: altura },
            { x: Math.floor(largura * 0.14), y: Math.floor(altura * 0.32), width: Math.floor(largura * 0.72), height: Math.floor(altura * 0.34) },
            { x: Math.floor(largura * 0.42), y: Math.floor(altura * 0.24), width: Math.floor(largura * 0.5), height: Math.floor(altura * 0.5) },
          ];

          for (const regiao of regioes) {
            const w = Math.max(180, Math.min(largura, regiao.width));
            const h = Math.max(90, Math.min(altura, regiao.height));
            const x = Math.max(0, Math.min(largura - w, regiao.x));
            const y = Math.max(0, Math.min(altura - h, regiao.y));

            const canvas = prepararCanvas(w, h);
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) {
              break;
            }
            ctx.drawImage(video, x, y, w, h, 0, 0, w, h);

            const leitor = leitorRef.current;
            if (leitor) {
              try {
                const direto = leitor.decodeFromCanvas(canvas)?.getText()?.trim();
                if (direto && aceitar(direto)) {
                  return;
                }
              } catch {
                // segue para o realce
              }

              realcarContraste(ctx, canvas.width, canvas.height);

              try {
                const realcado = leitor.decodeFromCanvas(canvas)?.getText()?.trim();
                if (realcado && aceitar(realcado)) {
                  return;
                }
              } catch {
                // segue varrendo
              }
            } else if (detectorRef.current) {
              const achados = await detectorRef.current.detect(canvas);
              const valor = achados.find((item) => item.rawValue)?.rawValue?.trim();
              if (valor && aceitar(valor)) {
                return;
              }
            }
          }
        }
      } catch {
        // segue varrendo
      }

      if (ativoRef.current) {
        quadroRef.current = requestAnimationFrame(() => void varrer());
      }
    };

    const iniciar = async () => {
      setErro(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setErro('Este navegador não dá acesso à câmera. Abra pelo Chrome (Android) ou Safari (iPhone), ou digite o código.');
        return;
      }

      try {
        const dicas = new Map<DecodeHintType, unknown>();
        dicas.set(DecodeHintType.TRY_HARDER, true);
        dicas.set(DecodeHintType.POSSIBLE_FORMATS, FORMATOS_ZXING);
        leitorRef.current = new BrowserMultiFormatReader(dicas, { delayBetweenScanAttempts: 80, delayBetweenScanSuccess: 450 });

        await abrirCamera();
        quadroRef.current = requestAnimationFrame(() => void varrer());
        return;
      } catch (falha) {
        leitorRef.current = null;
        if (falha instanceof DOMException && (falha.name === 'NotAllowedError' || falha.name === 'SecurityError')) {
          setErro('Permissão de câmera negada. Libere o acesso à câmera para este site e tente de novo.');
          return;
        }
      }

      // Caminho alternativo: leitor nativo do navegador.
      const Detector = (window as unknown as { BarcodeDetector?: new (config?: { formats?: string[] }) => { detect: (fonte: CanvasImageSource) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector;

      if (!Detector) {
        setErro('Não foi possível iniciar a leitura por câmera neste aparelho. Digite o código manualmente.');
        return;
      }

      try {
        detectorRef.current = new Detector({ formats: FORMATOS_NATIVO });
        await abrirCamera();
        quadroRef.current = requestAnimationFrame(() => void varrer());
      } catch (falha) {
        setErro(
          falha instanceof DOMException && falha.name === 'NotAllowedError'
            ? 'Permissão de câmera negada. Libere o acesso à câmera para este site e tente de novo.'
            : 'Não foi possível abrir a câmera. Verifique se outro aplicativo está usando a câmera.',
        );
      }
    };

    void iniciar();

    return () => parar();
    // aceitar/parar são estáveis (useCallback); "reinicio" reabre a câmera.
  }, [aberto, reinicio, aceitar, parar]);

  // Fechar com Esc, como nos demais modais do sistema.
  useEffect(() => {
    if (!aberto) {
      return;
    }
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        onFechar();
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aberto, onFechar]);

  if (!aberto) {
    return null;
  }

  return (
    /* Acima dos demais modais: o leitor costuma ser aberto de dentro de um formulario. */
    <div className="admin-modal-overlay" style={{ zIndex: 120 }} role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="panel-surface admin-modal-shell admin-modal-shell--md rounded-[24px] p-3 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-2 pb-3">
          <div className="min-w-0">
            <p className="admin-modal-kicker">Leitura por câmera</p>
            <h3 className="admin-modal-title">{titulo}</h3>
            <p className="admin-modal-copy">{descricao}</p>
          </div>
          <button type="button" className="admin-btn-secondary shrink-0" onClick={onFechar}>
            Fechar
          </button>
        </div>

        <div className="admin-modal-content px-2 pt-3">
          <div className="relative overflow-hidden rounded-[18px] bg-black">
            <video ref={videoRef} playsInline muted autoPlay className="h-[52vh] max-h-[420px] w-full object-cover" />
            {!lido ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="h-[28%] w-[78%] rounded-[14px] border-2 border-[var(--accent)] shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
            ) : null}
          </div>

          {erro ? (
            <p className="mt-3 rounded-2xl border border-[rgba(190,18,60,0.18)] bg-[rgba(190,18,60,0.08)] px-4 py-2.5 text-[13px] text-[var(--rose)]">{erro}</p>
          ) : null}

          {lido ? (
            <div className="mt-3 rounded-2xl border border-[rgba(34,197,94,0.25)] bg-[rgba(74,222,128,0.08)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#15803d]">Código lido</p>
              <p className="mt-1 break-all font-mono text-[15px] font-semibold text-[var(--ink)]">{lido}</p>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => {
                    setLido(null);
                    setErro(null);
                    setReinicio((atual) => atual + 1);
                  }}
                >
                  Ler outro
                </button>
                <button
                  type="button"
                  className="admin-btn-primary"
                  onClick={() => {
                    onLer(lido);
                    setLido(null);
                    onFechar();
                  }}
                >
                  Usar este código
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-center text-[12px] text-[var(--muted)]">Procurando um código… mantenha a etiqueta dentro da moldura.</p>
          )}
        </div>
      </div>
    </div>
  );
}
