# NWB Asset no celular — aplicativo instalável e câmera

Como o sistema se comporta no telefone: instalação como aplicativo, aviso de
falta de rede e uso da câmera para ler etiquetas e tirar fotos. Escrito para
quem for mexer nesses arquivos depois.

## 1. Instalável (PWA)

| Peça | Arquivo |
|---|---|
| Manifesto | `frontend-web/app/manifest.ts` → servido em `/manifest.webmanifest` |
| Service worker | `frontend-web/public/sw.js` |
| Registro do worker | `frontend-web/components/RegistrarServiceWorker.tsx` (montado em `app/layout.tsx`) |
| Convite de instalação | `frontend-web/components/InstalarApp.tsx` (no `MobileBottomNav` e no `UserMenu`) |
| Ícones | `frontend-web/public/icon-{192,512}.png`, `icon-maskable-{192,512}.png`, `apple-touch-icon.png` |
| Página sem rede | `frontend-web/public/offline.html` |

O manifesto declara `display: standalone`, ícones `any` e `maskable` (192 e
512) e quatro atalhos — entre eles **Ler etiqueta**, que abre a consulta
pública já com a câmera ligada (`/patrimonio/consulta?ler=1`).

**O convite de instalação é capturado no `<head>`.** O Chrome dispara
`beforeinstallprompt` antes do React montar; um script inline em
`app/layout.tsx` guarda o evento em `window.__nwbInstalacao` e avisa pelo
evento `nwb:instalacao`. Sem isso o item "Instalar aplicativo" nunca aparecia.
No iPhone não existe esse evento: o componente mostra o caminho
Compartilhar › "Adicionar à Tela de Início".

**Só funciona em HTTPS** (ou `localhost`): service worker, instalação e câmera
exigem contexto seguro. A produção já é `https://nwbasset.igrejanovoscomecos.com.br`.

### O que o service worker guarda — e o que nunca guarda

- **Nunca** entra em cache: `/api/**` e o HTML de telas autenticadas. Num
  aparelho compartilhado isso mostraria dados de um usuário para o seguinte.
- Navegação é sempre rede primeiro. Sem rede, serve `/offline.html`.
- Entram em cache: `/_next/static/`, `/ajuda/` e mídia (imagens, fontes, css,
  js), em cache-first com atualização em segundo plano.

A página de falta de rede é **HTML puro de propósito**: sem rede os scripts do
Next também não carregam, e uma página React quebraria com "Application error"
na hora em que ela mais precisa aparecer.

Ao mudar a política de cache, suba `VERSAO` em `sw.js` (`nwbasset-vN`): o
`activate` apaga todo cache cujo nome não começa com a versão atual.

## 2. Leitura de código de barras / QR Code

Componente reutilizável: `frontend-web/components/LeitorCodigo.tsx`.

- Câmera traseira (`facingMode: environment`), zoom até 2× quando o aparelho
  permite, vibração curta ao ler, `Esc` fecha.
- Dois caminhos de decodificação: **zxing** (`CODE_128`, `CODE_39`, `ITF`,
  `EAN_13/8`, `UPC_A/E`, `QR_CODE`), varrendo a imagem inteira e duas faixas
  centrais com realce de contraste para etiquetas desbotadas; se o zxing não
  iniciar, cai no `BarcodeDetector` nativo do navegador.
- Mostra o código lido para conferência antes de usar (`confirmar`), e
  `validar` permite recusar leituras que não servem — a mensagem aparece sem
  fechar a câmera.
- O overlay usa `z-index: 120` porque quase sempre é aberto de dentro de outro
  modal (o formulário de cadastro).

### Onde a câmera aparece

| Tela | Campo | Como resolve o código |
|---|---|---|
| Cadastro de bem (etapa Identificação) | `numero_tombo` (select de plaquetas disponíveis) | Casa o código com as opções já carregadas (`opcaoDaEtiqueta`) |
| Transferências, baixas, responsabilidade, histórico, divergências, depreciações | `bem_patrimonial_id` (select de bens) | Consulta `GET /api/admin/plaquetas?codigo=…` e usa o `bem_patrimonial_id` da plaqueta |
| Consulta pública | campo de código | `frontend-web/components/ConsultaPorEtiqueta.tsx` |
| Plaquetas / QR Code | cadastro da etiqueta | Leitor próprio, anterior a este (`PlaquetaManagement.tsx`) |

`opcaoDaEtiqueta` (em `GenericModuleManagement.tsx`) tenta o conteúdo lido, só
os dígitos e os seis últimos dígitos — o número visível da plaqueta costuma ser
o final do código impresso.

No backend, `GET /api/v1/plaquetas?codigo=…` filtra pelo conteúdo lido
(número, código de barras, QR, link de consulta), sempre dentro da empresa
ativa. A limpeza do código (espaços e link de consulta → código) está em
`PlaquetaPatrimonialService::normalizarCodigo()`, a mesma usada pela consulta
pública. Coberto por `tests/Feature/PlaquetaBuscaPorCodigoTest.php`.

## 3. Foto pela câmera

Na etapa **Anexos** do cadastro de bem, o botão **Tirar foto** (só no celular)
usa um `<input type="file" accept="image/*" capture="environment">`, que abre a
câmera traseira direto. O botão **Adicionar** continua levando à galeria e aos
arquivos, no celular e no computador.

## 4. O que ficou de fora

**Trabalho offline de verdade** (fila de contagem de inventário gravada no
aparelho e enviada quando a rede voltar) não foi feito — é etapa própria,
porque exige decidir conflito de dados, identidade do operador e o que fazer
com leituras repetidas. Hoje, sem rede, o sistema avisa e não deixa registrar.
