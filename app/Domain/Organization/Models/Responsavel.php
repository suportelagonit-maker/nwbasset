<?php

namespace App\Domain\Organization\Models;

use App\Domain\AssetMovements\Models\ResponsabilidadeBem;
use App\Domain\AssetRegistry\Models\BemPatrimonial;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Responsavel extends Model
{
    protected $table = 'responsaveis';

    protected $fillable = [
        'empresa_id',
        'filial_id',
        'departamento_id',
        'nome',
        'matricula',
        'cpf',
        'email',
        'telefone',
        'cargo',
        'status',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function filial(): BelongsTo
    {
        return $this->belongsTo(Filial::class, 'filial_id');
    }

    public function departamento(): BelongsTo
    {
        return $this->belongsTo(Departamento::class, 'departamento_id');
    }

    public function bensPatrimoniais(): HasMany
    {
        return $this->hasMany(BemPatrimonial::class, 'responsavel_id');
    }

    public function responsabilidadeBens(): HasMany
    {
        return $this->hasMany(ResponsabilidadeBem::class, 'responsavel_id');
    }
}
