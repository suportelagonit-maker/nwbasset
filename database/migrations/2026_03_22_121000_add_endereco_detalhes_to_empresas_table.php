<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('empresas', function (Blueprint $table): void {
            $table->string('cep', 10)->nullable()->after('telefone');
            $table->string('endereco', 255)->nullable()->after('cep');
            $table->string('numero', 30)->nullable()->after('endereco');
            $table->string('complemento', 120)->nullable()->after('numero');
            $table->string('bairro', 120)->nullable()->after('complemento');
            $table->string('cidade', 120)->nullable()->after('bairro');
            $table->string('estado', 2)->nullable()->after('cidade');
        });
    }

    public function down(): void
    {
        Schema::table('empresas', function (Blueprint $table): void {
            $table->dropColumn(['cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado']);
        });
    }
};
