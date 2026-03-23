<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plaquetas_patrimoniais', function (Blueprint $table): void {
            $table->string('numero_plaqueta', 20)->nullable()->after('codigo_plaqueta');
            $table->string('codigo_barras_conteudo', 120)->nullable()->after('numero_plaqueta');
            $table->string('link_consulta', 255)->nullable()->after('codigo_barras_conteudo');
        });

        DB::table('plaquetas_patrimoniais')
            ->orderBy('empresa_id')
            ->orderBy('id')
            ->get()
            ->groupBy('empresa_id')
            ->each(function ($plaquetas): void {
                $sequencia = 1;

                foreach ($plaquetas as $plaqueta) {
                    $numeroPlaqueta = str_pad((string) $sequencia, 4, '0', STR_PAD_LEFT);
                    $codigoPlaqueta = $plaqueta->codigo_plaqueta ?: $numeroPlaqueta;
                    $codigoBarras = sprintf('PAT-%d-%s', $plaqueta->empresa_id, $numeroPlaqueta);
                    $linkConsulta = rtrim(env('FRONTEND_PUBLIC_URL', 'http://localhost:5001'), '/') . '/patrimonio/consulta?codigo=' . urlencode($codigoBarras);

                    DB::table('plaquetas_patrimoniais')
                        ->where('id', $plaqueta->id)
                        ->update([
                            'numero_plaqueta' => $numeroPlaqueta,
                            'codigo_plaqueta' => $codigoPlaqueta,
                            'codigo_barras_conteudo' => $codigoBarras,
                            'link_consulta' => $linkConsulta,
                            'qr_code_conteudo' => $linkConsulta,
                        ]);

                    $sequencia++;
                }
            });

        DB::statement('ALTER TABLE plaquetas_patrimoniais ALTER COLUMN numero_plaqueta SET NOT NULL');
        DB::statement('ALTER TABLE plaquetas_patrimoniais ALTER COLUMN codigo_barras_conteudo SET NOT NULL');
        DB::statement('ALTER TABLE plaquetas_patrimoniais ALTER COLUMN link_consulta SET NOT NULL');

        Schema::table('plaquetas_patrimoniais', function (Blueprint $table): void {
            $table->unique(['empresa_id', 'numero_plaqueta'], 'uq_plaquetas_empresa_numero');
            $table->unique(['empresa_id', 'codigo_barras_conteudo'], 'uq_plaquetas_empresa_codigo_barras');
        });
    }

    public function down(): void
    {
        Schema::table('plaquetas_patrimoniais', function (Blueprint $table): void {
            $table->dropUnique('uq_plaquetas_empresa_numero');
            $table->dropUnique('uq_plaquetas_empresa_codigo_barras');
            $table->dropColumn(['numero_plaqueta', 'codigo_barras_conteudo', 'link_consulta']);
        });
    }
};
