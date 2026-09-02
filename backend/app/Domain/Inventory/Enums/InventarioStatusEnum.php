<?php

namespace App\Domain\Inventory\Enums;

enum InventarioStatusEnum: string
{
    case ABERTO = 'ABERTO';
    case EM_ANDAMENTO = 'EM_ANDAMENTO';
    case FINALIZADO = 'FINALIZADO';

    public static function values(): array
    {
        return array_map(static fn (self $item) => $item->value, self::cases());
    }
}
