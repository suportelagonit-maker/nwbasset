<?php

namespace App\Domain\AssetRegistry\Models;

use App\Domain\AssetRegistry\Enums\PlaquetaStatusEnum;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlaquetaPatrimonial extends Model
{
    protected $table = 'plaquetas_patrimoniais';

    protected $fillable = [
        'bem_patrimonial_id',
        'empresa_id',
        'filial_id',
        'codigo_plaqueta',
        'numero_plaqueta',
        'codigo_barras_conteudo',
        'link_consulta',
        'qr_code_conteudo',
        'status',
        'data_geracao',
        'data_aplicacao',
        'observacoes',
    ];

    protected function casts(): array
    {
        return [
            'data_geracao' => 'date',
            'data_aplicacao' => 'date',
            'status' => PlaquetaStatusEnum::class,
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
}
