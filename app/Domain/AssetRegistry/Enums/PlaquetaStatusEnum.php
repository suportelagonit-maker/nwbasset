<?php

namespace App\Domain\AssetRegistry\Enums;

enum PlaquetaStatusEnum: string
{
    case EM_ESTOQUE = 'EM_ESTOQUE';
    case GERADA = 'GERADA';
    case VINCULADA = 'VINCULADA';
    case APLICADA = 'APLICADA';
    case INATIVA = 'INATIVA';
    case SUBSTITUIDA = 'SUBSTITUIDA';

    public static function values(): array
    {
        return array_map(static fn (self $item) => $item->value, self::cases());
    }

    public function isAtiva(): bool
    {
        return in_array($this, [self::GERADA, self::VINCULADA, self::APLICADA], true);
    }
}
