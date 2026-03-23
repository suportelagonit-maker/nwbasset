<?php

namespace App\Domain\Reports\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer as XlsxWriter;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportacaoRelatoriosService
{
    public function __construct(
        private readonly RelatorioPatrimonialService $relatorioPatrimonialService
    ) {
    }

    public function exportarBensPorLocalPdf(?int $empresaId = null, ?int $filialId = null): Response
    {
        $data = $this->relatorioPatrimonialService->relatorioBensPorLocal($empresaId, $filialId);

        return $this->pdfDownload(
            'Bens por Local',
            [
                'Local',
                'Codigo',
                'Total de Bens',
                'Valor Total',
            ],
            $data->map(fn (array $item) => [
                $item['local'] ?? 'Nao informado',
                $item['codigo_local'] ?? '-',
                $item['total_bens'],
                $this->formatCurrency($item['valor_total']),
            ]),
            $this->buildFileName('bens-por-local', 'pdf'),
            $this->buildFilters($empresaId, $filialId),
        );
    }

    public function exportarBensPorLocalExcel(?int $empresaId = null, ?int $filialId = null): BinaryFileResponse
    {
        $data = $this->relatorioPatrimonialService->relatorioBensPorLocal($empresaId, $filialId);

        return $this->xlsxDownload(
            [
                'Local',
                'Codigo',
                'Total de Bens',
                'Valor Total',
            ],
            $data->map(fn (array $item) => [
                $item['local'] ?? 'Nao informado',
                $item['codigo_local'] ?? '-',
                $item['total_bens'],
                $item['valor_total'],
            ]),
            $this->buildFileName('bens-por-local', 'xlsx'),
        );
    }

    public function exportarBensPorLocalCsv(?int $empresaId = null, ?int $filialId = null): StreamedResponse
    {
        $data = $this->relatorioPatrimonialService->relatorioBensPorLocal($empresaId, $filialId);

        return $this->csvDownload(
            [
                'Local',
                'Codigo',
                'Total de Bens',
                'Valor Total',
            ],
            $data->map(fn (array $item) => [
                $item['local'] ?? 'Nao informado',
                $item['codigo_local'] ?? '-',
                $item['total_bens'],
                $item['valor_total'],
            ]),
            $this->buildFileName('bens-por-local', 'csv'),
        );
    }

    public function exportarBensPorResponsavelPdf(?int $empresaId = null, ?int $filialId = null): Response
    {
        $data = $this->relatorioPatrimonialService->relatorioBensPorResponsavel($empresaId, $filialId);

        return $this->pdfDownload(
            'Bens por Responsavel',
            [
                'Responsavel',
                'Matricula',
                'Total de Bens',
                'Valor Total',
            ],
            $data->map(fn (array $item) => [
                $item['responsavel'] ?? 'Nao informado',
                $item['matricula'] ?? '-',
                $item['total_bens'],
                $this->formatCurrency($item['valor_total']),
            ]),
            $this->buildFileName('bens-por-responsavel', 'pdf'),
            $this->buildFilters($empresaId, $filialId),
        );
    }

    public function exportarDepreciacaoPdf(?int $empresaId = null): Response
    {
        $data = $this->relatorioPatrimonialService->relatorioDepreciacao($empresaId);

        return $this->pdfDownload(
            'Relatorio de Depreciacao',
            [
                'Tombo',
                'Descricao',
                'Metodo',
                'Taxa Anual',
                'Depreciado Acumulado',
                'Valor Contabil',
                'Data Calculo',
            ],
            $data->map(fn (array $item) => [
                $item['numero_tombo'] ?? '-',
                $item['descricao'] ?? '-',
                $item['metodo'] ?? '-',
                $this->formatPercent($item['taxa_anual']),
                $this->formatCurrency($item['valor_depreciado_acumulado']),
                $this->formatCurrency($item['valor_contabil']),
                $item['data_calculo'] ?? '-',
            ]),
            $this->buildFileName('depreciacao', 'pdf'),
            $this->buildFilters($empresaId),
        );
    }

    public function exportarInventarioPdf(?int $empresaId = null): Response
    {
        $data = $this->relatorioPatrimonialService->relatorioInventario($empresaId);

        return $this->pdfDownload(
            'Relatorio de Inventario',
            [
                'Inventario',
                'Empresa',
                'Status',
                'Inicio',
                'Fim',
                'Total Itens',
                'Bens Encontrados',
                'Divergencias',
            ],
            $data->map(fn (array $item) => [
                $item['nome'] ?? '-',
                $item['empresa'] ?? '-',
                $item['status'] ?? '-',
                $item['data_inicio'] ?? '-',
                $item['data_fim'] ?? '-',
                $item['total_itens'],
                $item['total_bens_encontrados'],
                $item['divergencias'],
            ]),
            $this->buildFileName('inventario', 'pdf'),
            $this->buildFilters($empresaId),
        );
    }

    public function exportarDivergenciasPdf(?int $inventarioId = null, ?int $empresaId = null): Response
    {
        $data = $this->relatorioPatrimonialService->relatorioDivergencias($inventarioId, $empresaId);

        return $this->pdfDownload(
            'Relatorio de Divergencias',
            [
                'Inventario',
                'Tombo',
                'Descricao Bem',
                'Tipo Divergencia',
                'Descricao',
            ],
            $data->map(fn (array $item) => [
                $item['inventario'] ?? '-',
                $item['numero_tombo'] ?? '-',
                $item['descricao_bem'] ?? '-',
                $item['tipo_divergencia'] ?? '-',
                $item['descricao'] ?? '-',
            ]),
            $this->buildFileName('divergencias', 'pdf'),
            $this->buildFilters($empresaId, inventarioId: $inventarioId),
        );
    }

    private function pdfDownload(
        string $title,
        array $headers,
        Collection $rows,
        string $fileName,
        array $filters = [],
    ): Response {
        return Pdf::loadView('reports.pdf.table', [
            'title' => $title,
            'headers' => $headers,
            'rows' => $rows->values()->all(),
            'filters' => $filters,
            'generatedAt' => now()->format('d/m/Y H:i:s'),
        ])
            ->setPaper('a4', 'landscape')
            ->download($fileName);
    }

    private function xlsxDownload(array $headers, Collection $rows, string $fileName): BinaryFileResponse
    {
        $path = $this->makeTempPath($fileName);
        $writer = new XlsxWriter();
        $writer->openToFile($path);
        $writer->addRow(Row::fromValues($headers));

        foreach ($rows as $row) {
            $writer->addRow(Row::fromValues($row));
        }

        $writer->close();

        return response()->download(
            $path,
            $fileName,
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
        )->deleteFileAfterSend(true);
    }

    private function csvDownload(array $headers, Collection $rows, string $fileName): StreamedResponse
    {
        return response()->streamDownload(function () use ($headers, $rows): void {
            $output = fopen('php://output', 'wb');
            fputcsv($output, $headers, ';');

            foreach ($rows as $row) {
                fputcsv($output, $row, ';');
            }

            fclose($output);
        }, $fileName, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function makeTempPath(string $fileName): string
    {
        $directory = storage_path('app/exports');

        if (!File::isDirectory($directory)) {
            File::makeDirectory($directory, 0755, true);
        }

        return $directory.DIRECTORY_SEPARATOR.uniqid('export_', true).'_'.$fileName;
    }

    private function buildFileName(string $baseName, string $extension): string
    {
        return sprintf('%s_%s.%s', $baseName, now()->format('Ymd_His'), $extension);
    }

    private function buildFilters(?int $empresaId = null, ?int $filialId = null, ?int $inventarioId = null): array
    {
        return array_filter([
            'Empresa ID' => $empresaId,
            'Filial ID' => $filialId,
            'Inventario ID' => $inventarioId,
        ], static fn ($value) => $value !== null);
    }

    private function formatCurrency(float|int $value): string
    {
        return 'R$ '.number_format((float) $value, 2, ',', '.');
    }

    private function formatPercent(float|int $value): string
    {
        return number_format((float) $value, 2, ',', '.').'%';
    }
}
