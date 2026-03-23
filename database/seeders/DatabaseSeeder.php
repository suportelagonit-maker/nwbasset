<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            NwbAssetAuthSeeder::class,
            NwbAssetCoreSeeder::class,
            NwbAssetOrganizationSeeder::class,
            NwbAssetAssetRegistrySeeder::class,
            NwbAssetPlaquetasSeeder::class,
            NwbAssetAssetMovementsSeeder::class,
            NwbAssetDepreciationSeeder::class,
            NwbAssetInventorySeeder::class,
        ]);
    }
}
