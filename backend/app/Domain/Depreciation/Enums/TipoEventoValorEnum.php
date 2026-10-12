<?php

namespace App\Domain\Depreciation\Enums;

/**
 * Eventos que mudam o valor de um bem ao longo da vida.
 *
 * O cronograma aplica cada um a partir da competencia do evento e recalcula
 * dali para frente, prospectivamente (CPC 27).
 */
enum TipoEventoValorEnum: string
{
    /** Benfeitoria/melhoria: aumenta o valor e a base depreciavel. */
    case ACRESCIMO = 'ACRESCIMO';

    /** Reavaliacao (CPC 27): o bem passa a valer o novo valor informado. */
    case REAVALIACAO = 'REAVALIACAO';

    /** Impairment (CPC 01): reduz o valor ao recuperavel. */
    case IMPAIRMENT = 'IMPAIRMENT';

    /** Baixa parcial: parte do bem sai (sucata, venda de parte). */
    case BAIXA_PARCIAL = 'BAIXA_PARCIAL';

    public function rotulo(): string
    {
        return match ($this) {
            self::ACRESCIMO => 'Acréscimo / benfeitoria',
            self::REAVALIACAO => 'Reavaliação',
            self::IMPAIRMENT => 'Impairment (perda ao recuperável)',
            self::BAIXA_PARCIAL => 'Baixa parcial',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(static fn (self $c): string => $c->value, self::cases());
    }
}
