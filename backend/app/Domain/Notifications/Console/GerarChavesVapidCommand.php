<?php

namespace App\Domain\Notifications\Console;

use Illuminate\Console\Command;
use Minishlink\WebPush\VAPID;

class GerarChavesVapidCommand extends Command
{
    protected $signature = 'push:chaves';

    protected $description = 'Gera o par de chaves VAPID usado para assinar os avisos push';

    public function handle(): int
    {
        $chaves = VAPID::createVapidKeys();

        $this->newLine();
        $this->line('Chaves VAPID geradas. Copie para o .env deste ambiente:');
        $this->newLine();
        $this->line('PUSH_VAPID_PUBLIC_KEY='.$chaves['publicKey']);
        $this->line('PUSH_VAPID_PRIVATE_KEY='.$chaves['privateKey']);
        $this->newLine();
        $this->warn('A chave privada nao pode ser versionada nem compartilhada.');
        $this->warn('Trocar o par depois invalida as inscricoes dos aparelhos: todos precisam ativar os avisos de novo.');
        $this->newLine();

        return self::SUCCESS;
    }
}
