<?php

namespace App\Domain\AssetMovements\Requests;

use App\Domain\AssetMovements\Enums\BaixaBemMotivoEnum;
use Illuminate\Validation\Rule;

class UpdateBaixaBemRequest extends BaseBemMovimentacaoRequest
{
    public function rules(): array
    {
        $baixa = $this->route('baixa_bem');
        $empresaId = $this->input('empresa_id', $baixa?->empresa_id);
        $filialId = $this->input('filial_id', $baixa?->filial_id);

        return [
            'empresa_id' => $this->empresaRule(false),
            'filial_id' => $this->filialRule($empresaId, false),
            'bem_patrimonial_id' => $this->bemRule($empresaId, $filialId, false),
            'data_baixa' => ['sometimes', 'required', 'date'],
            'motivo_baixa' => ['sometimes', 'required', 'string', Rule::in(BaixaBemMotivoEnum::values())],
            'valor_baixa' => ['nullable', 'numeric', 'min:0'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}
