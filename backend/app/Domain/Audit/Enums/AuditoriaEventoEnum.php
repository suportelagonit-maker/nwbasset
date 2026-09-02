<?php

namespace App\Domain\Audit\Enums;

enum AuditoriaEventoEnum: string
{
    case LOGIN = 'login';
    case LOGOUT = 'logout';
    case CRIACAO = 'criacao';
    case ATUALIZACAO = 'atualizacao';
    case EXCLUSAO = 'exclusao';
    case ASSOCIACAO = 'associacao';
}
