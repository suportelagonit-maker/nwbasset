'use client';

import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { useEffect, useMemo, useRef, useState } from 'react';

import { handleUnauthorizedClientResponse } from '@/lib/client-auth';

import PatrimonioEtiquetaCard from './PatrimonioEtiquetaCard';
import SystemConfirmDialog from './SystemConfirmDialog';
import SystemFeedbackStack from './SystemFeedbackStack';

type PlaquetaItem = {
  id: number;
  bem_patrimonial_id: number | null;
  filial_id: number | null;
  codigo_plaqueta: string;
  numero_plaqueta: string;
  codigo_barras_conteudo: string;
  link_consulta: string;
  status: string;
  observacoes: string | null;
  bem_patrimonial_descricao?: string | null;
  bem_patrimonial_numero_tombo?: string | null;
  filial_nome?: string | null;
};

type FilialItem = {
  id: number;
  nome: string;
};

type BemItem = {
  id: number;
  filial_id: number | null;
  numero_tombo: string;
  descricao: string;
};

type ConfirmState = {
  title: string;
  description: string;
  confirmLabel?: string;
  action: () => Promise<void> | void;
};

type ScanCandidate = {
  rawValue: string;
  numeroPlaqueta: string;
};

type Props = {
  empresaId: number | null;
  empresaNome?: string | null;
  empresaLogoUrl?: string | null;
};

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M1.5 12s3.9-6.5 10.5-6.5S22.5 12 22.5 12 18.6 18.5 12 18.5 1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3.3" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="m10.5 13.5 3-3" />
      <path d="M7.2 14.8 5.4 16.6a3.1 3.1 0 0 0 4.4 4.4l1.8-1.8" />
      <path d="m16.8 9.2 1.8-1.8a3.1 3.1 0 1 0-4.4-4.4l-1.8 1.8" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M4.5 7.5h15" />
      <path d="M9.5 3.5h5l1 2h4" />
      <path d="M7 7.5v11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-11" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function formatStatus(status: string) {
  switch (status) {
    case 'EM_ESTOQUE':
      return 'Em estoque';
    case 'VINCULADA':
      return 'Vinculada';
    case 'GERADA':
      return 'Gerada';
    case 'APLICADA':
      return 'Aplicada';
    case 'INATIVA':
      return 'Inativa';
    case 'SUBSTITUIDA':
      return 'Substituída';
    default:
      return status;
  }
}

export default function PlaquetaManagement({ empresaId, empresaNome, empresaLogoUrl }: Props) {
  const [plaquetas, setPlaquetas] = useState<PlaquetaItem[]>([]);
  const [filiais, setFiliais] = useState<FilialItem[]>([]);
  const [bens, setBens] = useState<BemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [bindPlaqueta, setBindPlaqueta] = useState<PlaquetaItem | null>(null);
  const [createForm, setCreateForm] = useState({
    numero_plaqueta: '',
    codigo_barras_conteudo: '',
    observacoes: '',
  });
  const [bindForm, setBindForm] = useState({
    filial_id: '',
    bem_patrimonial_id: '',
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scanCandidate, setScanCandidate] = useState<ScanCandidate | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<{ detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>> } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastScanAttemptRef = useRef(0);
  const lastInvalidReadRef = useRef('');
  const lastInvalidAtRef = useRef(0);

  const estoquePlaquetas = useMemo(
    () => plaquetas.filter((item) => !item.bem_patrimonial_id || item.status === 'EM_ESTOQUE'),
    [plaquetas],
  );

  const bensDaFilial = useMemo(
    () =>
      bens.filter((item) => {
        if (!bindForm.filial_id) {
          return true;
        }

        return String(item.filial_id ?? '') === bindForm.filial_id;
      }),
    [bens, bindForm.filial_id],
  );

  const previewPlaqueta = useMemo(() => {
    if (plaquetas.length > 0) {
      return {
        id: plaquetas[0].id,
        numero_plaqueta: plaquetas[0].numero_plaqueta,
        codigo_barras_conteudo: plaquetas[0].codigo_barras_conteudo,
      };
    }

    return {
      id: 837,
      numero_plaqueta: '0837',
      codigo_barras_conteudo: '0837',
    };
  }, [plaquetas]);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const hasModalOpen = showCreateModal || showImportModal || Boolean(bindPlaqueta) || showScannerModal;

    if (!hasModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [bindPlaqueta, showCreateModal, showImportModal, showScannerModal]);

  useEffect(() => {
    if (!showScannerModal) {
      stopScanner();
      return;
    }

    void startScanner();

    return () => {
      stopScanner();
    };
  }, [showScannerModal]);

  async function loadData() {
    setLoading(true);

    try {
      const [plaquetasResponse, filiaisResponse, bensResponse] = await Promise.all([
        fetch('/api/admin/plaquetas?per_page=200', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        }),
        fetch('/api/admin/filiais?per_page=100', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        }),
        fetch('/api/admin/bens?per_page=300', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        }),
      ]);

      if (!plaquetasResponse.ok) {
        const message = await plaquetasResponse.text();
        if (handleUnauthorizedClientResponse(plaquetasResponse.status, message)) {
          return;
        }
        throw new Error(message || 'Não foi possível consultar as plaquetas.');
      }

      if (!filiaisResponse.ok) {
        const message = await filiaisResponse.text();
        if (handleUnauthorizedClientResponse(filiaisResponse.status, message)) {
          return;
        }
        throw new Error(message || 'Não foi possível consultar as filiais.');
      }

      if (!bensResponse.ok) {
        const message = await bensResponse.text();
        if (handleUnauthorizedClientResponse(bensResponse.status, message)) {
          return;
        }
        throw new Error(message || 'Não foi possível consultar os bens patrimoniais.');
      }

      const [plaquetasPayload, filiaisPayload, bensPayload] = await Promise.all([
        plaquetasResponse.json() as Promise<{ data: PlaquetaItem[] }>,
        filiaisResponse.json() as Promise<{ data: FilialItem[] }>,
        bensResponse.json() as Promise<{ data: BemItem[] }>,
      ]);

      setPlaquetas(plaquetasPayload.data ?? []);
      setFiliais(filiaisPayload.data ?? []);
      setBens(bensPayload.data ?? []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Falha ao carregar as plaquetas.');
      setMessage(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!empresaId) {
      setError('Selecione uma empresa antes de cadastrar plaquetas.');
      setMessage(null);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/admin/plaquetas/estoque', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empresa_id: empresaId,
          numero_plaqueta: createForm.numero_plaqueta,
          codigo_barras_conteudo: createForm.codigo_barras_conteudo,
          observacoes: createForm.observacoes || null,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        if (handleUnauthorizedClientResponse(response.status, message)) {
          return;
        }
        throw new Error(message || 'Não foi possível cadastrar a plaqueta.');
      }

      setShowCreateModal(false);
      setCreateForm({
        numero_plaqueta: '',
        codigo_barras_conteudo: '',
        observacoes: '',
      });
      setMessage('Plaqueta em estoque cadastrada com sucesso.');
      setError(null);
      await loadData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Falha ao cadastrar a plaqueta.');
      setMessage(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleImport() {
    if (!importFile) {
      setError('Selecione um arquivo CSV ou XLSX para importar.');
      setMessage(null);
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append('arquivo', importFile);

      const response = await fetch('/api/admin/plaquetas/importar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        if (handleUnauthorizedClientResponse(response.status, message)) {
          return;
        }
        throw new Error(message || 'Não foi possível importar as plaquetas.');
      }

      const payload = (await response.json()) as {
        data?: { importadas?: number; atualizadas?: number; ignoradas?: number };
      };
      const resumo = payload.data;
      setShowImportModal(false);
      setImportFile(null);
      setMessage(
        `Importação concluída. Importadas: ${resumo?.importadas ?? 0}. Atualizadas: ${resumo?.atualizadas ?? 0}. Ignoradas: ${resumo?.ignoradas ?? 0}.`,
      );
      setError(null);
      await loadData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Falha ao importar as plaquetas.');
      setMessage(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleBind() {
    if (!empresaId || !bindPlaqueta) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/admin/plaquetas/vincular', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empresa_id: empresaId,
          filial_id: bindForm.filial_id ? Number(bindForm.filial_id) : null,
          plaqueta_id: bindPlaqueta.id,
          bem_patrimonial_id: Number(bindForm.bem_patrimonial_id),
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        if (handleUnauthorizedClientResponse(response.status, message)) {
          return;
        }
        throw new Error(message || 'Não foi possível vincular a plaqueta ao bem.');
      }

      setBindPlaqueta(null);
      setBindForm({ filial_id: '', bem_patrimonial_id: '' });
      setMessage('Plaqueta vinculada ao bem patrimonial com sucesso.');
      setError(null);
      await loadData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Falha ao vincular a plaqueta.');
      setMessage(null);
    } finally {
      setSaving(false);
    }
  }

  function openBindModal(plaqueta: PlaquetaItem) {
    setShowCreateModal(false);
    setShowImportModal(false);
    setShowScannerModal(false);
    setBindPlaqueta(plaqueta);
    setBindForm({
      filial_id: plaqueta.filial_id ? String(plaqueta.filial_id) : '',
      bem_patrimonial_id: '',
    });
  }

  async function deletePlaqueta(id: number) {
    const response = await fetch(`/api/admin/plaquetas/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const message = await response.text();
      if (handleUnauthorizedClientResponse(response.status, message)) {
      }
      throw new Error(message || 'Não foi possível remover a plaqueta.');
    }

    await loadData();
    setMessage('Plaqueta removida com sucesso.');
    setError(null);
  }

  function stopScanner() {
    if (zxingControlsRef.current) {
      zxingControlsRef.current.stop();
      zxingControlsRef.current = null;
    }

    if (zxingReaderRef.current) {
      zxingReaderRef.current = null;
    }

    scanCanvasRef.current = null;
    lastScanAttemptRef.current = 0;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function tryExtractNumeroPlaqueta(value: string) {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 4) {
      return '';
    }

    if (digits.length <= 6) {
      return digits;
    }

    return digits.slice(-6);
  }

  function applyScannedBarcode(rawValue: string) {
    const cleanValue = rawValue.trim();
    if (!cleanValue) {
      return false;
    }

    if (scanCandidate) {
      return true;
    }

    const numeroPlaqueta = tryExtractNumeroPlaqueta(cleanValue);
    if (!numeroPlaqueta) {
      const now = Date.now();
      if (lastInvalidReadRef.current !== cleanValue || now - lastInvalidAtRef.current > 1000) {
        lastInvalidReadRef.current = cleanValue;
        lastInvalidAtRef.current = now;
        setScannerError(`Leitura parcial (${cleanValue}). Continue apontando até ler o código completo.`);
      }
      return false;
    }

    setScanCandidate({
      rawValue: cleanValue,
      numeroPlaqueta,
    });
    setError(null);
    setScannerError(null);
    lastInvalidReadRef.current = '';
    lastInvalidAtRef.current = 0;
    stopScanner();
    return true;
  }

  function confirmScannedBarcode() {
    if (!scanCandidate) {
      return;
    }

    setCreateForm((current) => ({
      ...current,
      codigo_barras_conteudo: scanCandidate.rawValue,
      numero_plaqueta: current.numero_plaqueta || scanCandidate.numeroPlaqueta,
    }));
    setMessage(`Leitura confirmada. Código: ${scanCandidate.rawValue} · Plaqueta: ${scanCandidate.numeroPlaqueta}.`);
    setError(null);
    setScannerError(null);
    setScanCandidate(null);
    setShowScannerModal(false);
  }

  function rescanBarcode() {
    setScanCandidate(null);
    setScannerError(null);
    lastInvalidReadRef.current = '';
    lastInvalidAtRef.current = 0;
    stopScanner();
    void startScanner();
  }

  function prepareScannerCanvas(width: number, height: number) {
    if (!scanCanvasRef.current) {
      scanCanvasRef.current = document.createElement('canvas');
    }

    const canvas = scanCanvasRef.current;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    return canvas;
  }

  function enhanceBarcodeContrast(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const frame = ctx.getImageData(0, 0, width, height);
    const data = frame.data;

    for (let i = 0; i < data.length; i += 4) {
      const luminance = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
      const normalized = luminance > 130 ? 255 : 0;
      data[i] = normalized;
      data[i + 1] = normalized;
      data[i + 2] = normalized;
    }

    ctx.putImageData(frame, 0, 0);
  }

  async function startScannerWithZxing() {
    if (!videoRef.current) {
      throw new Error('Nao foi possivel iniciar a camera.');
    }

    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.QR_CODE,
    ]);

    const zxingReader = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 80,
      delayBetweenScanSuccess: 450,
    });
    zxingReaderRef.current = zxingReader;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });
    streamRef.current = stream;

    const [videoTrack] = stream.getVideoTracks();
    try {
      const capabilities = videoTrack.getCapabilities?.() as MediaTrackCapabilities & {
        zoom?: { min?: number; max?: number };
      };
      if (capabilities?.zoom && typeof capabilities.zoom.max === 'number' && capabilities.zoom.max > 1) {
        const targetZoom = Math.min(2, capabilities.zoom.max);
        await videoTrack.applyConstraints({ advanced: [{ zoom: targetZoom } as MediaTrackConstraintSet] });
      }
    } catch {
      // zoom opcional; ignora se o dispositivo nao suportar
    }

    videoRef.current.srcObject = stream;
    await videoRef.current.play();

    const tick = async () => {
      const video = videoRef.current;
      const reader = zxingReaderRef.current;

      if (!video || !reader || !showScannerModal) {
        return;
      }

      const now = Date.now();
      if (now - lastScanAttemptRef.current < 140) {
        animationFrameRef.current = requestAnimationFrame(() => {
          void tick();
        });
        return;
      }
      lastScanAttemptRef.current = now;

      try {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          const sourceWidth = video.videoWidth;
          const sourceHeight = video.videoHeight;
          const regions = [
            {
              x: 0,
              y: 0,
              width: sourceWidth,
              height: sourceHeight,
            },
            {
              x: Math.floor(sourceWidth * 0.14),
              y: Math.floor(sourceHeight * 0.32),
              width: Math.floor(sourceWidth * 0.72),
              height: Math.floor(sourceHeight * 0.34),
            },
            {
              x: Math.floor(sourceWidth * 0.42),
              y: Math.floor(sourceHeight * 0.24),
              width: Math.floor(sourceWidth * 0.5),
              height: Math.floor(sourceHeight * 0.5),
            },
          ];

          for (const region of regions) {
            const safeWidth = Math.max(180, Math.min(sourceWidth, region.width));
            const safeHeight = Math.max(90, Math.min(sourceHeight, region.height));
            const safeX = Math.max(0, Math.min(sourceWidth - safeWidth, region.x));
            const safeY = Math.max(0, Math.min(sourceHeight - safeHeight, region.y));

            const scanCanvas = prepareScannerCanvas(safeWidth, safeHeight);
            const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });

            if (!scanCtx) {
              throw new Error('Nao foi possivel processar a imagem da camera.');
            }

            scanCtx.drawImage(video, safeX, safeY, safeWidth, safeHeight, 0, 0, safeWidth, safeHeight);

            try {
              const directResult = reader.decodeFromCanvas(scanCanvas);
              const directValue = directResult?.getText()?.trim();
              if (directValue) {
                const applied = applyScannedBarcode(directValue);
                if (applied) {
                  return;
                }
              }
            } catch {
              // continua para etapa de contraste
            }

            enhanceBarcodeContrast(scanCtx, scanCanvas.width, scanCanvas.height);

            try {
              const contrastResult = reader.decodeFromCanvas(scanCanvas);
              const contrastValue = contrastResult?.getText()?.trim();
              if (contrastValue) {
                const applied = applyScannedBarcode(contrastValue);
                if (applied) {
                  return;
                }
              }
            } catch {
              // segue varrendo
            }
          }
        }
      } catch {
        // segue varrendo
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        void tick();
      });
    };

    animationFrameRef.current = requestAnimationFrame(() => {
      void tick();
    });
  }

  async function startScanner() {
    setScannerError(null);
    lastInvalidReadRef.current = '';
    lastInvalidAtRef.current = 0;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Este navegador não possui suporte à câmera.');
      }

      try {
        await startScannerWithZxing();
        return;
      } catch {
        // fallback para BarcodeDetector
      }

      const BarcodeDetectorCtor = (
        window as unknown as {
          BarcodeDetector?: new (config?: { formats?: string[] }) => {
            detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
          };
        }
      ).BarcodeDetector;

      if (!BarcodeDetectorCtor) {
        throw new Error('Leitura por camera nao suportada neste navegador. Use Chrome/Edge ou leitor de codigo.');
      }

      detectorRef.current = new BarcodeDetectorCtor({
        formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf', 'qr_code'],
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error('Não foi possível iniciar a câmera.');
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const tick = async () => {
        const video = videoRef.current;
        const detector = detectorRef.current;

        if (!video || !detector || !showScannerModal) {
          return;
        }

        try {
          if (video.readyState >= 2) {
            const results = await detector.detect(video);
            const first = results.find((item) => item.rawValue && item.rawValue.trim() !== '');

            if (first?.rawValue) {
              const applied = applyScannedBarcode(first.rawValue);
              if (applied) {
                return;
              }
            }
          }
        } catch {
          // segue tentando até detectar
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          void tick();
        });
      };

      animationFrameRef.current = requestAnimationFrame(() => {
        void tick();
      });
    } catch (scanError) {
      setScannerError(scanError instanceof Error ? scanError.message : 'Não foi possível iniciar o leitor de código.');
      stopScanner();
    }
  }

  return (
    <>
      <SystemFeedbackStack
        error={error}
        message={message}
        errorTitle="Plaquetas"
        messageTitle="Plaquetas"
        onCloseError={() => setError(null)}
        onCloseMessage={() => setMessage(null)}
      />
      <SystemConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? ''}
        description={confirmDialog?.description ?? ''}
        confirmLabel={confirmDialog?.confirmLabel ?? 'Confirmar'}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={async () => {
          const action = confirmDialog?.action;
          setConfirmDialog(null);
          await action?.();
        }}
      />

      <section className="space-y-5">
        <div className="panel-surface rounded-[28px] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Plaquetas</p>
              <h2 className="mt-3 text-[2rem] font-semibold tracking-[-0.05em] text-[var(--ink)]">
                Controle de etiquetas patrimoniais
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                Cadastre ou importe as etiquetas já impressas pela gráfica e vincule cada código de barras ao bem patrimonial correto.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  setBindPlaqueta(null);
                  setShowScannerModal(false);
                  setShowImportModal(true);
                }}
              >
                Importar planilha
              </button>
              <button
                type="button"
                className="admin-btn-primary"
                onClick={() => {
                  setShowImportModal(false);
                  setBindPlaqueta(null);
                  setShowScannerModal(false);
                  setShowCreateModal(true);
                }}
              >
                Nova etiqueta
              </button>
            </div>
          </div>
        </div>

        <section className="panel-surface rounded-[28px] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Modelo da etiqueta patrimonial</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                O mesmo código impresso na gráfica pode ser lido pelo celular para localizar o bem no inventário.
              </p>
            </div>
            <p className="text-xs font-medium text-[var(--muted)]">Exemplo visual</p>
          </div>

          <div className="mt-6 flex justify-start">
            <PatrimonioEtiquetaCard
              key={previewPlaqueta.id}
              numeroPlaqueta={previewPlaqueta.numero_plaqueta}
              barcodeValue={previewPlaqueta.codigo_barras_conteudo}
              empresaId={empresaId}
              empresaNome={empresaNome}
              logoSrc={empresaLogoUrl}
            />
          </div>
        </section>

        <section className="panel-surface rounded-[28px] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Plaquetas cadastradas</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Cadastre manualmente, importe em lote e vincule ao bem quando a etiqueta física for aplicada.
              </p>
            </div>

            <button type="button" className="admin-btn-secondary" onClick={() => void loadData()}>
              Atualizar
            </button>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                  <th className="pb-4 pr-4 font-semibold">Plaqueta</th>
                  <th className="pb-4 pr-4 font-semibold">Código de barras</th>
                  <th className="pb-4 pr-4 font-semibold">Bem vinculado</th>
                  <th className="pb-4 pr-4 font-semibold">Status</th>
                  <th className="pb-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-[var(--muted)]">
                      Carregando plaquetas...
                    </td>
                  </tr>
                ) : plaquetas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-[var(--muted)]">
                      Nenhuma plaqueta cadastrada para esta empresa.
                    </td>
                  </tr>
                ) : (
                  plaquetas.map((plaqueta) => (
                    <tr key={plaqueta.id} className="border-b border-[rgba(226,232,240,0.7)] text-sm text-[var(--ink)] last:border-b-0">
                      <td className="py-4 pr-4">
                        <p className="font-semibold">Patrimônio {plaqueta.numero_plaqueta}</p>
                        <p className="text-xs text-[var(--muted)]">ID {plaqueta.id}</p>
                      </td>
                      <td className="py-4 pr-4">
                        <p className="font-semibold">{plaqueta.codigo_barras_conteudo}</p>
                        <p className="text-xs text-[var(--muted)]">{plaqueta.codigo_plaqueta}</p>
                      </td>
                      <td className="py-4 pr-4">
                        {plaqueta.bem_patrimonial_id ? (
                          <>
                            <p className="font-semibold">{plaqueta.bem_patrimonial_descricao ?? 'Bem vinculado'}</p>
                            <p className="text-xs text-[var(--muted)]">
                              Tombo {plaqueta.bem_patrimonial_numero_tombo ?? '-'} · {plaqueta.filial_nome ?? 'Sem filial'}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-[var(--muted)]">Disponível para vínculo</p>
                        )}
                      </td>
                      <td className="py-4 pr-4">
                        <span className="inline-flex rounded-full bg-[rgba(246,164,0,0.12)] px-3 py-1 text-xs font-semibold text-[var(--accent-deep)]">
                          {formatStatus(plaqueta.status)}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <a
                            href={`/patrimonio/etiqueta?codigo=${encodeURIComponent(plaqueta.codigo_barras_conteudo)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)]"
                            title="Abrir etiqueta"
                          >
                            <EyeIcon />
                          </a>
                          {!plaqueta.bem_patrimonial_id && (
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)]"
                              title="Vincular ao bem"
                              onClick={() => openBindModal(plaqueta)}
                            >
                              <LinkIcon />
                            </button>
                          )}
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(239,68,68,0.2)] bg-white text-[#ef4444]"
                            title="Excluir"
                            onClick={() =>
                              setConfirmDialog({
                                title: 'Remover plaqueta',
                                description: `Deseja remover a plaqueta ${plaqueta.numero_plaqueta}?`,
                                confirmLabel: 'Remover',
                                action: async () => {
                                  await deletePlaqueta(plaqueta.id);
                                },
                              })
                            }
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-card max-w-3xl">
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Plaquetas</p>
                <h3 className="modal-title">Nova etiqueta impressa</h3>
                <p className="modal-subtitle">Cadastre a numeração e o código de barras exatamente como vieram da gráfica.</p>
              </div>
              <button type="button" className="admin-btn-secondary" onClick={() => setShowCreateModal(false)}>
                Fechar
              </button>
            </div>

            <div className="modal-body space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="admin-field">
                  <span className="admin-field-label">Número visível da plaqueta</span>
                  <input
                    className="admin-input"
                    value={createForm.numero_plaqueta}
                    onChange={(event) => setCreateForm((current) => ({ ...current, numero_plaqueta: event.target.value }))}
                    placeholder="Ex.: 0837"
                  />
                </label>
                <label className="admin-field">
                  <span className="admin-field-label">Código de barras impresso</span>
                  <input
                    className="admin-input"
                    value={createForm.codigo_barras_conteudo}
                    onChange={(event) => setCreateForm((current) => ({ ...current, codigo_barras_conteudo: event.target.value }))}
                    placeholder="Ex.: 0837 ou PAT-0837"
                  />
                </label>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => {
                    setScanCandidate(null);
                    setScannerError(null);
                    setShowScannerModal(true);
                  }}
                >
                  Ler código (câmera)
                </button>
              </div>
              <label className="admin-field">
                <span className="admin-field-label">Observações</span>
                <textarea
                  className="admin-textarea"
                  rows={4}
                  value={createForm.observacoes}
                  onChange={(event) => setCreateForm((current) => ({ ...current, observacoes: event.target.value }))}
                  placeholder="Lote impresso, fornecedor da gráfica ou observações internas."
                />
              </label>
            </div>

            <div className="modal-footer">
              <button type="button" className="admin-btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </button>
              <button type="button" className="admin-btn-primary" disabled={saving} onClick={() => void handleCreate()}>
                {saving ? 'Salvando...' : 'Cadastrar etiqueta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-card max-w-3xl">
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Plaquetas</p>
                <h3 className="modal-title">Importar etiquetas impressas</h3>
                <p className="modal-subtitle">A planilha deve conter as colunas número da plaqueta e código de barras.</p>
              </div>
              <button type="button" className="admin-btn-secondary" onClick={() => setShowImportModal(false)}>
                Fechar
              </button>
            </div>

            <div className="modal-body space-y-4">
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(248,250,252,0.8)] p-4 text-sm leading-7 text-[var(--muted)]">
                <p>Colunas aceitas: <strong>numero_plaqueta</strong>, <strong>numero</strong>, <strong>plaqueta</strong>, <strong>codigo_barras_conteudo</strong>, <strong>codigo_barras</strong>, <strong>barcode</strong>, <strong>codigo</strong> e <strong>observacoes</strong>.</p>
                <p className="mt-2">Formatos aceitos: CSV e XLSX.</p>
              </div>

              <label className="admin-field">
                <span className="admin-field-label">Arquivo da importação</span>
                <input
                  type="file"
                  className="admin-input file:mr-3 file:rounded-full file:border-0 file:bg-[rgba(246,164,0,0.14)] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[var(--accent-deep)]"
                  accept=".csv,.txt,.xlsx"
                  onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <div className="modal-footer">
              <button type="button" className="admin-btn-secondary" onClick={() => setShowImportModal(false)}>
                Cancelar
              </button>
              <button type="button" className="admin-btn-primary" disabled={saving} onClick={() => void handleImport()}>
                {saving ? 'Importando...' : 'Importar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showScannerModal && (
        <div className="modal-overlay">
          <div className="modal-card max-w-xl">
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Leitor de código de barras</p>
                <h3 className="modal-title">Escanear etiqueta física</h3>
                <p className="modal-subtitle">
                  Aponte a câmera para o código de barras da etiqueta impressa. O campo será preenchido automaticamente.
                </p>
              </div>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => {
                  setScanCandidate(null);
                  setShowScannerModal(false);
                }}
              >
                Fechar
              </button>
            </div>

            <div className="modal-body space-y-3">
              {scanCandidate ? (
                <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[rgba(248,250,252,0.9)] p-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Código lido</p>
                    <p className="mt-1 text-base font-semibold text-[var(--ink)]">{scanCandidate.rawValue}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Número da plaqueta identificado</p>
                    <p className="mt-1 text-base font-semibold text-[var(--ink)]">{scanCandidate.numeroPlaqueta}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[#0b1220]">
                    <video ref={videoRef} autoPlay playsInline muted className="h-[320px] w-full object-cover" />
                  </div>
                  {scannerError ? (
                    <div className="rounded-2xl border border-[rgba(190,18,60,0.18)] bg-[rgba(190,18,60,0.08)] px-4 py-3 text-sm text-[var(--rose)]">
                      {scannerError}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--muted)]">
                      A leitura só é aceita quando identificar ao menos 4 dígitos numéricos da plaqueta.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              {scanCandidate && (
                <button type="button" className="admin-btn-secondary" onClick={rescanBarcode}>
                  Ler novamente
                </button>
              )}
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => {
                  setScanCandidate(null);
                  setShowScannerModal(false);
                }}
              >
                Cancelar
              </button>
              {scanCandidate && (
                <button type="button" className="admin-btn-primary" onClick={confirmScannedBarcode}>
                  Usar leitura
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {bindPlaqueta && (
        <div className="modal-overlay">
          <div className="modal-card max-w-4xl">
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Plaquetas</p>
                <h3 className="modal-title">Vincular etiqueta ao bem</h3>
                <p className="modal-subtitle">Use a plaqueta já impressa e associe ao bem patrimonial correto da empresa.</p>
              </div>
              <button type="button" className="admin-btn-secondary" onClick={() => setBindPlaqueta(null)}>
                Fechar
              </button>
            </div>

            <div className="modal-body space-y-5">
              <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
                <PatrimonioEtiquetaCard
                  numeroPlaqueta={bindPlaqueta.numero_plaqueta}
                  barcodeValue={bindPlaqueta.codigo_barras_conteudo}
                  empresaId={empresaId}
                  empresaNome={empresaNome}
                  logoSrc={empresaLogoUrl}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="admin-field">
                    <span className="admin-field-label">Filial do bem</span>
                    <select
                      className="admin-select"
                      value={bindForm.filial_id}
                      onChange={(event) =>
                        setBindForm({
                          filial_id: event.target.value,
                          bem_patrimonial_id: '',
                        })
                      }
                    >
                      <option value="">Selecione</option>
                      {filiais.map((filial) => (
                        <option key={filial.id} value={filial.id}>
                          {filial.nome}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="admin-field">
                    <span className="admin-field-label">Bem patrimonial</span>
                    <select
                      className="admin-select"
                      value={bindForm.bem_patrimonial_id}
                      onChange={(event) => setBindForm((current) => ({ ...current, bem_patrimonial_id: event.target.value }))}
                    >
                      <option value="">Selecione</option>
                      {bensDaFilial.map((bem) => (
                        <option key={bem.id} value={bem.id}>
                          {bem.numero_tombo} · {bem.descricao}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="admin-btn-secondary" onClick={() => setBindPlaqueta(null)}>
                Cancelar
              </button>
              <button type="button" className="admin-btn-primary" disabled={saving} onClick={() => void handleBind()}>
                {saving ? 'Vinculando...' : 'Vincular ao bem'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
