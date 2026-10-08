<?php

namespace App\Domain\Notifications\Contracts;

use App\Domain\Notifications\Models\PushAssinatura;
use App\Domain\Notifications\Support\ResultadoEnvio;

/**
 * Quem leva o aviso ate o servico de push do navegador.
 *
 * E um contrato, e nao a biblioteca direto, por dois motivos: os testes
 * precisam de um remetente que nao sai para a internet, e um dia a entrega
 * pode mudar de biblioteca sem mexer em quem chama.
 */
interface EnviadorPush
{
    public function configurado(): bool;

    /**
     * @param  array<int, PushAssinatura>  $assinaturas
     * @param  array<string, mixed>  $payload
     * @return array<int, ResultadoEnvio>  um resultado por assinatura, na mesma ordem
     */
    public function enviar(array $assinaturas, array $payload): array;
}
