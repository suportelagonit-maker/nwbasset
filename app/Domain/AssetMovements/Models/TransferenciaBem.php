<?php

namespace App\Domain\AssetMovements\Models;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Organization\Models\Departamento;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Models\Local;
use App\Domain\Organization\Models\Responsavel;
use App\Domain\Organization\Models\UnidadeAdministrativa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferenciaBem extends Model
{
    protected $table = 'transferencias_bens';

    protected $fillable = [
        'bem_patrimonial_id',
        'empresa_id',
        'filial_id',
        'origem_unidade_administrativa_id',
        'origem_departamento_id',
        'origem_local_id',
        'origem_responsavel_id',
        'destino_unidade_administrativa_id',
        'destino_departamento_id',
        'destino_local_id',
        'destino_responsavel_id',
        'data_transferencia',
        'motivo',
        'observacoes',
    ];

    protected function casts(): array
    {
        return [
            'data_transferencia' => 'date',
        ];
    }

    public function bemPatrimonial(): BelongsTo
    {
        return $this->belongsTo(BemPatrimonial::class, 'bem_patrimonial_id');
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function filial(): BelongsTo
    {
        return $this->belongsTo(Filial::class, 'filial_id');
    }

    public function origemUnidadeAdministrativa(): BelongsTo
    {
        return $this->belongsTo(UnidadeAdministrativa::class, 'origem_unidade_administrativa_id');
    }

    public function origemDepartamento(): BelongsTo
    {
        return $this->belongsTo(Departamento::class, 'origem_departamento_id');
    }

    public function origemLocal(): BelongsTo
    {
        return $this->belongsTo(Local::class, 'origem_local_id');
    }

    public function origemResponsavel(): BelongsTo
    {
        return $this->belongsTo(Responsavel::class, 'origem_responsavel_id');
    }

    public function destinoUnidadeAdministrativa(): BelongsTo
    {
        return $this->belongsTo(UnidadeAdministrativa::class, 'destino_unidade_administrativa_id');
    }

    public function destinoDepartamento(): BelongsTo
    {
        return $this->belongsTo(Departamento::class, 'destino_departamento_id');
    }

    public function destinoLocal(): BelongsTo
    {
        return $this->belongsTo(Local::class, 'destino_local_id');
    }

    public function destinoResponsavel(): BelongsTo
    {
        return $this->belongsTo(Responsavel::class, 'destino_responsavel_id');
    }
}
