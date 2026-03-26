const MASTER_COMPANY_NAME = process.env.NEXT_PUBLIC_MASTER_COMPANY_NAME ?? 'NWB Asset';

export function normalizeCompanyName(value: string | null | undefined) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase();
}

export function isMasterCompanyName(value: string | null | undefined) {
  return normalizeCompanyName(value) === normalizeCompanyName(MASTER_COMPANY_NAME);
}

