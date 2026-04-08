<?php

namespace App\Domain\AssetRegistry\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TipoProduto extends Model
{
    use HasFactory;

    protected $table = 'tipos_produtos';

    protected $fillable = [
        'empresa_id',
        'tipo_bem_id',
        'nome',
        'descricao',
        'ativo',
    ];

    protected $casts = [
        'ativo' => 'boolean',
    ];
}
