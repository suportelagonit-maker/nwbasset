<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('regras_depreciacao_tipos_bens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->string('tipo_bem', 120);
            $table->foreignId('metodo_depreciacao_id')->constrained('metodos_depreciacao')->cascadeOnDelete();
            $table->unsignedInteger('vida_util_anos');
            $table->decimal('taxa_anual', 8, 4);
            $table->timestamps();

            $table->unique(['empresa_id', 'tipo_bem']);
            $table->index(['empresa_id', 'metodo_depreciacao_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('regras_depreciacao_tipos_bens');
    }
};

