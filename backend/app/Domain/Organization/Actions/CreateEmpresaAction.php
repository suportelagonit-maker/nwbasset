<?php

namespace App\Domain\Organization\Actions;

use App\Domain\Administration\Models\Perfil;
use App\Domain\Administration\Services\PermissionCatalogService;
use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Organization\DTOs\EmpresaData;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Support\FilialCodigoManager;
use App\Domain\Shared\Enums\StatusRegistroEnum;
use App\Domain\Shared\Services\CodigoCadastroService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreateEmpresaAction
{
    public function __construct(
        private readonly PermissionCatalogService $permissionCatalogService,
        private readonly AuditLogger $auditLogger,
        private readonly CodigoCadastroService $codigoCadastroService,
        private readonly FilialCodigoManager $filialCodigoManager,
    ) {
    }

    public function execute(EmpresaData $data, ?Usuario $actor = null): Empresa
    {
        return DB::transaction(function () use ($data, $actor): Empresa {
            $empresa = Empresa::query()->create([
                ...$data->attributes,
                'status' => $data->attributes['status'] ?? StatusRegistroEnum::ATIVO->value,
            ]);

            $this->codigoCadastroService->aplicar($empresa, 'EMP');

            $matriz = Filial::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => 'TMP-' . Str::upper(Str::random(10)),
                'nome' => $data->matrizNome ?? $empresa->nome_fantasia,
                'cnpj' => $empresa->cnpj,
                'matriz' => true,
                'endereco' => $data->matrizEndereco['endereco'] ?? null,
                'cep' => $data->matrizEndereco['cep'] ?? null,
                'numero' => $data->matrizEndereco['numero'] ?? null,
                'complemento' => $data->matrizEndereco['complemento'] ?? null,
                'bairro' => $data->matrizEndereco['bairro'] ?? null,
                'cidade' => $data->matrizEndereco['cidade'] ?? null,
                'estado' => $data->matrizEndereco['estado'] ?? null,
                'status' => StatusRegistroEnum::ATIVO->value,
            ]);

            $this->filialCodigoManager->aplicar($matriz);

            $permissoes = $this->permissionCatalogService->createForEmpresa($empresa);

            $perfilAdmin = Perfil::query()->create([
                'nome' => 'Administrador',
                'descricao' => 'Perfil administrativo padrao da empresa.',
            ]);

            $perfilAdmin->permissoes()->sync($permissoes->pluck('id')->all());

            if ($actor !== null) {
                $actor->empresas()->syncWithoutDetaching([
                    $empresa->id => [
                        'perfil' => 'ADMIN_EMPRESA',
                    ],
                ]);

                if ($actor->empresa_id === null) {
                    $actor->update(['empresa_id' => $empresa->id]);
                }

                $this->auditLogger->log(
                    usuario: $actor,
                    evento: AuditoriaEventoEnum::CRIACAO->value,
                    entidade: $empresa,
                    empresaId: $empresa->id,
                    dadosNovos: $empresa->toArray(),
                    descricao: 'Empresa cadastrada.',
                );
            }

            return $empresa->load(['filiais', 'usuarios']);
        });
    }
}
