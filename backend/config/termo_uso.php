<?php

/*
|--------------------------------------------------------------------------
| Termo de Responsabilidade de Uso e LGPD
|--------------------------------------------------------------------------
|
| Ao publicar uma nova versao do termo: crie resources/termos/termo-uso-vX.Y.html,
| atualize "versao" e "publicado_em". Todos os usuarios precisarao aceitar
| a nova versao no proximo acesso; os aceites anteriores ficam guardados.
|
*/

return [
    'versao' => env('TERMO_USO_VERSAO', '1.0'),
    'publicado_em' => env('TERMO_USO_PUBLICADO_EM', '2026-09-17'),
    'titulo' => 'Termo de Responsabilidade de Uso da Ferramenta e Proteção de Dados (LGPD)',
];
