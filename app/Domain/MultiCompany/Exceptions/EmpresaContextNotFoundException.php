<?php

namespace App\Domain\MultiCompany\Exceptions;

use RuntimeException;

class EmpresaContextNotFoundException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Contexto de empresa não definido para a operação solicitada.');
    }
}
