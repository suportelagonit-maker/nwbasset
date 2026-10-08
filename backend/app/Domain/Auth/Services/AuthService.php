<?php

namespace App\Domain\Auth\Services;

use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Auth\DTOs\LoginData;
use App\Domain\Auth\DTOs\NwbIdentidade;
use App\Domain\Auth\Enums\RoleEnum;
use App\Domain\Auth\Models\RolePermissao;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Notifications\Services\AvisoAcessoService;
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
        if (! $this->nwbIdService->loginSenhaPermitido()) {
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

        $this->avisarAcesso($usuario, $empresaAtual?->id ?? $usuario->empresa_id, false);

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
     * quem administra o sistema no Acessos. A IDENTIDADE VEM DO NWB ID: a
     * conta local e encontrada pelo "sub" (ou pelo e-mail, na primeira
     * entrada) e, quando nao existe, NASCE AQUI com os dados do NWB ID — sem
     * cadastro manual. O perfil e que continua sendo decisao do NWB Asset:
     * quem administra o sistema no Acessos entra como dono, os demais com o
     * perfil padrao, ajustavel em Administracao > Usuarios.
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

        $contaRecemCriada = false;

        if (! $usuario) {
            $usuario = $this->provisionarDoNwbId($identidade, $administra);
            $contaRecemCriada = $usuario !== null;
        }

        if (! $usuario) {
            throw new AccessDeniedHttpException('Nao foi possivel criar seu acesso automaticamente: o NWB Asset esta sem empresa padrao configurada. Procure o administrador do sistema.');
        }

        if (! $usuario->ativo) {
            throw new AccessDeniedHttpException('Usuario inativo. Procure o administrador.');
        }

        $empresaAtual = $this->resolveEmpresaAtual($usuario);

        $usuario->forceFill([
            'nwb_sub' => $identidade->sub,
            'auth_origem' => 'NWB',
            // O NWB ID e a fonte do nome da pessoa: se mudou la, muda aqui.
            'nome' => $identidade->nome !== '' ? mb_substr($identidade->nome, 0, 255) : $usuario->nome,
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

        $this->avisarAcesso($usuario, $empresaAtual?->id ?? $usuario->empresa_id, $contaRecemCriada);

        return [
            'token' => $token,
            'usuario' => $usuario->fresh(['empresa', 'empresas']),
            'empresa_atual' => $empresaAtual,
            'permissoes' => $this->listarPermissoes($usuario, $empresaAtual?->id),
        ];
    }

    /**
     * Cria a conta de quem o NWB Acessos liberou e ainda nao tem cadastro
     * aqui, com os dados do NWB ID. Sem senha utilizavel: a entrada e so pelo
     * NWB ID. Devolve null quando nao ha empresa padrao configurada ou o token
     * veio sem e-mail — ai a pessoa recebe a orientacao de procurar o
     * administrador.
     */
    private function provisionarDoNwbId(NwbIdentidade $identidade, bool $administra): ?Usuario
    {
        $empresaId = config('nwbid.empresa_padrao_id');

        if (! $empresaId || $identidade->email === '') {
            return null;
        }

        $empresa = Empresa::query()->find($empresaId);

        if (! $empresa) {
            return null;
        }

        $perfil = $this->perfilDeProvisionamento($administra);

        return DB::transaction(function () use ($identidade, $empresa, $perfil, $administra): Usuario {
            $usuario = Usuario::query()->create([
                'empresa_id' => $empresa->id,
                'nome' => mb_substr($identidade->nome, 0, 255),
                'email' => $identidade->email,
                'nwb_sub' => $identidade->sub,
                'auth_origem' => 'NWB',
                'password' => Str::random(48),
                'role' => $perfil,
                'ativo' => true,
            ]);

            $usuario->empresas()->attach($empresa->id, [
                'perfil' => $perfil,
                'created_at' => now(),
            ]);

            $origem = $administra ? 'NWB_ACESSOS_ADMINISTRADOR' : 'NWB_ACESSOS_CONCESSAO';

            $this->auditLogger->log(
                usuario: $usuario,
                evento: AuditoriaEventoEnum::CRIACAO->value,
                entidade: $usuario,
                empresaId: $empresa->id,
                dadosNovos: ['email' => $usuario->email, 'role' => $perfil, 'origem' => $origem, 'nwb_sub' => $identidade->sub],
                descricao: $administra
                    ? 'Administrador do nwb-asset no NWB Acessos, conta criada na primeira entrada pelo NWB ID.'
                    : 'Liberado no NWB Acessos, conta criada na primeira entrada pelo NWB ID.',
            );

            return $usuario->load(['empresa', 'empresas']);
        });
    }

    /** Perfil da conta recem-criada, com o configurado validado contra os papeis existentes. */
    private function perfilDeProvisionamento(bool $administra): string
    {
        $configurado = (string) config($administra ? 'nwbid.perfil_admin' : 'nwbid.perfil_padrao');
        $padrao = $administra ? RoleEnum::SUPER_ADMIN : RoleEnum::AUDITOR;

        return RoleEnum::tryFrom($configurado)?->value ?? $padrao->value;
    }

    /**
     * Avisos de acesso (push), depois que a resposta ja foi enviada.
     *
     * defer() garante que a entrada nao espere pelo servico de push do
     * navegador — e, se algo falhar la, ninguem fica sem conseguir entrar.
     */
    private function avisarAcesso(Usuario $usuario, ?int $empresaId, bool $contaRecemCriada): void
    {
        $requisicao = request();
        $ip = $requisicao?->ip();
        $userAgent = $requisicao?->userAgent();
        $usuarioId = $usuario->id;

        defer(function () use ($usuarioId, $ip, $userAgent, $contaRecemCriada, $empresaId): void {
            $usuario = Usuario::query()->find($usuarioId);

            if ($usuario === null) {
                return;
            }

            app(AvisoAcessoService::class)->registrarLogin(
                $usuario,
                $ip,
                $userAgent,
                $contaRecemCriada,
                $empresaId,
            );
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
