<?php

namespace App\Domain\Inventory\Enums;

/**
 * O que o sistema concluiu de uma leitura feita em campo.
 *
 * O operador precisa saber na hora, pelo aparelho, o que aconteceu — e
 * continuar contando. Por isso cada resultado tem uma frase pronta.
 */
enum ResultadoLeituraEnum: string
{
    /** Bem do inventário, contado agora. */
    case CONTADO = 'CONTADO';

    /** Já tinha sido contado antes nesta mesma contagem. */
    case JA_CONTADO = 'JA_CONTADO';

    /** Contado, mas estava em local diferente do cadastrado. */
    case LOCAL_DIFERENTE = 'LOCAL_DIFERENTE';

    /** A etiqueta é de um bem que não faz parte deste inventário. */
    case FORA_DO_INVENTARIO = 'FORA_DO_INVENTARIO';

    /** Nenhum bem corresponde ao código lido. */
    case NAO_IDENTIFICADO = 'NAO_IDENTIFICADO';

    public function mensagem(): string
    {
        return match ($this) {
            self::CONTADO => 'Contado.',
            self::JA_CONTADO => 'Este bem já tinha sido contado.',
            self::LOCAL_DIFERENTE => 'Contado, mas está em local diferente do cadastro.',
            self::FORA_DO_INVENTARIO => 'Esta etiqueta não faz parte deste inventário.',
            self::NAO_IDENTIFICADO => 'Nenhum bem encontrado para este código.',
        };
    }

    /** Leitura que o conferente precisa olhar depois. */
    public function exigeAtencao(): bool
    {
        return $this !== self::CONTADO;
    }
}
