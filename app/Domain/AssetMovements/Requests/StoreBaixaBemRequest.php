<?php

namespace App\Domain\AssetMovements\Requests;

use App\Domain\AssetMovements\Enums\BaixaBemMotivoEnum;
use Illuminate\Validation\Rule;

class StoreBaixaBemRequest extends BaseBemMovimentacaoRequest
{
    public function rules(): array
    {
        return [
            'empresa_id' => $this->empresaRule(),
            'filial_id' => $this->filialRule($this->input('empresa_id')),
            'bem_patrimonial_id' => $this->bemRule($this->input('empresa_id'), $this->input('filial_id')),
            'data_baixa' => ['required', 'date'],
            'motivo_baixa' => ['required', 'string', Rule::in(BaixaBemMotivoEnum::values())],
            'valor_baixa' => ['nullable', 'numeric', 'min:0'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}
