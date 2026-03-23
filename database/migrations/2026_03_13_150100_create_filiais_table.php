<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('filiais', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->string('nome', 180);
            $table->string('codigo', 30);
            $table->string('cnpj', 18)->nullable();
            $table->string('endereco', 255)->nullable();
            $table->string('cidade', 120)->nullable();
            $table->string('estado', 2)->nullable();
            $table->string('status', 20)->default('ativo');
            $table->timestamps();

            $table->unique(['empresa_id', 'codigo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('filiais');
    }
};
