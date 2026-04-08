<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tipos_produtos')) {
            return;
        }

        Schema::create('tipos_produtos', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('empresa_id');
            $table->unsignedBigInteger('tipo_bem_id')->nullable();
            $table->string('nome', 150);
            $table->string('descricao', 500)->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();

            $table->index(['empresa_id', 'tipo_bem_id']);
            $table->index(['empresa_id', 'nome']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tipos_produtos');
    }
};
