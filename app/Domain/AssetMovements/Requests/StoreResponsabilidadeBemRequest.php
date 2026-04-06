<?php

namespace App\Domain\AssetMovements\Requests;

class StoreResponsabilidadeBemRequest extends BaseBemMovimentacaoRequest
{
    public function rules(): array
    {
        $empresaId = $this->input('empresa_id');
        $filialId = $this->input('filial_id');
        $bemId = $this->input('bem_patrimonial_id');
        $bemDepartamentoId = $this->bemDepartamentoId($bemId, $empresaId, $filialId);

        return [
            'empresa_id' => $this->empresaRule(),
            'filial_id' => $this->filialRule($empresaId),
            'bem_patrimonial_id' => $this->bemRule($empresaId, $filialId),
            'responsavel_id' => $this->responsavelRule($empresaId, $filialId, $bemDepartamentoId),
            'data_inicio' => ['required', 'date'],
            'data_fim' => ['nullable', 'date', 'after_or_equal:data_inicio'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}
