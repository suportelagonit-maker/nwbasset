<?php

namespace Database\Seeders;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Depreciation\Models\MetodoDepreciacao;
use App\Domain\Depreciation\Models\ParametroDepreciacao;
use App\Domain\Depreciation\Models\RegraDepreciacaoTipoBem;
use App\Domain\Depreciation\Models\TipoBemPatrimonial;
use App\Domain\Depreciation\Services\DepreciacaoService;
use App\Domain\Depreciation\Services\RazaoDepreciacaoService;
use App\Domain\Depreciation\Services\TabelaPadraoDepreciacaoService;
use App\Domain\Organization\Models\Empresa;
use Illuminate\Database\Seeder;

class NwbAssetDepreciationSeeder extends Seeder
{
    public function run(): void
    {
        $metodo = MetodoDepreciacao::query()->firstOrCreate(
            ['codigo' => 'LINHA_RETA'],
            [
                'nome' => 'Linha Reta',
                'descricao' => 'Metodo padrao de depreciacao linear do NWB Asset.',
            ],
        );

        $empresa = Empresa::query()->where('cnpj', '00.000.000/0001-91')->first();

        if (! $empresa) {
            return;
        }

        ParametroDepreciacao::query()->updateOrCreate(
            [
                'empresa_id' => $empresa->id,
                'metodo_depreciacao_id' => $metodo->id,
            ],
            [
                'vida_util_padrao' => 5,
                'taxa_padrao' => 20.0000,
            ],
        );

        // As regras saem da tabela da Receita (Anexo III da IN RFB
        // 1.700/2017), nas bases fiscal e societaria, em vez de duas regras
        // inventadas: a empresa nasce com taxa correta para cada tipo.
        app(TabelaPadraoDepreciacaoService::class)->aplicarNaEmpresa($empresa->id);

        // Apura a depreciacao de todos os bens ate o mes corrente, mes a
        // mes, do jeito que a empresa vai usar no dia a dia.
        app(RazaoDepreciacaoService::class)->processarAte(
            $empresa->id,
            now()->toDateString(),
            'fiscal',
        );
    }
}
