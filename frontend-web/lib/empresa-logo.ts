/**
 * Resolução do logo da empresa.
 *
 * A fonte oficial é o `logo_url` que o backend devolve (upload feito em
 * Perfil > Logo da empresa, servido pelo Laravel em /storage/...). Os arquivos
 * em `public/logos/empresas/` são um legado de antes do upload existir e só
 * são considerados quando a empresa não tem logo cadastrado.
 *
 * Cada candidato que não existe vira um 404 no console do navegador, então a
 * lista precisa conter apenas caminhos com chance real de existir — nada de
 * tentar dezenas de combinações de nome/extensão.
 */

/**
 * Arquivos que existem de fato em `public/logos/empresas/`. Ao adicionar um
 * logo legado nessa pasta, inclua o caminho aqui; caso contrário ele não será
 * procurado. Chave: caminho público; a resolução casa por ID (`6.png`) ou por
 * nome normalizado (`novoscomecos.png`, `novoscomecos/logopatrimonio.png`).
 */
const LEGACY_PUBLIC_LOGOS = [
  '/logos/empresas/6.png',
  '/logos/empresas/novos.png',
  '/logos/empresas/novoscomecos.png',
  '/logos/empresas/novoscomecos/logopatrimonio.png',
  '/logos/empresas/novoscomecosniteroi.png',
] as const;

const LEGACY_PUBLIC_LOGO_SET: ReadonlySet<string> = new Set(LEGACY_PUBLIC_LOGOS);

function trimAndUnquote(value?: string | null) {
  return String(value ?? '')
    .trim()
    .replace(/^"+|"+$/g, '')
    .replace(/\\\//g, '/');
}

export function normalizeNameToken(value?: string | null): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function getNameTokens(empresaNome?: string | null) {
  const cleaned = String(empresaNome ?? '').replace(/^igreja\s+/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const full = normalizeNameToken(cleaned);
  const first = normalizeNameToken(parts[0] ?? '');
  const firstTwo = normalizeNameToken(parts.slice(0, 2).join(' '));

  return Array.from(new Set([full, firstTwo, first].filter(Boolean)));
}

function toPublicPath(value: string) {
  const withSlash = value.startsWith('/') ? value : `/${value}`;
  return withSlash.replace(/\/+/g, '/');
}

/**
 * Converte o `logo_url` vindo do backend (ou de cadastros antigos) no
 * endereço que o navegador deve carregar.
 *
 * - URL absoluta (http/https): usada como está — é o caso do upload servido
 *   pelo Laravel, que mora em outra origem (porta/domínio do backend).
 * - Caminho absoluto de disco (legado, ex.: `C:\...\public\logos\empresas\x.png`):
 *   reduzido ao trecho público.
 * - Caminho relativo: normalizado com barra inicial.
 */
function resolveExplicitLogo(value: string): string | null {
  const cleaned = trimAndUnquote(value);
  if (!cleaned) {
    return null;
  }

  if (/^(https?:)?\/\//i.test(cleaned) || cleaned.startsWith('data:') || cleaned.startsWith('blob:')) {
    return cleaned;
  }

  const windowsPublicMatch = cleaned.match(/public[\\/](.+)$/i);
  if (windowsPublicMatch?.[1]) {
    return toPublicPath(windowsPublicMatch[1].replace(/\\/g, '/'));
  }

  const windowsLogoMatch = cleaned.match(/logos[\\/]empresas[\\/](.+)$/i);
  if (windowsLogoMatch?.[1]) {
    return toPublicPath(`logos/empresas/${windowsLogoMatch[1].replace(/\\/g, '/')}`);
  }

  return toPublicPath(cleaned);
}

function legacyCandidatesFor(token: string): string[] {
  const base = `/logos/empresas/${token}`;
  const guesses = [
    `${base}.png`,
    `${base}.jpg`,
    `${base}.jpeg`,
    `${base}.webp`,
    `${base}/logopatrimonio.png`,
    `${base}/logoasset.png`,
    `${base}/logo.png`,
  ];

  return guesses.filter((path) => LEGACY_PUBLIC_LOGO_SET.has(path));
}

export function buildEmpresaLogoCandidates(input: {
  empresaLogoUrl?: string | null;
  empresaId?: number | null;
  empresaNome?: string | null;
}) {
  const { empresaLogoUrl, empresaId, empresaNome } = input;
  const candidates: string[] = [];

  const explicitLogo = resolveExplicitLogo(String(empresaLogoUrl ?? ''));
  if (explicitLogo) {
    candidates.push(explicitLogo);
  }

  if (empresaId && Number.isInteger(empresaId) && empresaId > 0) {
    candidates.push(...legacyCandidatesFor(String(empresaId)));
  }

  getNameTokens(empresaNome).forEach((token) => {
    candidates.push(...legacyCandidatesFor(token));
  });

  return Array.from(new Set(candidates));
}
