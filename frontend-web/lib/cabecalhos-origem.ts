/**
 * Cabeçalhos que identificam quem fez o pedido, repassados ao backend.
 *
 * As chamadas ao Laravel saem do servidor do Next, não do navegador. Sem
 * repassar estes dois cabeçalhos, tudo chega à API como se viesse do próprio
 * container do frontend — e três coisas quebram em silêncio:
 *
 *   - o aviso de acesso diz "aparelho desconhecido" e mostra o IP interno;
 *   - a trilha de auditoria registra sempre o mesmo IP e navegador;
 *   - o rate limit do login, que é por IP, vira um balde único para todo
 *     mundo em vez de um por pessoa.
 *
 * O X-Forwarded-For já vem preenchido pelo Apache em produção (é ele quem
 * fala com o navegador); aqui só repassamos a cadeia adiante.
 */
export function cabecalhosDeOrigem(request: Request): Record<string, string> {
  const cabecalhos: Record<string, string> = {};

  const encaminhado = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip');
  if (encaminhado) {
    cabecalhos['X-Forwarded-For'] = encaminhado;
  }

  const navegador = request.headers.get('user-agent');
  if (navegador) {
    cabecalhos['User-Agent'] = navegador;
  }

  return cabecalhos;
}
