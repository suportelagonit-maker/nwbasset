# Avisos de acesso por push

Avisa a pessoa no celular ou no computador quando a conta dela é usada num
aparelho novo, e avisa os administradores quando alguém nasce ou entra com
poder de administrador. Escrito para quem for mexer nisso depois.

Sem serviço de terceiros e sem custo: o servidor assina o aviso com as chaves
VAPID e quem entrega é o serviço de push do próprio navegador (Google,
Mozilla, Apple).

## 1. Ligar num ambiente

```bash
docker compose exec backend php artisan push:chaves
```

O comando imprime o par de chaves. Copie as duas para o `.env` do ambiente
(`PUSH_VAPID_PUBLIC_KEY` e `PUSH_VAPID_PRIVATE_KEY`) e suba o backend de novo.

- **A chave privada não é versionada.** Cada ambiente tem o seu par.
- **Trocar o par invalida as inscrições**: todos os aparelhos precisam ligar
  os avisos de novo, porque o navegador amarra a inscrição à chave pública.
- **Sem as chaves o sistema sobe igual** e só não envia nada — a tela do
  perfil diz isso em vez de oferecer um botão que não funcionaria.
- **Só funciona em HTTPS** (ou `localhost`), como o resto do PWA.

## 2. Os três assuntos

| Assunto | Quem recebe | Quando dispara |
|---|---|---|
| `ENTRADA_NOVA` | a própria pessoa | a conta dela entrou de um aparelho/navegador ainda não visto |
| `ACESSO_ADMIN` | os **outros** administradores | quem entrou de um aparelho novo tem perfil de administrador |
| `USUARIO_NOVO` | os administradores | o NWB ID criou uma conta aqui, no primeiro acesso da pessoa |

Definidos em `AvisoAcessoEnum`, que também diz quais são restritos a
administrador e o destino do toque na notificação.

**Por que tudo preso a "aparelho novo":** avisar a cada login viraria ruído e
a pessoa desligaria tudo em uma semana. O que faz alguém olhar é o que foge
do habitual. Quem entra todo dia do mesmo celular nunca recebe aviso.

A memória de aparelhos fica em `acessos_aparelhos`. A impressão é um hash
grosseiro do navegador e do sistema, **sem os números de versão** — uma
atualização do Chrome não pode virar "aparelho novo". O IP é guardado para a
pessoa reconhecer o acesso, nunca para comparar: IP de celular muda o tempo
todo e avisaria à toa.

No primeiro acesso de uma conta nova, só os administradores são avisados: a
pessoa está ali mesmo criando a conta, avisá-la seria ruído.

## 3. As peças

| Peça | Arquivo |
|---|---|
| Assuntos e padrões | `backend/app/Domain/Notifications/Enums/AvisoAcessoEnum.php` |
| Regras de quando/quem | `backend/app/Domain/Notifications/Services/AvisoAcessoService.php` |
| Inscrições e preferências | `backend/app/Domain/Notifications/Services/PushService.php` |
| Entrega (VAPID) | `backend/app/Domain/Notifications/Services/WebPushEnviador.php` |
| API | `backend/app/Domain/Notifications/Controllers/PushController.php` |
| Gatilho | `AuthService::avisarAcesso()`, nas duas formas de entrada |
| Service worker | `frontend-web/public/sw.js` (`push` e `notificationclick`) |
| Tela | `frontend-web/components/AvisosPush.tsx`, no perfil |
| Testes | `backend/tests/Feature/AvisosPushAcessoTest.php` |

Endpoints (todos do próprio usuário, sem contexto de empresa):
`GET /api/v1/push`, `POST|DELETE /api/v1/push/assinaturas`,
`PUT /api/v1/push/preferencias`, `POST /api/v1/push/teste`.

## 4. Decisões que não são óbvias no código

**O envio acontece depois da resposta.** `AuthService::avisarAcesso()` usa
`defer()`: a entrada da pessoa não espera o serviço de push, e uma falha lá
não derruba o login. Como a imagem roda mod_php (e não FastCGI), a conexão só
fecha no fim do processo — por isso o envio tem teto de 5 segundos.

**O endpoint é único no sistema, não por usuário.** Num computador
compartilhado a inscrição muda de dono em vez de duplicar; duas linhas para o
mesmo aparelho fariam o aviso de uma pessoa tocar no bolso da outra.

**Inscrição morta é apagada na hora.** Quando o serviço de push responde 404
ou 410, aquela inscrição nunca mais funciona. Falha passageira só conta ponto
(`push_assinaturas.falhas`), e a inscrição cai depois de 5 seguidas.

**O payload só leva o que aparece na tela.** Nada do patrimônio trafega, e o
service worker recusa `url` que não comece com `/` — um payload adulterado
não abre outro site.

**A ausência de linha em `push_preferencias` significa "o padrão do
assunto"**, não "desligado". Quem acabou de ligar os avisos não precisa
escolher nada para receber o que interessa.

## 5. O que foi corrigido junto

Duas coisas quebradas apareceram ao construir isto, porque o recurso depende
delas:

**A trilha de auditoria nunca gravou nada.** O `AuditLogger` existe desde o
início e escreve em `auditoria_eventos`, mas a tabela não tinha migration — e
o próprio logger desiste em silêncio quando ela falta (`Schema::hasTable`).
Login, logout, criação de usuário e mudança de permissão vinham sendo
descartados em todos os ambientes. A migration foi criada; não há tela para
consultar a trilha ainda.

**O IP e o navegador do usuário não chegavam ao backend.** As chamadas ao
Laravel saem do servidor do Next, então tudo chegava como se viesse do
container do frontend. Além de inutilizar o aviso ("aparelho desconhecido",
IP interno), isso fazia o rate limit do login — que é por IP — virar um balde
único para todo mundo, e a trilha registrar sempre o mesmo IP.
`frontend-web/lib/cabecalhos-origem.ts` repassa `X-Forwarded-For` e
`User-Agent` nas rotas de login, de NWB ID e no proxy da área logada.

## 6. Limites conhecidos

- **iPhone**: só funciona com o app instalado na tela de início (iOS 16.4+).
  A tela do perfil explica isso quando o navegador não suporta.
- **Nenhuma tela mostra os aparelhos inscritos** um a um — a tela do perfil
  só diz quantos são, e desliga o atual.
- **A trilha de auditoria não tem consulta na interface** (ver seção 5).
- Na primeira entrada depois deste deploy, todo mundo recebe um aviso de
  "aparelho novo": a memória de aparelhos nasce vazia.
