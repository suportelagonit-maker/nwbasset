<?php

namespace App\Domain\Auth\Services;

use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Auth\DTOs\LoginData;
use App\Domain\Auth\DTOs\NwbIdentidade;
use App\Domain\Auth\Enums\RoleEnum;
use App\Domain\Auth\Models\RolePermissao;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Organization\Models\Empresa;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly NwbIdService $nwbIdService,
        private readonly NwbAcessosService $nwbAcessosService,
    ) {
    }

    public function login(LoginData $data): array
    {
        if (! config('nwbid.login_senha')) {
            throw new AccessDeniedHttpException('A entrada no NWB Asset e feita pelo NWB ID. Use o botao "Entrar com NWB ID".');
        }

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

    /**
     * Entrada pelo NWB ID: o access token do Keycloak vira uma sessao local
     * igual a do login por senha.
     *
     * Entra quem tem o sistema liberado na claim "sistemas" (NWB Acessos) OU
     * quem administra o sistema no Acessos. A conta local e encontrada pelo
     * "sub" ou, na primeira entrada, pelo e-mail; administradores sem conta
     * ganham uma (ADMIN_EMPRESA da empresa configurada). Os demais sem conta
     * precisam que um administrador os cadastre em Administracao > Usuarios.
     */
    public function loginComNwbId(string $accessToken, string $deviceName = 'nwbasset-nwbid'): array
    {
        $identidade = $this->nwbIdService->identidadeDoToken($accessToken);
        $administra = $this->nwbAcessosService->administra($identidade->sub);

        if (! $administra && ! $this->nwbIdService->podeAbrirSistema($identidade)) {
            throw new AccessDeniedHttpException('Seu acesso ao NWB Asset ainda nao foi liberado no NWB Acessos. Procure o administrador do sistema.');
        }

        $usuario = Usuario::query()
            ->with(['empresa', 'empresas'])
            ->where('nwb_sub', $identidade->sub)
            ->first();

        if (! $usuario && $identidade->email !== '') {
            $usuario = Usuario::query()
                ->with(['empresa', 'empresas'])
                ->whereNull('nwb_sub')
                ->whereRaw('lower(email) = ?', [$identidade->email])
                ->first();
        }

        if (! $usuario && $administra) {
            $usuario = $this->provisionarAdministrador($identidade);
        }

        if (! $usuario) {
            throw new AccessDeniedHttpException('Voce pode abrir o NWB Asset, mas ainda nao tem cadastro aqui. Peca ao administrador para criar seu acesso.');
        }

        if (! $usuario->ativo) {
            throw new AccessDeniedHttpException('Usuario inativo. Procure o administrador.');
        }

        $empresaAtual = $this->resolveEmpresaAtual($usuario);

        $usuario->forceFill([
            'nwb_sub' => $identidade->sub,
            'auth_origem' => 'NWB',
            'empresa_id' => $empresaAtual?->id ?? $usuario->empresa_id,
            'ultimo_login_em' => now(),
        ])->save();

        $token = $this->gerarToken($usuario->fresh(['empresa', 'empresas']), $deviceName);

        $this->auditLogger->log(
            usuario: $usuario,
            evento: AuditoriaEventoEnum::LOGIN->value,
            entidade: 'auth.login',
            empresaId: $empresaAtual?->id ?? $usuario->empresa_id,
            dadosNovos: ['email' => $usuario->email, 'empresa_id' => $empresaAtual?->id, 'origem' => 'NWB_ID', 'nwb_sub' => $identidade->sub],
            descricao: 'Login realizado pelo NWB ID.',
        );

        return [
            'token' => $token,
            'usuario' => $usuario->fresh(['empresa', 'empresas']),
            'empresa_atual' => $empresaAtual,
            'permissoes' => $this->listarPermissoes($usuario, $empresaAtual?->id),
        ];
    }

    /**
     * Cria a conta de quem administra o NWB Asset no NWB Acessos e ainda nao
     * tem cadastro aqui. Sem senha utilizavel: a entrada e so pelo NWB ID.
     */
    private function provisionarAdministrador(NwbIdentidade $identidade): ?Usuario
    {
        $empresaId = config('nwbid.empresa_admin_id');

        if (! $empresaId || $identidade->email === '') {
            return null;
        }

        $empresa = Empresa::query()->find($empresaId);

        if (! $empresa) {
            return null;
        }

        return DB::transaction(function () use ($identidade, $empresa): Usuario {
            $usuario = Usuario::query()->create([
                'empresa_id' => $empresa->id,
                'nome' => mb_substr($identidade->nome, 0, 255),
                'email' => $identidade->email,
                'nwb_sub' => $identidade->sub,
                'auth_origem' => 'NWB',
                'password' => Str::random(48),
                'role' => RoleEnum::ADMIN_EMPRESA->value,
                'ativo' => true,
            ]);

            $usuario->empresas()->attach($empresa->id, [
                'perfil' => RoleEnum::ADMIN_EMPRESA->value,
                'created_at' => now(),
            ]);

            $this->auditLogger->log(
                usuario: $usuario,
                evento: AuditoriaEventoEnum::CRIACAO->value,
                entidade: $usuario,
                empresaId: $empresa->id,
                dadosNovos: ['email' => $usuario->email, 'role' => $usuario->role, 'origem' => 'NWB_ACESSOS_ADMINISTRADOR'],
                descricao: 'Administrador do nwb-asset no NWB Acessos, primeira entrada pelo NWB ID.',
            );

            return $usuario->load(['empresa', 'empresas']);
        });
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
