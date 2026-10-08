/*
 * Service worker do NWB Asset.
 *
 * Objetivos, nesta ordem: tornar o sistema instalavel como aplicativo,
 * abrir rapido (assets em cache) e dizer com clareza quando falta rede.
 *
 * 🔒 O que NUNCA entra em cache: respostas da API (/api/**) e o HTML das
 *    telas autenticadas. Guardar isso num aparelho compartilhado exibiria
 *    dados de um usuario para o seguinte. Navegacao e sempre rede primeiro;
 *    sem rede, mostramos a pagina /offline.html (HTML puro, sem depender
 *    dos scripts do Next, que tambem nao carregariam).
 */
const VERSAO = 'nwbasset-v2';
const CACHE_ESTATICO = `${VERSAO}-estatico`;
const PAGINA_OFFLINE = '/offline.html';

const ESSENCIAIS = [
  PAGINA_OFFLINE,
  '/logoasset.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_ESTATICO)
      .then((cache) => cache.addAll(ESSENCIAIS))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((nome) => !nome.startsWith(VERSAO)).map((nome) => caches.delete(nome))))
      .then(() => self.clients.claim()),
  );
});

/** Arquivos versionados pelo build e midia: podem ser servidos do cache. */
function ehEstatico(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/ajuda/') ||
    /\.(?:png|jpe?g|webp|svg|ico|woff2?|ttf|css|js)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // So cuidamos do proprio site; API e dominios externos vao direto a rede.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(PAGINA_OFFLINE)) ?? Response.error()),
    );
    return;
  }

  if (ehEstatico(url)) {
    event.respondWith(
      caches.match(request).then((cacheado) => {
        const daRede = fetch(request)
          .then((resposta) => {
            if (resposta && resposta.ok && resposta.type === 'basic') {
              const copia = resposta.clone();
              caches.open(CACHE_ESTATICO).then((cache) => cache.put(request, copia));
            }
            return resposta;
          })
          .catch(() => cacheado);

        return cacheado ?? daRede;
      }),
    );
  }
});
