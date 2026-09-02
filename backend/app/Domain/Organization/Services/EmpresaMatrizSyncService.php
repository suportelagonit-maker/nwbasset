<?php

namespace App\Domain\Organization\Services;

use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class EmpresaMatrizSyncService
{
    public function sync(Empresa $empresa): void
    {
        $matriz = $empresa->filiais()->where('matriz', true)->first();

        if (! $matriz) {
            return;
        }

        if ($this->hasEnderecoData($empresa)) {
            $this->syncMatrizFromEmpresa($empresa, $matriz);

            return;
        }

        if ($this->hasEnderecoData($matriz)) {
            $this->syncEmpresaFromMatriz($empresa, $matriz);

            return;
        }

        $dados = $this->consultarCnpj($empresa->cnpj);

        if (! $dados) {
            return;
        }

        DB::transaction(function () use ($empresa, $matriz, $dados): void {
            $empresa->fill($dados)->save();
            $matriz->fill($dados)->save();
        });
    }

    private function syncMatrizFromEmpresa(Empresa $empresa, Filial $matriz): void
    {
        $dados = $this->extractEnderecoData($empresa);

        if ($dados === []) {
            return;
        }

        $matriz->fill($dados)->save();
    }

    private function syncEmpresaFromMatriz(Empresa $empresa, Filial $matriz): void
    {
        $dados = $this->extractEnderecoData($matriz);

        if ($dados === []) {
            return;
        }

        $empresa->fill($dados)->save();
    }

    private function extractEnderecoData(Empresa|Filial $model): array
    {
        return array_filter([
            'cep' => $model->cep,
            'endereco' => $model->endereco,
            'numero' => $model->numero,
            'complemento' => $model->complemento,
            'bairro' => $model->bairro,
            'cidade' => $model->cidade,
            'estado' => $model->estado,
        ], static fn ($value) => $value !== null && $value !== '');
    }

    private function hasEnderecoData(Empresa|Filial $model): bool
    {
        return $this->extractEnderecoData($model) !== [];
    }

    private function consultarCnpj(?string $cnpj): ?array
    {
        $digits = preg_replace('/\D+/', '', (string) $cnpj);

        if (strlen($digits) !== 14) {
            return null;
        }

        try {
            $response = Http::acceptJson()
                ->withUserAgent('NWB-Asset/1.0')
                ->get("https://brasilapi.com.br/api/cnpj/v1/{$digits}");
        } catch (\Throwable) {
            return null;
        }

        if (! $response->successful()) {
            return null;
        }

        $body = $response->json();

        if (! is_array($body)) {
            return null;
        }

        return [
            'cep' => (string) ($body['cep'] ?? ''),
            'endereco' => (string) ($body['logradouro'] ?? ''),
            'numero' => (string) ($body['numero'] ?? ''),
            'complemento' => (string) ($body['complemento'] ?? ''),
            'bairro' => (string) ($body['bairro'] ?? ''),
            'cidade' => (string) ($body['municipio'] ?? ''),
            'estado' => (string) ($body['uf'] ?? ''),
        ];
    }
}
