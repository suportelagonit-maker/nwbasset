<?php

namespace App\Domain\Auth\Actions;

use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Auth\DTOs\LoginData;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Shared\Enums\StatusRegistroEnum;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class LoginAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public function execute(LoginData $data): array
    {
        $usuario = Usuario::query()->where('email', $data->email)->first();

        if (! $usuario || ! Hash::check($data->password, $usuario->password)) {
            throw ValidationException::withMessages([
                'email' => ['Credenciais inválidas.'],
            ]);
        }

        if ($usuario->status !== StatusRegistroEnum::ATIVO->value) {
            throw ValidationException::withMessages([
                'email' => ['Usuário inativo.'],
            ]);
        }

        $usuario->forceFill(['ultimo_login_em' => now()])->save();

        $empresaId = $usuario->empresaPadrao()?->id ?? $usuario->empresa_id;
        $token = $usuario->createToken($data->deviceName)->plainTextToken;

        $this->auditLogger->log(
            usuario: $usuario,
            evento: AuditoriaEventoEnum::LOGIN->value,
            entidade: 'auth.login',
            empresaId: $empresaId,
            dadosNovos: ['email' => $usuario->email],
            descricao: 'Login realizado com sucesso.',
        );

        return [
            'token' => $token,
            'usuario' => $usuario->load(['empresa', 'empresas', 'perfis', 'filiais']),
        ];
    }
}
