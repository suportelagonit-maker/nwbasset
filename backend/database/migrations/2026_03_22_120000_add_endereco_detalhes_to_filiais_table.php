<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('filiais', function (Blueprint $table): void {
            $table->string('cep', 10)->nullable()->after('endereco');
            $table->string('numero', 30)->nullable()->after('cep');
            $table->string('complemento', 120)->nullable()->after('numero');
            $table->string('bairro', 120)->nullable()->after('complemento');
        });
    }

    public function down(): void
    {
        Schema::table('filiais', function (Blueprint $table): void {
            $table->dropColumn(['cep', 'numero', 'complemento', 'bairro']);
        });
    }
};
