<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('DROP INDEX IF EXISTS uq_plaquetas_bem_ativa');

        Schema::table('plaquetas_patrimoniais', function (Blueprint $table): void {
            $table->foreignId('bem_patrimonial_id')->nullable()->change();
            $table->foreignId('filial_id')->nullable()->change();
        });

        DB::statement("
            CREATE UNIQUE INDEX uq_plaquetas_bem_ativa
            ON plaquetas_patrimoniais (bem_patrimonial_id)
            WHERE bem_patrimonial_id IS NOT NULL AND status IN ('GERADA', 'APLICADA', 'VINCULADA')
        ");
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS uq_plaquetas_bem_ativa');

        Schema::table('plaquetas_patrimoniais', function (Blueprint $table): void {
            $table->foreignId('bem_patrimonial_id')->nullable(false)->change();
            $table->foreignId('filial_id')->nullable(false)->change();
        });

        DB::statement("
            CREATE UNIQUE INDEX uq_plaquetas_bem_ativa
            ON plaquetas_patrimoniais (bem_patrimonial_id)
            WHERE status IN ('GERADA', 'APLICADA')
        ");
    }
};
