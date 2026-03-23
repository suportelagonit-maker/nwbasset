<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('filiais', function (Blueprint $table): void {
            $table->boolean('matriz')->default(false)->after('cnpj');
        });

        DB::statement("
            WITH ranked AS (
                SELECT
                    id,
                    ROW_NUMBER() OVER (
                        PARTITION BY empresa_id
                        ORDER BY CASE WHEN codigo = 'MATRIZ' THEN 0 ELSE 1 END, id
                    ) AS rn
                FROM filiais
            )
            UPDATE filiais
            SET matriz = CASE WHEN ranked.rn = 1 THEN true ELSE false END
            FROM ranked
            WHERE filiais.id = ranked.id
        ");
    }

    public function down(): void
    {
        Schema::table('filiais', function (Blueprint $table): void {
            $table->dropColumn('matriz');
        });
    }
};
