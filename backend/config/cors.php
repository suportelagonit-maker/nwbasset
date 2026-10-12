<?php

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
|
| O navegador nunca chama /api/v1 de outra origem: a tela conversa com o
| Laravel pelo proxy server-side do Next, sempre na mesma origem. Entao o
| default do Laravel (Access-Control-Allow-Origin: *) so afrouxava a API a
| toa — qualquer site podia dispara-la do navegador da vitima.
|
| Aqui a API passa a aceitar origem cruzada apenas das origens conhecidas
| (produxao e desenvolvimento), configuraveis por CORS_ALLOWED_ORIGINS.
|
*/

$origens = array_values(array_filter(array_map(
    'trim',
    explode(',', (string) env('CORS_ALLOWED_ORIGINS', 'https://nwbasset.igrejanovoscomecos.com.br,http://localhost:5001')),
)));

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => $origens,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'X-Requested-With', 'X-Empresa-Id'],

    'exposed_headers' => [],

    'max_age' => 3600,

    // A autenticacao e por Bearer token, nao por cookie cross-origin: nao ha
    // motivo para permitir credenciais na requisicao CORS.
    'supports_credentials' => false,

];
