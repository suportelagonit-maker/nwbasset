import { proxyDashboardRequest } from '@/lib/dashboard-proxy';

export async function GET(request: Request) {
  return proxyDashboardRequest(request, 'evolucao-patrimonio');
}
