<?php

namespace Database\Seeders;

use App\Domain\Auth\Enums\RoleEnum;
use App\Domain\Auth\Models\Usuario;
use App\Domain\MultiCompany\Models\UsuarioEmpresa;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use App\Domain\Shared\Services\CodigoCadastroService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class NwbAssetCoreSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $empresa = Empresa::query()->create(
                [
                    'razao_social' => 'NWB Asset Administracao Patrimonial Ltda',
                    'nome_fantasia' => 'NWB Asset',
                    'cnpj' => '00.000.000/0001-91',
                    'inscricao_estadual' => 'ISENTO',
                    'email' => 'contato@nwbasset.local',
                    'telefone' => '(11) 4000-5000',
                    'status' => 'ativo',
                ],
            );

            app(CodigoCadastroService::class)->aplicar($empresa, 'EMP');

            $filial = Filial::query()->create(
                [
                    'empresa_id' => $empresa->id,
                    'nome' => 'NWB Asset',
                    'codigo' => 'TMP-'.Str::upper(Str::random(10)),
                    'cnpj' => '00.000.000/0001-91',
                    'matriz' => true,
                    'endereco' => 'Rua Demo, 100',
                    'cidade' => 'Sao Paulo',
                    'estado' => 'SP',
                    'status' => 'ativo',
                ],
            );

            app(CodigoCadastroService::class)->aplicar($filial, 'FIL');

            $usuario = Usuario::query()->create(
                [
                    'empresa_id' => $empresa->id,
                    'nome' => 'Administrador NWB Asset',
                    'email' => 'admin@nwbasset.local',
                    'password' => 'NwbAsset@123',
                    'role' => RoleEnum::SUPER_ADMIN->value,
                    'ativo' => true,
                ],
            );

            UsuarioEmpresa::query()->create([
                'usuario_id' => $usuario->id,
                'empresa_id' => $empresa->id,
                'perfil' => RoleEnum::SUPER_ADMIN->value,
            ]);
        });
    }
}
