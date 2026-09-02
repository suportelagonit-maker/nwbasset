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

function appendWithExtensions(candidates: string[], basePath: string) {
  const normalizedBase = basePath.replace(/\/+$/, '');

  candidates.push(`${normalizedBase}/logopatrimonio.png`);
  candidates.push(`${normalizedBase}/logoasset.png`);
  candidates.push(`${normalizedBase}/logo.png`);
  candidates.push(`${normalizedBase}.png`);
  candidates.push(`${normalizedBase}.jpg`);
  candidates.push(`${normalizedBase}.jpeg`);
  candidates.push(`${normalizedBase}.webp`);
}

function pushRelativeCandidate(candidates: string[], value: string) {
  const normalized = trimAndUnquote(value);
  if (!normalized) {
    return;
  }

  const withSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
  candidates.push(withSlash.replace(/\/+/g, '/'));
}

function addPathVariants(candidates: string[], path: string) {
  const cleaned = trimAndUnquote(path);
  if (!cleaned) {
    return;
  }

  const windowsPublicMatch = cleaned.match(/public[\\\/](.+)$/i);
  if (windowsPublicMatch?.[1]) {
    pushRelativeCandidate(candidates, windowsPublicMatch[1].replace(/\\/g, '/'));
  }

  const windowsLogoMatch = cleaned.match(/logos[\\\/]empresas[\\\/](.+)$/i);
  if (windowsLogoMatch?.[1]) {
    pushRelativeCandidate(candidates, `logos/empresas/${windowsLogoMatch[1].replace(/\\/g, '/')}`);
  }

  if (/^https?:\/\//i.test(cleaned)) {
    try {
      const parsed = new URL(cleaned);
      pushRelativeCandidate(candidates, parsed.pathname);

      const logoPathMatch = parsed.pathname.match(/\/logos\/empresas\/(.+)$/i);
      if (logoPathMatch?.[1]) {
        pushRelativeCandidate(candidates, `logos/empresas/${logoPathMatch[1]}`);
      }
    } catch {
      // Ignora URL inválida e segue com os demais candidatos.
    }
    return;
  }

  pushRelativeCandidate(candidates, cleaned);
}

export function buildEmpresaLogoCandidates(input: {
  empresaLogoUrl?: string | null;
  empresaId?: number | null;
  empresaNome?: string | null;
}) {
  const { empresaLogoUrl, empresaId, empresaNome } = input;
  const candidates: string[] = [];

  const explicitLogo = trimAndUnquote(empresaLogoUrl);
  if (explicitLogo) {
    addPathVariants(candidates, explicitLogo);
  }

  if (empresaId && Number.isInteger(empresaId) && empresaId > 0) {
    appendWithExtensions(candidates, `/logos/empresas/${empresaId}`);
    appendWithExtensions(candidates, `/logos/empresas/${empresaId}/logo`);
    appendWithExtensions(candidates, `/logos/empresas/${empresaId}/logopatrimonio`);
  }

  const nameTokens = getNameTokens(empresaNome);
  nameTokens.forEach((token) => {
    appendWithExtensions(candidates, `/logos/empresas/${token}`);
  });

  return Array.from(new Set(candidates.filter(Boolean))).slice(0, 32);
}

