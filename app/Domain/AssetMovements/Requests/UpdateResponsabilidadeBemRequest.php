<?php

namespace App\Domain\AssetMovements\Requests;

class UpdateResponsabilidadeBemRequest extends BaseBemMovimentacaoRequest
{
    public function rules(): array
    {
        $responsabilidade = $this->route('responsabilidade_bem');
        $empresaId = $this->input('empresa_id', $responsabilidade?->empresa_id);
        $filialId = $this->input('filial_id', $responsabilidade?->filial_id);

        return [
            'empresa_id' => $this->empresaRule(false),
            'filial_id' => $this->filialRule($empresaId, false),
            'bem_patrimonial_id' => $this->bemRule($empresaId, $filialId, false),
            'responsavel_id' => $this->responsavelRule($empresaId, $filialId, false),
            'data_inicio' => ['sometimes', 'required', 'date'],
            'data_fim' => ['nullable', 'date', 'after_or_equal:data_inicio'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}
