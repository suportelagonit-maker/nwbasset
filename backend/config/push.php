<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Avisos push (Web Push)
    |--------------------------------------------------------------------------
    |
    | Sem servico de terceiros e sem custo: o servidor assina o aviso com as
    | chaves VAPID e quem entrega e o servico de push do proprio navegador
    | (Google, Mozilla, Apple).
    |
    | Sem as chaves o sistema sobe igual e so nao envia nada — a tela do
    | perfil explica a situacao em vez de oferecer um botao que nao funciona.
    |
    | Para gerar o par de chaves:
    |   php artisan push:chaves
    |
    */

    'vapid' => [
        'publica' => env('PUSH_VAPID_PUBLIC_KEY'),
        'privada' => env('PUSH_VAPID_PRIVATE_KEY'),

        // Exigido pelo padrao: um contato que o servico de push possa usar
        // se algo der errado com os envios deste servidor.
        'assunto' => env('PUSH_VAPID_SUBJECT', env('APP_URL', 'https://nwbasset.igrejanovoscomecos.com.br')),
    ],

    // Tempo que o servico de push guarda o aviso se o aparelho estiver
    // desligado. Aviso de acesso velho nao serve para nada: 12 horas.
    'ttl' => (int) env('PUSH_TTL', 43200),

    // Depois de tantas recusas seguidas do servico de push, a inscricao do
    // aparelho e descartada (a pessoa reativa na tela do perfil).
    'max_falhas' => (int) env('PUSH_MAX_FALHAS', 5),

];
