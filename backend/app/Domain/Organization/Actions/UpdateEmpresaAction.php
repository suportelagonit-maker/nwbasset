<?php

namespace App\Domain\Organization\Actions;

use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Organization\DTOs\EmpresaData;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;

class UpdateEmpresaAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public function execute(Empresa $empresa, EmpresaData $data, Usuario $actor): Empresa
    {
        $dadosAnteriores = $empresa->toArray();
        $empresa->fill(array_diff_key($data->attributes, ['codigo' => true]))->save();

        /** @var Filial|null $matriz */
        $matriz = $empresa->filiais()->where('matriz', true)->first();

        if ($matriz !== null) {
            $camposMatriz = [];

            if ($data->matrizNome !== null) {
                $camposMatriz['nome'] = $data->matrizNome;
            }

            foreach (['endereco', 'cep', 'numero', 'complemento', 'bairro', 'cidade', 'estado'] as $campo) {
                if (array_key_exists($campo, $data->matrizEndereco)) {
                    $camposMatriz[$campo] = $data->matrizEndereco[$campo];
                }
            }

            $camposMatriz['cnpj'] = $empresa->cnpj;

            if ($camposMatriz !== []) {
                $matriz->fill($camposMatriz)->save();
            }
        }

        $this->auditLogger->log(
            usuario: $actor,
            evento: AuditoriaEventoEnum::ATUALIZACAO->value,
            entidade: $empresa,
            empresaId: $empresa->id,
            dadosAnteriores: $dadosAnteriores,
            dadosNovos: $empresa->fresh()->toArray(),
            descricao: 'Empresa atualizada.',
        );

        return $empresa->fresh(['filiais', 'usuarios']);
    }
}
