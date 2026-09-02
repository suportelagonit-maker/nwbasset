'use client';

export function handleUnauthorizedClientResponse(status: number, message?: string | null) {
  const normalizedMessage = (message ?? '').toLowerCase();
  const isUnauthorized =
    status === 401 ||
    normalizedMessage.includes('n?o autenticado') ||
    normalizedMessage.includes('não autenticado') ||
    normalizedMessage.includes('sess?o expirada') ||
    normalizedMessage.includes('sessão expirada');

  if (!isUnauthorized) {
    return false;
  }

  if (typeof window !== 'undefined') {
    window.location.assign('/api/auth/logout');
  }

  return true;
}

