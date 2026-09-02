<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles_permissoes', function (Blueprint $table): void {
            $table->id();
            $table->string('role', 40);
            $table->string('permissao', 120);

            $table->unique(['role', 'permissao']);
            $table->index('role');
            $table->index('permissao');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('roles_permissoes');
    }
};
