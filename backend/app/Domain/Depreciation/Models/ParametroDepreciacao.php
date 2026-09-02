<?php

namespace App\Domain\Depreciation\Models;

use App\Domain\Organization\Models\Empresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParametroDepreciacao extends Model
{
    protected $table = 'parametros_depreciacao';

    protected $fillable = [
        'empresa_id',
        'metodo_depreciacao_id',
        'vida_util_padrao',
        'taxa_padrao',
    ];

    protected function casts(): array
    {
        return [
            'vida_util_padrao' => 'integer',
            'taxa_padrao' => 'decimal:4',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function metodoDepreciacao(): BelongsTo
    {
        return $this->belongsTo(MetodoDepreciacao::class, 'metodo_depreciacao_id');
    }
}
