<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bem_patrimonial_imagens', function (Blueprint $table): void {
            $table->boolean('principal')->default(false)->after('ordem');
        });

        DB::statement('
            create unique index if not exists idx_bem_img_principal_unico
            on bem_patrimonial_imagens (bem_patrimonial_id)
            where principal = true
        ');
    }

    public function down(): void
    {
        DB::statement('drop index if exists idx_bem_img_principal_unico');

        Schema::table('bem_patrimonial_imagens', function (Blueprint $table): void {
            $table->dropColumn('principal');
        });
    }
};
