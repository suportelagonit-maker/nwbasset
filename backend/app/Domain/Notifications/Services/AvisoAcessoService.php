<?php

namespace App\Domain\Notifications\Services;

use App\Domain\Auth\Enums\RoleEnum;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Notifications\Enums\AvisoAcessoEnum;
use App\Domain\Notifications\Models\AcessoAparelho;
use App\Domain\Notifications\Support\ApelidoDoAparelho;
use App\Domain\Notifications\Support\IpLegivel;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Quando avisar sobre acesso ao sistema, e quem avisar.
 *
 * Tres situacoes, todas presas ao mesmo gatilho de ruido baixo — o aparelho
 * ainda nao visto:
 *
 *   ENTRADA_NOVA  a propria pessoa, quando a conta dela e usada num aparelho
 *                 novo. E o aviso classico de "foi voce?".
 *   ACESSO_ADMIN  os outros administradores, quando quem entrou num aparelho
 *                 novo tem poder de administrador.
 *   USUARIO_NOVO  os administradores, quando o NWB ID cria uma conta aqui.
 *
 * Avisar a cada login seria ruido e a pessoa desligaria tudo em uma semana;
 * avisar so o que foge do habitual e o que faz alguem olhar.
 *
 * Nada aqui pode derrubar um login: todo o trabalho acontece depois da
 * resposta (defer, em quem chama) e qualquer falha vira log.
 */
class AvisoAcessoService
{
    public function __construct(private readonly PushService $push)
    {
    }

    public function registrarLogin(
        Usuario $usuario,
        ?string $ip,
        ?string $userAgent,
        bool $contaRecemCriada = false,
        ?int $empresaId = null,
    ): void {
        try {
            $aparelhoNovo = $this->lembrarAparelho($usuario, $ip, $userAgent);
            $empresaId ??= $usuario->empresa_id;

            if ($contaRecemCriada) {
                $this->avisarUsuarioNovo($usuario, $empresaId);

                // O primeiro acesso e sempre de um aparelho novo, e a pessoa
                // esta justamente entrando: avisa-la disso seria ruido.
                return;
            }

            if (! $aparelhoNovo) {
                return;
            }

            $apelido = ApelidoDoAparelho::de($userAgent);
            $ipLegivel = IpLegivel::de($ip);

            $this->push->avisar(
                $usuario,
                AvisoAcessoEnum::ENTRADA_NOVA,
                AvisoAcessoEnum::ENTRADA_NOVA->titulo(),
                sprintf(
                    'Sua conta entrou no NWB Asset em %s%s, às %s. Não foi você? Avise o administrador.',
                    $apelido,
                    $ipLegivel === null ? '' : ' · IP '.$ipLegivel,
                    now()->format('d/m H:i'),
                ),
            );

            if ($this->ehAdministrador($usuario, $empresaId)) {
                $this->avisarAcessoAdmin($usuario, $empresaId, $apelido, $ipLegivel);
            }
        } catch (Throwable $erro) {
            Log::warning('aviso de acesso nao enviado', [
                'usuario_id' => $usuario->id,
                'erro' => $erro->getMessage(),
            ]);
        }
    }

    /** Devolve true quando o aparelho ainda nao tinha entrado nesta conta. */
    private function lembrarAparelho(Usuario $usuario, ?string $ip, ?string $userAgent): bool
    {
        $impressao = AcessoAparelho::impressaoDe($userAgent);

        $aparelho = AcessoAparelho::query()
            ->where('usuario_id', $usuario->id)
            ->where('impressao', $impressao)
            ->first();

        if ($aparelho !== null) {
            $aparelho->forceFill([
                'visto_ultimo_em' => now(),
                'ultimo_ip' => $ip,
            ])->save();

            return false;
        }

        AcessoAparelho::query()->create([
            'usuario_id' => $usuario->id,
            'impressao' => $impressao,
            'user_agent' => $userAgent === null ? null : mb_substr($userAgent, 0, 500),
            'ultimo_ip' => $ip,
            'visto_primeiro_em' => now(),
            'visto_ultimo_em' => now(),
        ]);

        return true;
    }

    private function avisarUsuarioNovo(Usuario $novo, ?int $empresaId): void
    {
        $corpo = sprintf(
            '%s (%s) entrou pela primeira vez e a conta foi criada como %s.',
            $novo->nome,
            $novo->email,
            $this->nomeDoPerfil($novo->role),
        );

        foreach ($this->administradores($empresaId, $novo->id) as $admin) {
            $this->push->avisar(
                $admin,
                AvisoAcessoEnum::USUARIO_NOVO,
                AvisoAcessoEnum::USUARIO_NOVO->titulo(),
                $corpo,
            );
        }
    }

    private function avisarAcessoAdmin(Usuario $quemEntrou, ?int $empresaId, string $apelido, ?string $ip): void
    {
        $corpo = sprintf(
            '%s entrou como %s em %s%s.',
            $quemEntrou->nome,
            $this->nomeDoPerfil($quemEntrou->role),
            $apelido,
            $ip === null ? '' : ' · IP '.$ip,
        );


        foreach ($this->administradores($empresaId, $quemEntrou->id) as $admin) {
            $this->push->avisar(
                $admin,
                AvisoAcessoEnum::ACESSO_ADMIN,
                AvisoAcessoEnum::ACESSO_ADMIN->titulo(),
                $corpo,
            );
        }
    }

    /**
     * Administradores que devem saber: super admins do sistema e os admins
     * da empresa onde o acesso aconteceu.
     *
     * @return Collection<int, Usuario>
     */
    public function administradores(?int $empresaId, ?int $excetoUsuarioId = null): Collection
    {
        return Usuario::query()
            ->where('ativo', true)
            ->when($excetoUsuarioId !== null, fn ($consulta) => $consulta->whereKeyNot($excetoUsuarioId))
            ->where(function ($consulta) use ($empresaId): void {
                $consulta->where('role', RoleEnum::SUPER_ADMIN->value);

                if ($empresaId !== null) {
                    $consulta->orWhereHas(
                        'empresas',
                        fn ($empresas) => $empresas
                            ->where('empresas.id', $empresaId)
                            ->whereIn('usuarios_empresas.perfil', [
                                RoleEnum::SUPER_ADMIN->value,
                                RoleEnum::ADMIN_EMPRESA->value,
                            ]),
                    );
                }
            })
            ->get();
    }

    public function ehAdministrador(Usuario $usuario, ?int $empresaId = null): bool
    {
        $perfil = $usuario->roleForEmpresa($empresaId);

        return in_array($perfil, [RoleEnum::SUPER_ADMIN->value, RoleEnum::ADMIN_EMPRESA->value], true);
    }

    private function nomeDoPerfil(?string $role): string
    {
        return match ($role) {
            RoleEnum::SUPER_ADMIN->value => 'super admin',
            RoleEnum::ADMIN_EMPRESA->value => 'admin da empresa',
            RoleEnum::GESTOR_PATRIMONIAL->value => 'gestor patrimonial',
            RoleEnum::AUDITOR->value => 'auditor',
            RoleEnum::OPERADOR_INVENTARIO->value => 'operador de inventário',
            default => 'usuário',
        };
    }
}
