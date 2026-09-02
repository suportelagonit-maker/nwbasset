<?php

namespace Database\Seeders;

use App\Domain\Inventory\Enums\InventarioStatusEnum;
use App\Domain\Inventory\Models\Inventario;
use App\Domain\Inventory\Services\InventarioService;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use Illuminate\Database\Seeder;

class NwbAssetInventorySeeder extends Seeder
{
    public function run(): void
    {
        $empresa = Empresa::query()->where('cnpj', '00.000.000/0001-91')->first();
        $filial = Filial::query()->where('empresa_id', $empresa?->id)->where('matriz', true)->first();

        if (! $empresa || ! $filial) {
            return;
        }

        $inventarioExistente = Inventario::query()
            ->where('empresa_id', $empresa->id)
            ->where('nome', 'Inventario Demo Patrimonial')
            ->first();

        if ($inventarioExistente) {
            return;
        }

        app(InventarioService::class)->criarInventario([
            'empresa_id' => $empresa->id,
            'filial_id' => $filial->id,
            'nome' => 'Inventario Demo Patrimonial',
            'data_inicio' => '2026-03-01',
            'data_fim' => null,
            'status' => InventarioStatusEnum::ABERTO->value,
        ]);
    }
}
