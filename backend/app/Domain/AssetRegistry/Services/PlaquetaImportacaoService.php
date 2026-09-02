<?php

namespace App\Domain\AssetRegistry\Services;

use App\Domain\AssetRegistry\Enums\PlaquetaStatusEnum;
use App\Domain\AssetRegistry\Models\PlaquetaPatrimonial;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use OpenSpout\Reader\CSV\Reader as CsvReader;
use OpenSpout\Reader\XLSX\Reader as XlsxReader;
use RuntimeException;

class PlaquetaImportacaoService
{
    public function __construct(
        private readonly PlaquetaPatrimonialService $plaquetaPatrimonialService,
    ) {
    }

    public function importar(UploadedFile $arquivo, int $empresaId): array
    {
        $reader = $this->makeReader($arquivo);
        $reader->open($arquivo->getRealPath());

        $importadas = 0;
        $atualizadas = 0;
        $ignoradas = 0;
        $erros = [];
        $headers = [];
        $linhaAtual = 0;

        foreach ($reader->getSheetIterator() as $sheet) {
            foreach ($sheet->getRowIterator() as $row) {
                $linhaAtual++;
                $valores = array_map(
                    fn ($cell) => $this->normalizeCellValue($cell->getValue()),
                    $row->getCells()
                );

                if ($linhaAtual === 1) {
                    $headers = array_map(fn (?string $value) => $this->normalizeHeader($value), $valores);
                    continue;
                }

                if ($this->isEmptyRow($valores)) {
                    continue;
                }

                $payload = $this->combineRow($headers, $valores);
                $numeroPlaqueta = $this->normalizeNumeroPlaqueta(
                    $payload['numero_plaqueta']
                        ?? $payload['numero']
                        ?? $payload['plaqueta']
                        ?? null
                );
                $codigoBarras = trim((string) (
                    $payload['codigo_barras_conteudo']
                    ?? $payload['codigo_barras']
                    ?? $payload['barcode']
                    ?? $payload['codigo']
                    ?? ''
                ));
                $observacoes = $payload['observacoes'] ?? null;

                if ($numeroPlaqueta === '' || $codigoBarras === '') {
                    $ignoradas++;
                    $erros[] = "Linha {$linhaAtual}: número da plaqueta ou código de barras ausente.";
                    continue;
                }

                $resultado = $this->plaquetaPatrimonialService->criarOuAtualizarPlaquetaEmEstoque([
                    'empresa_id' => $empresaId,
                    'numero_plaqueta' => $numeroPlaqueta,
                    'codigo_barras_conteudo' => $codigoBarras,
                    'observacoes' => $observacoes,
                    'data_geracao' => Carbon::now()->toDateString(),
                ]);

                if ($resultado->wasRecentlyCreated) {
                    $importadas++;
                } else {
                    $atualizadas++;
                }
            }

            break;
        }

        $reader->close();

        return [
            'importadas' => $importadas,
            'atualizadas' => $atualizadas,
            'ignoradas' => $ignoradas,
            'erros' => $erros,
        ];
    }

    private function makeReader(UploadedFile $arquivo): CsvReader|XlsxReader
    {
        $extension = strtolower((string) $arquivo->getClientOriginalExtension());

        return match ($extension) {
            'csv', 'txt' => new CsvReader(),
            'xlsx' => new XlsxReader(),
            default => throw new RuntimeException('Formato de arquivo não suportado para importação de plaquetas.'),
        };
    }

    private function normalizeCellValue(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return trim((string) $value);
    }

    private function normalizeHeader(?string $value): string
    {
        $normalized = strtolower((string) $value);
        $normalized = str_replace(['ã', 'á', 'à', 'â', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú', 'ç', ' '], ['a', 'a', 'a', 'a', 'e', 'e', 'i', 'o', 'o', 'o', 'u', 'c', '_'], $normalized);

        return preg_replace('/[^a-z0-9_]/', '', $normalized) ?? '';
    }

    private function isEmptyRow(array $values): bool
    {
        foreach ($values as $value) {
            if ($value !== null && $value !== '') {
                return false;
            }
        }

        return true;
    }

    private function combineRow(array $headers, array $values): array
    {
        $payload = [];

        foreach ($values as $index => $value) {
            $header = $headers[$index] ?? "coluna_{$index}";
            $payload[$header] = $value;
        }

        return $payload;
    }

    private function normalizeNumeroPlaqueta(?string $value): string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return '';
        }

        if (preg_match('/^\d+$/', $value) === 1 && strlen($value) < 4) {
            return str_pad($value, 4, '0', STR_PAD_LEFT);
        }

        return $value;
    }
}
