<?php

namespace App\Domain\Depreciation\Enums;

enum OrigemParametroDepreciacaoEnum: string
{
    case HERDADO_REGRA = 'herdado_regra';
    case MANUAL = 'manual';
    case IMPORTACAO = 'importacao';
    case AJUSTE_TECNICO = 'ajuste_tecnico';
    case LEGADO = 'legado';
}

