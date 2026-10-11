<?php

namespace App\Domain\Inventory\Enums;

/**
 * Abrangencia do inventario.
 *
 * O rotativo e a pratica do mercado em empresa com muitos bens: em vez de
 * parar tudo para contar a filial inteira, percorre-se alguns locais por
 * vez ate fechar o ciclo.
 */
enum InventarioTipoEnum: string
{
    /** Toda a filial (ou a empresa, quando nao ha filial). */
    case COMPLETO = 'COMPLETO';

    /** Apenas os locais escolhidos. */
    case ROTATIVO = 'ROTATIVO';

    public function rotulo(): string
    {
        return match ($this) {
            self::COMPLETO => 'Completo',
            self::ROTATIVO => 'Rotativo (locais escolhidos)',
        };
    }
}
