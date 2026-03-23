<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bem_patrimonial_documentos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('bem_patrimonial_id')->constrained('bens_patrimoniais')->cascadeOnDelete();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('filial_id')->constrained('filiais')->cascadeOnDelete();
            $table->string('tipo_documento', 40)->default('NOTA_FISCAL');
            $table->string('caminho_arquivo', 255);
            $table->string('nome_original', 180);
            $table->string('mime_type', 120);
            $table->unsignedBigInteger('tamanho_bytes')->default(0);
            $table->timestamps();

            $table->index(['empresa_id', 'bem_patrimonial_id'], 'idx_bem_doc_empresa_bem');
            $table->index(['filial_id', 'bem_patrimonial_id'], 'idx_bem_doc_filial_bem');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bem_patrimonial_documentos');
    }
};
