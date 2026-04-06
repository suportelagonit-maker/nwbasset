<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('responsaveis', 'departamento_id')) {
            Schema::table('responsaveis', function (Blueprint $table): void {
                $table->foreignId('departamento_id')
                    ->nullable()
                    ->after('filial_id')
                    ->constrained('departamentos')
                    ->nullOnDelete();

                $table->index(
                    ['empresa_id', 'filial_id', 'departamento_id'],
                    'idx_responsaveis_contexto_departamento'
                );
            });
        }

        DB::statement("
            UPDATE responsaveis r
            SET departamento_id = (
                SELECT d.id
                FROM departamentos d
                WHERE d.empresa_id = r.empresa_id
                  AND d.filial_id = r.filial_id
                ORDER BY d.id ASC
                LIMIT 1
            )
            WHERE r.departamento_id IS NULL
              AND EXISTS (
                  SELECT 1
                  FROM departamentos d2
                  WHERE d2.empresa_id = r.empresa_id
                    AND d2.filial_id = r.filial_id
              )
        ");
    }

    public function down(): void
    {
        if (! Schema::hasColumn('responsaveis', 'departamento_id')) {
            return;
        }

        Schema::table('responsaveis', function (Blueprint $table): void {
            $table->dropIndex('idx_responsaveis_contexto_departamento');
            $table->dropConstrainedForeignId('departamento_id');
        });
    }
};
