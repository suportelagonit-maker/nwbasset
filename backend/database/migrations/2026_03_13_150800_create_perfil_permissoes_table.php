<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('perfis_permissoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('perfil_id')->constrained('perfis')->cascadeOnDelete();
            $table->foreignId('permissao_id')->constrained('permissoes')->cascadeOnDelete();

            $table->unique(['perfil_id', 'permissao_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('perfis_permissoes');
    }
};
