<?php

/*
|--------------------------------------------------------------------------
| NWB ID (Keycloak, realm nwb-equipe) + NWB Acessos
|--------------------------------------------------------------------------
|
| Mesmo modelo do NCEdu e do NC TECH: o NWB ID autentica (OIDC, authorization
| code + PKCE no navegador), o NWB Acessos diz quem pode abrir cada sistema
| (claim "sistemas") e quem o administra, e o NWB Asset decide o que cada
| pessoa faz aqui dentro (perfil e permissoes locais).
|
| Cliente do login (publico, PKCE):        NWBID_CLIENTE        ex.: nwb-asset
| Conta de servico para o Acessos (secret): NWBID_ACESSOS_CLIENT_ID ex.: nwb-asset-api
|
*/

return [
    'issuer' => rtrim((string) env('NWBID_ISSUER', ''), '/'),

    /** Codigo deste sistema no catalogo do NWB Acessos (claim "sistemas"). */
    'sistema' => env('NWBID_SISTEMA', 'nwb-asset'),

    /** Cliente publico usado pelo navegador no login. */
    'cliente' => env('NWBID_CLIENTE', 'nwb-asset'),

    /** Clientes cujo token o backend aceita (azp/aud). */
    'clientes_aceitos' => array_values(array_filter(array_map('trim', explode(',', (string) env('NWBID_CLIENTES_ACEITOS', env('NWBID_CLIENTE', 'nwb-asset')))))),

    /**
     * Login por e-mail e senha. Padrao DESLIGADO: a entrada e unica, pelo NWB ID.
     * Sem NWBID_ISSUER configurado (desenvolvimento) a senha continua aceita,
     * para o ambiente nunca ficar sem porta de entrada.
     */
    'login_senha' => filter_var(env('AUTH_LOGIN_SENHA', false), FILTER_VALIDATE_BOOL),

    /**
     * Empresa (id) em que nascem as contas vindas do NWB ID. Sem ela nenhuma
     * conta pode ser criada automaticamente, e a pessoa e orientada a procurar
     * o administrador. NWBID_EMPRESA_ADMIN_ID continua valendo como apelido.
     */
    'empresa_padrao_id' => ($empresa = env('NWBID_EMPRESA_PADRAO_ID', env('NWBID_EMPRESA_ADMIN_ID'))) !== null && $empresa !== ''
        ? (int) $empresa
        : null,

    /**
     * Perfil da conta criada na primeira entrada. Quem o NWB Acessos apenas
     * liberou entra com o perfil padrao (leitura); quem ADMINISTRA o sistema
     * la entra como dono. Em qualquer caso o administrador ajusta depois em
     * Administracao > Usuarios — o papel e decisao do NWB Asset.
     */
    'perfil_padrao' => env('NWBID_PERFIL_PADRAO', 'AUDITOR'),
    'perfil_admin' => env('NWBID_PERFIL_ADMIN', 'SUPER_ADMIN'),

    'acessos' => [
        'url' => rtrim((string) env('NWBID_ACESSOS_API_URL', ''), '/'),
        'client_id' => env('NWBID_ACESSOS_CLIENT_ID', ''),
        'client_secret' => env('NWBID_ACESSOS_CLIENT_SECRET', ''),
    ],

    'jwks_cache_segundos' => 600,
    'acessos_cache_segundos' => 60,
    'timeout_segundos' => 5,
];
