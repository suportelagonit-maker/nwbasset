<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

return new class extends Migration
{
    public function up(): void
    {
        $empresas = DB::table('empresas')
            ->whereNull('endereco')
            ->orWhereNull('cidade')
            ->orWhereNull('estado')
            ->get();

        foreach ($empresas as $empresa) {
            $cnpj = preg_replace('/\D+/', '', (string) $empresa->cnpj);

            if (strlen($cnpj) !== 14) {
                continue;
            }

            try {
                $response = Http::acceptJson()
                    ->withUserAgent('NWB-Asset/1.0')
                    ->get("https://brasilapi.com.br/api/cnpj/v1/{$cnpj}");
            } catch (\Throwable) {
                continue;
            }

            if (! $response->successful()) {
                continue;
            }

            $body = $response->json();

            if (! is_array($body)) {
                continue;
            }

            $dados = [
                'cep' => (string) ($body['cep'] ?? ''),
                'endereco' => (string) ($body['logradouro'] ?? ''),
                'numero' => (string) ($body['numero'] ?? ''),
                'complemento' => (string) ($body['complemento'] ?? ''),
                'bairro' => (string) ($body['bairro'] ?? ''),
                'cidade' => (string) ($body['municipio'] ?? ''),
                'estado' => (string) ($body['uf'] ?? ''),
                'updated_at' => now(),
            ];

            DB::table('empresas')
                ->where('id', $empresa->id)
                ->update($dados);

            DB::table('filiais')
                ->where('empresa_id', $empresa->id)
                ->where('matriz', true)
                ->update($dados);
        }
    }

    public function down(): void
    {
        // Retroajuste de dados externos sem reversão segura.
    }
};
