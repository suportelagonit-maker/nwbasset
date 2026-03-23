<?php

namespace App\Domain\Reports\Controllers;

use App\Domain\Reports\Services\ExportacaoRelatoriosService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportacaoRelatoriosController extends Controller
{
    public function __construct(
        private readonly ExportacaoRelatoriosService $exportacaoRelatoriosService
    ) {
    }

    public function bensPorLocalPdf(Request $request): Response
    {
        return $this->exportacaoRelatoriosService->exportarBensPorLocalPdf(
            $request->filled('empresa_id') ? $request->integer('empresa_id') : null,
            $request->filled('filial_id') ? $request->integer('filial_id') : null,
        );
    }

    public function bensPorLocalExcel(Request $request): BinaryFileResponse
    {
        return $this->exportacaoRelatoriosService->exportarBensPorLocalExcel(
            $request->filled('empresa_id') ? $request->integer('empresa_id') : null,
            $request->filled('filial_id') ? $request->integer('filial_id') : null,
        );
    }

    public function bensPorLocalCsv(Request $request): StreamedResponse
    {
        return $this->exportacaoRelatoriosService->exportarBensPorLocalCsv(
            $request->filled('empresa_id') ? $request->integer('empresa_id') : null,
            $request->filled('filial_id') ? $request->integer('filial_id') : null,
        );
    }

    public function bensPorResponsavelPdf(Request $request): Response
    {
        return $this->exportacaoRelatoriosService->exportarBensPorResponsavelPdf(
            $request->filled('empresa_id') ? $request->integer('empresa_id') : null,
            $request->filled('filial_id') ? $request->integer('filial_id') : null,
        );
    }

    public function depreciacaoPdf(Request $request): Response
    {
        return $this->exportacaoRelatoriosService->exportarDepreciacaoPdf(
            $request->filled('empresa_id') ? $request->integer('empresa_id') : null,
        );
    }

    public function inventarioPdf(Request $request): Response
    {
        return $this->exportacaoRelatoriosService->exportarInventarioPdf(
            $request->filled('empresa_id') ? $request->integer('empresa_id') : null,
        );
    }

    public function divergenciasPdf(Request $request): Response
    {
        return $this->exportacaoRelatoriosService->exportarDivergenciasPdf(
            $request->filled('inventario_id') ? $request->integer('inventario_id') : null,
            $request->filled('empresa_id') ? $request->integer('empresa_id') : null,
        );
    }
}
