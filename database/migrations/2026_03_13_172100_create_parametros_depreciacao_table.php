<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parametros_depreciacao', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('metodo_depreciacao_id')->constrained('metodos_depreciacao')->cascadeOnDelete();
            $table->unsignedInteger('vida_util_padrao');
            $table->decimal('taxa_padrao', 8, 4);
            $table->timestamps();

            $table->unique(['empresa_id', 'metodo_depreciacao_id']);
            $table->index(['empresa_id', 'vida_util_padrao']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parametros_depreciacao');
    }
};
