<?php

namespace App\Domain\AssetMovements\Enums;

enum BaixaBemMotivoEnum: string
{
    case OBSOLESCENCIA = 'OBSOLESCENCIA';
    case DANO_IRRECUPERAVEL = 'DANO_IRRECUPERAVEL';
    case ROUBO_FURTO = 'ROUBO_FURTO';
    case EXTRAVIO = 'EXTRAVIO';
    case SINISTRO = 'SINISTRO';
    case DOACAO = 'DOACAO';
    case VENDA = 'VENDA';
    case SUCATEAMENTO = 'SUCATEAMENTO';
    case AJUSTE_INVENTARIO = 'AJUSTE_INVENTARIO';
    case OUTRO = 'OUTRO';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
