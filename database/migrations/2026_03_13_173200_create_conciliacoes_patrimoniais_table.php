<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conciliacoes_patrimoniais', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('inventario_id')->constrained('inventarios')->cascadeOnDelete();
            $table->unsignedInteger('total_bens_sistema')->default(0);
            $table->unsignedInteger('total_bens_encontrados')->default(0);
            $table->unsignedInteger('divergencias')->default(0);
            $table->date('data_conciliacao');
            $table->timestamps();

            $table->unique('inventario_id');
            $table->index(['data_conciliacao', 'divergencias']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conciliacoes_patrimoniais');
    }
};
