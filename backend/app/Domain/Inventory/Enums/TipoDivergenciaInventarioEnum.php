<?php

namespace App\Domain\Inventory\Enums;

enum TipoDivergenciaInventarioEnum: string
{
    case NAO_ENCONTRADO = 'NAO_ENCONTRADO';
    case SEM_TOMBO = 'SEM_TOMBO';
    case LOCAL_DIFERENTE = 'LOCAL_DIFERENTE';
    case RESPONSAVEL_DIFERENTE = 'RESPONSAVEL_DIFERENTE';

    public static function values(): array
    {
        return array_map(static fn (self $item) => $item->value, self::cases());
    }
}
