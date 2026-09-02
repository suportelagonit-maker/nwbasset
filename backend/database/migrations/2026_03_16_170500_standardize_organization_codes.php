<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('empresas', 'codigo')) {
            Schema::table('empresas', function (Blueprint $table): void {
                $table->string('codigo', 30)->nullable()->after('id');
            });
        }

        $this->temporaryCodes('filiais', 'TMP-FIL-');
        $this->temporaryCodes('unidades_administrativas', 'TMP-UAD-');
        $this->temporaryCodes('departamentos', 'TMP-DEP-');
        $this->temporaryCodes('locais', 'TMP-LOC-');

        $this->applyCodes('empresas', 'EMP');
        $this->applyCodes('filiais', 'FIL');
        $this->applyCodes('unidades_administrativas', 'UAD');
        $this->applyCodes('departamentos', 'DEP');
        $this->applyCodes('locais', 'LOC');

        Schema::table('empresas', function (Blueprint $table): void {
            $table->unique('codigo');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('empresas', 'codigo')) {
            Schema::table('empresas', function (Blueprint $table): void {
                $table->dropUnique(['codigo']);
                $table->dropColumn('codigo');
            });
        }
    }

    private function temporaryCodes(string $table, string $prefix): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'codigo')) {
            return;
        }

        DB::table($table)
            ->orderBy('id')
            ->get(['id'])
            ->each(function (object $record) use ($table, $prefix): void {
                DB::table($table)
                    ->where('id', $record->id)
                    ->update(['codigo' => $prefix.$record->id]);
            });
    }

    private function applyCodes(string $table, string $prefix): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'codigo')) {
            return;
        }

        DB::table($table)
            ->orderBy('id')
            ->get(['id'])
            ->each(function (object $record) use ($table, $prefix): void {
                DB::table($table)
                    ->where('id', $record->id)
                    ->update(['codigo' => sprintf('%s-%06d', $prefix, $record->id)]);
            });
    }
};
