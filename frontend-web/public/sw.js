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
const VERSAO = 'nwbasset-v3';
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


/*
 * Avisos de acesso (Web Push).
 *
 * O servidor manda o aviso, o servico de push do navegador acorda este
 * worker e ele mostra a notificacao. O payload traz so o que aparece na
 * tela: nada e guardado aqui, e nenhum dado do patrimonio trafega.
 */
const AVISO_PADRAO = {
  title: 'NWB Asset',
  body: 'Você tem um aviso novo.',
  url: '/perfil',
  tag: 'generico',
};

function lerAviso(evento) {
  if (!evento.data) {
    return AVISO_PADRAO;
  }

  try {
    const bruto = evento.data.json();

    if (typeof bruto !== 'object' || bruto === null) {
      return AVISO_PADRAO;
    }

    return {
      title: typeof bruto.title === 'string' ? bruto.title : AVISO_PADRAO.title,
      body: typeof bruto.body === 'string' ? bruto.body : AVISO_PADRAO.body,
      // So caminho interno: um payload adulterado nao abre outro site.
      url: typeof bruto.url === 'string' && bruto.url.startsWith('/') ? bruto.url : AVISO_PADRAO.url,
      tag: typeof bruto.tag === 'string' ? bruto.tag : AVISO_PADRAO.tag,
    };
  } catch {
    return AVISO_PADRAO;
  }
}

self.addEventListener('push', (event) => {
  const aviso = lerAviso(event);

  event.waitUntil(
    self.registration.showNotification(aviso.title, {
      body: aviso.body,
      // Mesmo assunto substitui o anterior em vez de empilhar.
      tag: aviso.tag,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      lang: 'pt-BR',
      data: { url: aviso.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const dados = event.notification.data;
  const destino = dados && typeof dados.url === 'string' ? dados.url : '/perfil';

  event.waitUntil(
    (async () => {
      const abas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      // App ja aberto? Leva aquela aba para a tela, em vez de abrir outra.
      for (const aba of abas) {
        if ('focus' in aba) {
          await aba.focus();
          if ('navigate' in aba) {
            await aba.navigate(new URL(destino, self.location.origin).toString()).catch(() => null);
          }
          return;
        }
      }

      await self.clients.openWindow(destino);
    })(),
  );
});
