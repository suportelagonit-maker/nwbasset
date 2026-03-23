<?php

namespace Database\Seeders;

use App\Domain\Organization\Models\Departamento;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Models\Local;
use App\Domain\Organization\Models\Responsavel;
use App\Domain\Organization\Models\UnidadeAdministrativa;
use App\Domain\Shared\Services\CodigoCadastroService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class NwbAssetOrganizationSeeder extends Seeder
{
    public function run(): void
    {
        $empresa = Empresa::query()->where('cnpj', '00.000.000/0001-91')->first();
        $filial = Filial::query()->where('empresa_id', $empresa?->id)->where('matriz', true)->first();

        if (! $empresa || ! $filial) {
            return;
        }

        DB::transaction(function () use ($empresa, $filial): void {
            $unidade = UnidadeAdministrativa::query()->create([
                'empresa_id' => $empresa->id,
                'filial_id' => $filial->id,
                'nome' => 'Administracao Patrimonial',
                'codigo' => 'TMP-'.Str::upper(Str::random(10)),
                'descricao' => 'Unidade administrativa principal da empresa demo.',
                'status' => 'ativo',
            ]);

            app(CodigoCadastroService::class)->aplicar($unidade, 'UAD');

            $departamento = Departamento::query()->create([
                'empresa_id' => $empresa->id,
                'filial_id' => $filial->id,
                'unidade_administrativa_id' => $unidade->id,
                'nome' => 'Controle Patrimonial',
                'codigo' => 'TMP-'.Str::upper(Str::random(10)),
                'descricao' => 'Departamento responsável pelo controle dos bens.',
                'status' => 'ativo',
            ]);

            app(CodigoCadastroService::class)->aplicar($departamento, 'DEP');

            $local = Local::query()->create([
                'empresa_id' => $empresa->id,
                'filial_id' => $filial->id,
                'unidade_administrativa_id' => $unidade->id,
                'departamento_id' => $departamento->id,
                'nome' => 'Sala do Patrimonio',
                'codigo' => 'TMP-'.Str::upper(Str::random(10)),
                'endereco' => 'Rua Demo, 100 - 1 Andar',
                'descricao' => 'Local físico inicial para alocação patrimonial.',
                'status' => 'ativo',
            ]);

            app(CodigoCadastroService::class)->aplicar($local, 'LOC');

            Responsavel::query()->create([
                'empresa_id' => $empresa->id,
                'filial_id' => $filial->id,
                'nome' => 'Maria Gestora',
                'matricula' => 'MAT-001',
                'cpf' => '123.456.789-00',
                'email' => 'maria.gestora@nwbasset.local',
                'telefone' => '(11) 98888-0001',
                'cargo' => 'Coordenadora Patrimonial',
                'status' => 'ativo',
            ]);
        });
    }
}
