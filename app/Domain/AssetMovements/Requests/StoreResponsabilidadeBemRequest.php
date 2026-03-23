<?php

namespace App\Domain\AssetMovements\Requests;

class StoreResponsabilidadeBemRequest extends BaseBemMovimentacaoRequest
{
    public function rules(): array
    {
        return [
            'empresa_id' => $this->empresaRule(),
            'filial_id' => $this->filialRule($this->input('empresa_id')),
            'bem_patrimonial_id' => $this->bemRule($this->input('empresa_id'), $this->input('filial_id')),
            'responsavel_id' => $this->responsavelRule($this->input('empresa_id'), $this->input('filial_id')),
            'data_inicio' => ['required', 'date'],
            'data_fim' => ['nullable', 'date', 'after_or_equal:data_inicio'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}
