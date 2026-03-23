<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auditorias_patrimoniais', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('inventario_id')->constrained('inventarios')->cascadeOnDelete();
            $table->date('data_auditoria');
            $table->string('auditor', 180);
            $table->text('observacoes')->nullable();
            $table->timestamps();

            $table->index(['empresa_id', 'data_auditoria']);
            $table->index('inventario_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auditorias_patrimoniais');
    }
};
