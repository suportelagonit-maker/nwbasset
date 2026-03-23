<?php

namespace Database\Seeders;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Organization\Models\Departamento;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Models\Local;
use App\Domain\Organization\Models\Responsavel;
use App\Domain\Organization\Models\UnidadeAdministrativa;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class NwbAssetAssetRegistrySeeder extends Seeder
{
    public function run(): void
    {
        $empresa = Empresa::query()->where('cnpj', '00.000.000/0001-91')->first();
        $filial = Filial::query()->where('empresa_id', $empresa?->id)->where('matriz', true)->first();
        $unidade = UnidadeAdministrativa::query()->where('empresa_id', $empresa?->id)->where('nome', 'Administracao Patrimonial')->first();
        $departamento = Departamento::query()->where('empresa_id', $empresa?->id)->where('nome', 'Controle Patrimonial')->first();
        $local = Local::query()->where('empresa_id', $empresa?->id)->where('nome', 'Sala do Patrimonio')->first();
        $responsavel = Responsavel::query()->where('empresa_id', $empresa?->id)->where('matricula', 'MAT-001')->first();

        if (! $empresa || ! $filial || ! $unidade || ! $departamento || ! $local) {
            return;
        }

        $bens = [
            [
                'numero_tombo' => 'TOMBO-0001',
                'numero_serie' => 'SN-NB-001',
                'descricao' => 'Notebook corporativo Dell Latitude',
                'categoria' => 'Informática',
                'marca' => 'Dell',
                'modelo' => 'Latitude 5440',
                'data_aquisicao' => '2025-01-15',
                'valor_aquisicao' => 6500.00,
                'valor_residual' => 650.00,
                'vida_util_anos' => 5,
                'status_bem' => 'ativo',
                'estado_conservacao' => 'otimo',
            ],
            [
                'numero_tombo' => 'TOMBO-0002',
                'numero_serie' => 'SN-MON-002',
                'descricao' => 'Monitor LED 27 polegadas',
                'categoria' => 'Informática',
                'marca' => 'LG',
                'modelo' => '27UL500',
                'data_aquisicao' => '2025-02-10',
                'valor_aquisicao' => 1800.00,
                'valor_residual' => 180.00,
                'vida_util_anos' => 5,
                'status_bem' => 'ativo',
                'estado_conservacao' => 'bom',
            ],
            [
                'numero_tombo' => 'TOMBO-0003',
                'numero_serie' => 'SN-CAD-003',
                'descricao' => 'Cadeira ergonômica diretor',
                'categoria' => 'Mobiliário',
                'marca' => 'Flexform',
                'modelo' => 'Ergo Pro',
                'data_aquisicao' => '2025-03-05',
                'valor_aquisicao' => 2400.00,
                'valor_residual' => 240.00,
                'vida_util_anos' => 10,
                'status_bem' => 'ativo',
                'estado_conservacao' => 'bom',
            ],
        ];

        DB::transaction(function () use ($empresa, $filial, $unidade, $departamento, $local, $responsavel, $bens): void {
            foreach ($bens as $bem) {
                BemPatrimonial::query()->create([
                    'empresa_id' => $empresa->id,
                    'filial_id' => $filial->id,
                    'unidade_administrativa_id' => $unidade->id,
                    'departamento_id' => $departamento->id,
                    'local_id' => $local->id,
                    'responsavel_id' => $responsavel?->id,
                    ...$bem,
                ]);
            }
        });
    }
}
