/**
 * Leitura de etiqueta por aproximação (NFC).
 *
 * Usa a Web NFC do navegador, disponível hoje só no Chrome para Android.
 * Serve para etiquetas NFC/NTAG coladas no bem — o aparelho encosta e lê,
 * sem precisar enquadrar o código de barras.
 *
 * **O que isto não é:** leitura de RFID UHF, aquela de portal e de pistola
 * que lê dezenas de etiquetas a metros de distância. UHF depende de
 * hardware dedicado e de um protocolo que o navegador não alcança; é
 * integração à parte, com o coletor do fabricante.
 */

type RegistroNdef = { recordType: string; data?: DataView; encoding?: string };

export function suportaNfc(): boolean {
  return typeof window !== 'undefined' && 'NDEFReader' in window;
}

/** Texto útil de um registro NDEF: o texto em si ou a URL gravada. */
function textoDoRegistro(registro: RegistroNdef): string | null {
  if (registro.recordType === 'text' && registro.data) {
    return new TextDecoder(registro.encoding ?? 'utf-8').decode(registro.data).trim();
  }

  if (registro.recordType === 'url' && registro.data) {
    return new TextDecoder().decode(registro.data).trim();
  }

  return null;
}

/**
 * Começa a ouvir etiquetas NFC e chama `aoLer` a cada aproximação.
 * Devolve a função que encerra a leitura.
 */
export async function ouvirNfc(
  aoLer: (codigo: string) => void,
  aoFalhar: (mensagem: string) => void,
): Promise<() => void> {
  if (!suportaNfc()) {
    aoFalhar('Este aparelho ou navegador não lê etiquetas por aproximação.');
    return () => undefined;
  }

  const controle = new AbortController();

  try {
    const Leitor = (window as unknown as { NDEFReader: new () => {
      scan: (opcoes?: { signal?: AbortSignal }) => Promise<void>;
      addEventListener: (evento: string, ouvinte: (e: Event) => void) => void;
    } }).NDEFReader;

    const leitor = new Leitor();
    await leitor.scan({ signal: controle.signal });

    leitor.addEventListener('reading', (evento: Event) => {
      const { message, serialNumber } = evento as Event & {
        message: { records: RegistroNdef[] };
        serialNumber?: string;
      };

      for (const registro of message.records) {
        const texto = textoDoRegistro(registro);

        if (texto) {
          aoLer(texto);
          return;
        }
      }

      // Etiqueta sem conteúdo gravado: o número de série ainda identifica
      // o bem, se tiver sido cadastrado como código da plaqueta.
      if (serialNumber) {
        aoLer(serialNumber);
      }
    });

    leitor.addEventListener('readingerror', () => {
      aoFalhar('Não foi possível ler a etiqueta. Aproxime novamente.');
    });
  } catch (falha) {
    const motivo = falha instanceof Error && falha.name === 'NotAllowedError'
      ? 'Permissão de NFC negada. Libere o acesso e tente de novo.'
      : 'Não foi possível iniciar a leitura por aproximação.';
    aoFalhar(motivo);
    return () => undefined;
  }

  return () => controle.abort();
}
