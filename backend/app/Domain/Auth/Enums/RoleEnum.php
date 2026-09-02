<?php

namespace App\Domain\Auth\Enums;

enum RoleEnum: string
{
    case SUPER_ADMIN = 'SUPER_ADMIN';
    case ADMIN_EMPRESA = 'ADMIN_EMPRESA';
    case GESTOR_PATRIMONIAL = 'GESTOR_PATRIMONIAL';
    case AUDITOR = 'AUDITOR';
    case OPERADOR_INVENTARIO = 'OPERADOR_INVENTARIO';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
