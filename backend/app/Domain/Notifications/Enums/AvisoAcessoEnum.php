<?php

namespace App\Domain\Notifications\Enums;

/**
 * Assuntos dos avisos de acesso.
 *
 * Cada assunto diz tres coisas: como aparece para a pessoa, se e informacao
 * de seguranca restrita a administradores e se vem ligado por padrao.
 *
 * O padrao importa: quem acabou de ativar os avisos no aparelho nao deve
 * precisar escolher nada para receber o que interessa.
 */
enum AvisoAcessoEnum: string
{
    /** Entrada na propria conta, de um aparelho ainda nao visto. */
    case ENTRADA_NOVA = 'ENTRADA_NOVA';

    /** Conta criada pelo NWB ID no primeiro acesso de alguem. */
    case USUARIO_NOVO = 'USUARIO_NOVO';

    /** Entrada de alguem com poder de administrador no sistema. */
    case ACESSO_ADMIN = 'ACESSO_ADMIN';

    public function titulo(): string
    {
        return match ($this) {
            self::ENTRADA_NOVA => 'Entrada na sua conta',
            self::USUARIO_NOVO => 'Novo usuário no sistema',
            self::ACESSO_ADMIN => 'Entrada de administrador',
        };
    }

    public function descricao(): string
    {
        return match ($this) {
            self::ENTRADA_NOVA => 'Avisa quando sua conta é usada em um aparelho ou navegador que ainda não tinha entrado no NWB Asset.',
            self::USUARIO_NOVO => 'Avisa quando o NWB ID cria uma conta nova aqui, no primeiro acesso da pessoa.',
            self::ACESSO_ADMIN => 'Avisa quando alguém entra no sistema com perfil de administrador (super admin ou admin da empresa).',
        };
    }

    /** Informacao de seguranca sobre terceiros: so administradores recebem. */
    public function somenteAdministradores(): bool
    {
        return match ($this) {
            self::ENTRADA_NOVA => false,
            self::USUARIO_NOVO, self::ACESSO_ADMIN => true,
        };
    }

    public function ligadoPorPadrao(): bool
    {
        return true;
    }

    /** Para onde a notificacao leva ao ser tocada. */
    public function destino(): string
    {
        return match ($this) {
            self::ENTRADA_NOVA => '/perfil',
            self::USUARIO_NOVO, self::ACESSO_ADMIN => '/users',
        };
    }

    /** @return array<int, self> */
    public static function disponiveisPara(bool $administrador): array
    {
        return array_values(array_filter(
            self::cases(),
            static fn (self $assunto): bool => $administrador || ! $assunto->somenteAdministradores(),
        ));
    }
}
