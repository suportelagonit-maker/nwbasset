<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('regras_depreciacao_tipos_bens', function (Blueprint $table): void {
            $table->decimal('valor_residual_percentual', 8, 4)
                ->default(0)
                ->after('taxa_anual');
        });
    }

    public function down(): void
    {
        Schema::table('regras_depreciacao_tipos_bens', function (Blueprint $table): void {
            $table->dropColumn('valor_residual_percentual');
        });
    }
};
