<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('filiais') || ! Schema::hasColumn('filiais', 'codigo')) {
            return;
        }

        DB::table('filiais')
            ->orderBy('id')
            ->get(['id', 'matriz'])
            ->each(function (object $filial): void {
                DB::table('filiais')
                    ->where('id', $filial->id)
                    ->update([
                        'codigo' => sprintf('%s-%06d', $filial->matriz ? 'MAT' : 'FIL', $filial->id),
                    ]);
            });
    }

    public function down(): void
    {
        if (! Schema::hasTable('filiais') || ! Schema::hasColumn('filiais', 'codigo')) {
            return;
        }

        DB::table('filiais')
            ->orderBy('id')
            ->get(['id'])
            ->each(function (object $filial): void {
                DB::table('filiais')
                    ->where('id', $filial->id)
                    ->update([
                        'codigo' => sprintf('FIL-%06d', $filial->id),
                    ]);
            });
    }
};
