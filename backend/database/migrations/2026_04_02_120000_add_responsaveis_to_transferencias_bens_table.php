<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transferencias_bens', function (Blueprint $table): void {
            if (! Schema::hasColumn('transferencias_bens', 'origem_responsavel_id')) {
                $table->foreignId('origem_responsavel_id')
                    ->nullable()
                    ->after('origem_local_id')
                    ->constrained('responsaveis')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('transferencias_bens', 'destino_responsavel_id')) {
                $table->foreignId('destino_responsavel_id')
                    ->nullable()
                    ->after('destino_local_id')
                    ->constrained('responsaveis')
                    ->nullOnDelete();
            }

            $table->index(
                ['origem_responsavel_id', 'destino_responsavel_id'],
                'idx_transf_origem_destino_responsavel',
            );
        });
    }

    public function down(): void
    {
        Schema::table('transferencias_bens', function (Blueprint $table): void {
            if (Schema::hasColumn('transferencias_bens', 'origem_responsavel_id')) {
                $table->dropForeign(['origem_responsavel_id']);
            }
            if (Schema::hasColumn('transferencias_bens', 'destino_responsavel_id')) {
                $table->dropForeign(['destino_responsavel_id']);
            }

            $table->dropIndex('idx_transf_origem_destino_responsavel');

            if (Schema::hasColumn('transferencias_bens', 'origem_responsavel_id')) {
                $table->dropColumn('origem_responsavel_id');
            }
            if (Schema::hasColumn('transferencias_bens', 'destino_responsavel_id')) {
                $table->dropColumn('destino_responsavel_id');
            }
        });
    }
};

