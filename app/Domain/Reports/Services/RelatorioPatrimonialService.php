<?php

namespace App\Domain\Reports\Services;

use App\Domain\Audit\Models\AuditoriaPatrimonial;
use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Depreciation\Models\DepreciacaoBem;
use App\Domain\Inventory\Models\DivergenciaInventario;
use App\Domain\Inventory\Models\Inventario;
use App\Domain\MultiCompany\Services\EmpresaContextService;
use Illuminate\Support\Collection;

class RelatorioPatrimonialService
{
    public function __construct(
        private readonly EmpresaContextService $empresaContextService,
    ) {
    }

    public function relatorioBensPorLocal(?int $empresaId = null, ?int $filialId = null): Collection
    {
        $empresaId ??= $this->empresaContextService->getEmpresaAtual();
        $query = BemPatrimonial::query()
            ->selectRaw('local_id, count(*) as total_bens, sum(valor_aquisicao) as valor_total')
            ->with('local:id,nome,codigo')
            ->groupBy('local_id')
            ->orderBy('local_id');

        if ($empresaId !== null) {
            $query->where('empresa_id', $empresaId);
        }

        if ($filialId !== null) {
            $query->where('filial_id', $filialId);
        }

        return $query->get()->map(fn (BemPatrimonial $bem) => [
            'local_id' => $bem->local_id,
            'local' => $bem->local?->nome,
            'codigo_local' => $bem->local?->codigo,
            'total_bens' => (int) $bem->total_bens,
            'valor_total' => round((float) $bem->valor_total, 2),
        ]);
    }

    public function relatorioBensPorResponsavel(?int $empresaId = null, ?int $filialId = null): Collection
    {
        $empresaId ??= $this->empresaContextService->getEmpresaAtual();
        $query = BemPatrimonial::query()
            ->selectRaw('responsavel_id, count(*) as total_bens, sum(valor_aquisicao) as valor_total')
            ->with('responsavel:id,nome,matricula')
            ->groupBy('responsavel_id')
            ->orderBy('responsavel_id');

        if ($empresaId !== null) {
            $query->where('empresa_id', $empresaId);
        }

        if ($filialId !== null) {
            $query->where('filial_id', $filialId);
        }

        return $query->get()->map(fn (BemPatrimonial $bem) => [
            'responsavel_id' => $bem->responsavel_id,
            'responsavel' => $bem->responsavel?->nome,
            'matricula' => $bem->responsavel?->matricula,
            'total_bens' => (int) $bem->total_bens,
            'valor_total' => round((float) $bem->valor_total, 2),
        ]);
    }

    public function relatorioDepreciacao(?int $empresaId = null): Collection
    {
        $empresaId ??= $this->empresaContextService->getEmpresaAtual();
        $query = DepreciacaoBem::query()
            ->with(['bemPatrimonial:id,numero_tombo,descricao', 'metodoDepreciacao:id,nome,codigo'])
            ->orderByDesc('data_calculo')
            ->orderByDesc('id');

        if ($empresaId !== null) {
            $query->where('empresa_id', $empresaId);
        }

        return $query->get()->map(fn (DepreciacaoBem $depreciacao) => [
            'id' => $depreciacao->id,
            'bem_patrimonial_id' => $depreciacao->bem_patrimonial_id,
            'numero_tombo' => $depreciacao->bemPatrimonial?->numero_tombo,
            'descricao' => $depreciacao->bemPatrimonial?->descricao,
            'metodo' => $depreciacao->metodoDepreciacao?->nome,
            'taxa_anual' => (float) $depreciacao->taxa_anual,
            'valor_depreciado_acumulado' => (float) $depreciacao->valor_depreciado_acumulado,
            'valor_contabil' => (float) $depreciacao->valor_contabil,
            'data_calculo' => $depreciacao->data_calculo?->toDateString(),
        ]);
    }

    public function relatorioInventario(?int $empresaId = null): Collection
    {
        $empresaId ??= $this->empresaContextService->getEmpresaAtual();
        $query = Inventario::query()
            ->withCount('itens')
            ->with(['conciliacao', 'empresa:id,nome_fantasia'])
            ->orderByDesc('data_inicio')
            ->orderByDesc('id');

        if ($empresaId !== null) {
            $query->where('empresa_id', $empresaId);
        }

        return $query->get()->map(fn (Inventario $inventario) => [
            'id' => $inventario->id,
            'empresa_id' => $inventario->empresa_id,
            'empresa' => $inventario->empresa?->nome_fantasia,
            'nome' => $inventario->nome,
            'status' => $inventario->status,
            'data_inicio' => $inventario->data_inicio?->toDateString(),
            'data_fim' => $inventario->data_fim?->toDateString(),
            'total_itens' => (int) $inventario->itens_count,
            'total_bens_encontrados' => (int) ($inventario->conciliacao?->total_bens_encontrados ?? 0),
            'divergencias' => (int) ($inventario->conciliacao?->divergencias ?? 0),
        ]);
    }

    public function relatorioDivergencias(?int $inventarioId = null, ?int $empresaId = null): Collection
    {
        $empresaId ??= $this->empresaContextService->getEmpresaAtual();
        $query = DivergenciaInventario::query()
            ->with([
                'inventario:id,empresa_id,nome',
                'bemPatrimonial:id,numero_tombo,descricao',
            ])
            ->orderByDesc('id');

        if ($inventarioId !== null) {
            $query->where('inventario_id', $inventarioId);
        }

        if ($empresaId !== null) {
            $query->whereHas('inventario', fn ($q) => $q->where('empresa_id', $empresaId));
        }

        return $query->get()->map(fn (DivergenciaInventario $divergencia) => [
            'id' => $divergencia->id,
            'inventario_id' => $divergencia->inventario_id,
            'inventario' => $divergencia->inventario?->nome,
            'bem_patrimonial_id' => $divergencia->bem_patrimonial_id,
            'numero_tombo' => $divergencia->bemPatrimonial?->numero_tombo,
            'descricao_bem' => $divergencia->bemPatrimonial?->descricao,
            'tipo_divergencia' => $divergencia->tipo_divergencia,
            'descricao' => $divergencia->descricao,
        ]);
    }
}
