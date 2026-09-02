<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventarios', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('filial_id')->constrained('filiais')->cascadeOnDelete();
            $table->string('nome', 180);
            $table->date('data_inicio');
            $table->date('data_fim')->nullable();
            $table->string('status', 20)->default('ABERTO');
            $table->timestamps();

            $table->index(['empresa_id', 'filial_id']);
            $table->index(['status', 'data_inicio']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventarios');
    }
};
