<?php

namespace Database\Seeders;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\AssetRegistry\Models\PlaquetaPatrimonial;
use App\Domain\AssetRegistry\Services\PlaquetaPatrimonialService;
use Illuminate\Database\Seeder;

class NwbAssetPlaquetasSeeder extends Seeder
{
    public function run(): void
    {
        $service = app(PlaquetaPatrimonialService::class);

        BemPatrimonial::query()
            ->orderBy('numero_tombo')
            ->get()
            ->each(function (BemPatrimonial $bem, int $index) use ($service): void {
                $possuiPlaqueta = PlaquetaPatrimonial::query()
                    ->where('bem_patrimonial_id', $bem->id)
                    ->exists();

                if ($possuiPlaqueta) {
                    return;
                }

                $service->criarPlaquetaParaBem([
                    'bem_patrimonial_id' => $bem->id,
                    'empresa_id' => $bem->empresa_id,
                    'filial_id' => $bem->filial_id,
                    'codigo_plaqueta' => sprintf('PLQ-DEMO-%04d', $index + 1),
                    'status' => $index === 0 ? 'APLICADA' : 'GERADA',
                    'data_geracao' => now()->toDateString(),
                    'data_aplicacao' => $index === 0 ? now()->toDateString() : null,
                    'observacoes' => 'Plaqueta demo gerada automaticamente para o bem patrimonial.',
                ]);
            });
    }
}
