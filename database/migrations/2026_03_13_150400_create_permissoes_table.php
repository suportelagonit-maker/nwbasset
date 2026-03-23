<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permissoes', function (Blueprint $table): void {
            $table->id();
            $table->string('nome', 150);
            $table->string('chave', 120)->unique();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permissoes');
    }
};
