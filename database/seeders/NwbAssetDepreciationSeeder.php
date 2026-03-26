<?php

namespace Database\Seeders;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Depreciation\Models\MetodoDepreciacao;
use App\Domain\Depreciation\Models\ParametroDepreciacao;
use App\Domain\Depreciation\Models\RegraDepreciacaoTipoBem;
use App\Domain\Depreciation\Models\TipoBemPatrimonial;
use App\Domain\Depreciation\Services\DepreciacaoService;
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

        foreach (['Informática', 'Mobiliário'] as $tipoPadrao) {
            TipoBemPatrimonial::query()->updateOrCreate([
                'empresa_id' => $empresa->id,
                'nome' => $tipoPadrao,
            ]);
        }

        RegraDepreciacaoTipoBem::query()->updateOrCreate(
            [
                'empresa_id' => $empresa->id,
                'tipo_bem' => 'Informática',
            ],
            [
                'metodo_depreciacao_id' => $metodo->id,
                'vida_util_anos' => 5,
                'taxa_anual' => 20.0000,
                'valor_residual_percentual' => 10.0000,
            ],
        );

        RegraDepreciacaoTipoBem::query()->updateOrCreate(
            [
                'empresa_id' => $empresa->id,
                'tipo_bem' => 'Mobiliário',
            ],
            [
                'metodo_depreciacao_id' => $metodo->id,
                'vida_util_anos' => 10,
                'taxa_anual' => 10.0000,
                'valor_residual_percentual' => 5.0000,
            ],
        );

        $service = app(DepreciacaoService::class);

        BemPatrimonial::query()
            ->where('empresa_id', $empresa->id)
            ->orderBy('numero_tombo')
            ->get()
            ->each(function (BemPatrimonial $bem) use ($service, $metodo, $empresa): void {
                $dataCalculo = ($bem->data_aquisicao?->copy()->endOfYear() ?? now()->endOfYear())->toDateString();

                $jaExiste = $bem->depreciacoes()
                    ->whereDate('data_calculo', $dataCalculo)
                    ->exists();

                if ($jaExiste) {
                    return;
                }

                $service->registrarDepreciacao([
                    'bem_patrimonial_id' => $bem->id,
                    'empresa_id' => $empresa->id,
                    'metodo_depreciacao_id' => $metodo->id,
                    'valor_aquisicao' => (float) $bem->valor_aquisicao,
                    'valor_residual' => (float) $bem->valor_residual,
                    'vida_util_anos' => (int) ($bem->vida_util_anos ?: 5),
                    'data_calculo' => $dataCalculo,
                ]);
            });
    }
}
