<?php

namespace App\Domain\Depreciation\Enums;

enum MetodoDepreciacaoRegraEnum: string
{
    case LINHA_RETA = 'linha_reta';
    case SOMA_DIGITOS = 'soma_digitos';
    case UNIDADES_PRODUZIDAS = 'unidades_produzidas';
}

