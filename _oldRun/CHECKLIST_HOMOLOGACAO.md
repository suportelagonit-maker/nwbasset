# CHECKLIST DE HOMOLOGACAO - NWB Asset

Checklist de validacao com target folder explicito.

## 1. Ambiente

- [ ] [backend/] Laravel sobe corretamente
- [ ] [frontend-web/] Next.js sobe corretamente
- [ ] [frontend-mobile/] Expo sobe corretamente
- [ ] [backend/] PostgreSQL conecta corretamente
- [ ] [backend/] Migrations executam sem erro
- [ ] [backend/] Seeds executam sem erro
- [ ] [backend/] API responde em `/api/v1`
- [ ] [frontend-web/] Consumo da API funcionando
- [ ] [frontend-mobile/] Consumo da API funcionando

## 2. Autenticacao e acesso

- [ ] [backend/] Login funciona
- [ ] [backend/] Logout funciona
- [ ] [backend/] `auth/me` retorna usuario
- [ ] [frontend-web/] Sessao persiste corretamente
- [ ] [frontend-mobile/] Sessao persiste corretamente
- [ ] [backend/] Middleware `empresa.context` funciona
- [ ] [backend/] Middleware `role.permission` funciona

## 3. Modulos de negocio (API)

- [ ] [backend/] Empresas, filiais, unidades, departamentos, locais e responsaveis
- [ ] [backend/] Usuarios, papeis e permissoes
- [ ] [backend/] Bens patrimoniais, plaquetas e movimentacoes
- [ ] [backend/] Depreciacao, inventario, conciliacao e divergencias
- [ ] [backend/] Relatorios, exportacoes e dashboard

## 4. Frontend Web

- [ ] [frontend-web/] Login, selecao de empresa e navegacao
- [ ] [frontend-web/] Dashboard patrimonial
- [ ] [frontend-web/] CRUDs administrativos principais
- [ ] [frontend-web/] Responsividade e estados de erro/loading

## 5. Frontend Mobile

- [ ] [frontend-mobile/] Login
- [ ] [frontend-mobile/] Lista e execucao de inventarios
- [ ] [frontend-mobile/] Scanner QR Code e busca de bem
- [ ] [frontend-mobile/] Confirmacao e divergencias
- [ ] [frontend-mobile/] Sincronizacao offline

## 6. Testes tecnicos

- [ ] [backend/] `php artisan test`
- [ ] [frontend-web/] `npm run build`
- [ ] [frontend-mobile/] typecheck e build local
- [ ] [frontend-web/] Console sem erros
- [ ] [frontend-mobile/] Console sem erros
- [ ] [backend/] Logs e auditoria sem inconsistencias
