<?php

namespace App\Domain\Auth\Services;

use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Auth\DTOs\LoginData;
use App\Domain\Auth\Enums\RoleEnum;
use App\Domain\Auth\Models\RolePermissao;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Organization\Models\Empresa;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public function login(LoginData $data): array
    {
        $usuario = Usuario::query()
            ->with(['empresa', 'empresas'])
            ->where('email', $data->email)
            ->first();

        if (! $usuario || ! Hash::check($data->password, $usuario->password)) {
            throw ValidationException::withMessages([
                'email' => ['Credenciais invalidas.'],
            ]);
        }

        if (! $usuario->ativo) {
            throw ValidationException::withMessages([
                'email' => ['Usuario inativo.'],
            ]);
        }

        $empresaAtual = $this->resolveEmpresaAtual($usuario, $data->empresaId);

        $usuario->forceFill([
            'empresa_id' => $empresaAtual?->id ?? $usuario->empresa_id,
            'ultimo_login_em' => now(),
        ])->save();

        $token = $this->gerarToken($usuario->fresh(['empresa', 'empresas']), $data->deviceName);

        $this->auditLogger->log(
            usuario: $usuario,
            evento: AuditoriaEventoEnum::LOGIN->value,
            entidade: 'auth.login',
            empresaId: $empresaAtual?->id ?? $usuario->empresa_id,
            dadosNovos: ['email' => $usuario->email, 'empresa_id' => $empresaAtual?->id],
            descricao: 'Login realizado com sucesso.',
        );

        return [
            'token' => $token,
            'usuario' => $usuario->fresh(['empresa', 'empresas']),
            'empresa_atual' => $empresaAtual,
            'permissoes' => $this->listarPermissoes($usuario, $empresaAtual?->id),
        ];
    }

    public function logout(Usuario $usuario): void
    {
        $this->auditLogger->log(
            usuario: $usuario,
            evento: AuditoriaEventoEnum::LOGOUT->value,
            entidade: 'auth.logout',
            empresaId: $usuario->empresa_id,
            descricao: 'Logout realizado com sucesso.',
        );

        $usuario->currentAccessToken()?->delete();
    }

    public function gerarToken(Usuario $usuario, string $deviceName): string
    {
        $usuario->tokens()->where('name', $deviceName)->delete();

        return $usuario->createToken($deviceName)->plainTextToken;
    }

    public function validarPermissao(Usuario $usuario, string $permissao, ?int $empresaId = null): bool
    {
        return $usuario->temAlgumaPermissao([$permissao], $empresaId);
    }

    public function listarPermissoes(Usuario $usuario, ?int $empresaId = null): array
    {
        $role = $usuario->roleForEmpresa($empresaId);

        if ($role === RoleEnum::SUPER_ADMIN->value) {
            return ['*'];
        }

        $permissoesDiretas = $usuario->permissoesDiretasLista($empresaId);

        if ($permissoesDiretas !== []) {
            return $permissoesDiretas;
        }

        return RolePermissao::query()
            ->where('role', $role)
            ->orderBy('permissao')
            ->pluck('permissao')
            ->all();
    }

    private function resolveEmpresaAtual(Usuario $usuario, ?int $empresaId = null): ?Empresa
    {
        $empresas = $usuario->empresasAcessiveis();

        if ($empresaId !== null) {
            $empresa = $empresas->firstWhere('id', $empresaId);

            if (! $empresa) {
                throw ValidationException::withMessages([
                    'empresa_id' => ['Usuario sem acesso a empresa informada.'],
                ]);
            }

            return $empresa;
        }

        if ($usuario->empresa_id !== null) {
            $empresa = $empresas->firstWhere('id', $usuario->empresa_id);

            if ($empresa) {
                return $empresa;
            }
        }

        return $empresas->first();
    }
}
