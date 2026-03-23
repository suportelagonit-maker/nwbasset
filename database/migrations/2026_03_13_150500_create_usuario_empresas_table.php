<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usuarios_empresas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->string('perfil', 60)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['usuario_id', 'empresa_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usuarios_empresas');
    }
};
