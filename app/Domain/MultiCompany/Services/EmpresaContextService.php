<?php

namespace App\Domain\MultiCompany\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class EmpresaContextService
{
    public function __construct(
        private readonly EmpresaContext $empresaContext,
    ) {
    }

    public function getEmpresaAtual(): ?int
    {
        return $this->empresaContext->id();
    }

    public function setEmpresaContext(int $empresaId): void
    {
        $this->empresaContext->setId($empresaId);
    }

    public function aplicarFiltroEmpresa(Builder $query, ?int $empresaId = null, string $column = 'empresa_id'): Builder
    {
        $empresaId ??= $this->empresaContext->requiredId();

        return $query->where($column, $empresaId);
    }

    public function aplicarFiltroEmpresaPorRelacao(
        Builder $query,
        string $relation,
        ?int $empresaId = null,
        string $column = 'empresa_id',
    ): Builder {
        $empresaId ??= $this->empresaContext->requiredId();

        return $query->whereHas($relation, function (Builder $relationQuery) use ($empresaId, $column): void {
            $relationQuery->where($column, $empresaId);
        });
    }

    public function garantirModelDaEmpresa(Model $model, ?int $empresaId = null, string $column = 'empresa_id'): void
    {
        $empresaId ??= $this->empresaContext->requiredId();

        if ((int) $model->getAttribute($column) !== $empresaId) {
            throw (new ModelNotFoundException())->setModel($model::class, [$model->getKey()]);
        }
    }

    public function garantirModelRelacionadoDaEmpresa(
        Model $model,
        string $relation,
        ?int $empresaId = null,
        string $column = 'empresa_id',
    ): void {
        $empresaId ??= $this->empresaContext->requiredId();
        $relatedModel = $model->loadMissing($relation)->getRelation($relation);

        if (! $relatedModel instanceof Model || (int) $relatedModel->getAttribute($column) !== $empresaId) {
            throw (new ModelNotFoundException())->setModel($model::class, [$model->getKey()]);
        }
    }
}
