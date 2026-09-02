<?php

namespace App\Domain\AssetMovements\Requests;

class UpdateHistoricoLocalizacaoBemRequest extends BaseBemMovimentacaoRequest
{
    public function rules(): array
    {
        $historico = $this->route('historico_localizacao_bem');
        $empresaId = $this->input('empresa_id', $historico?->empresa_id);
        $filialId = $this->input('filial_id', $historico?->filial_id);
        $unidadeId = $this->input('unidade_administrativa_id', $historico?->unidade_administrativa_id);
        $departamentoId = $this->input('departamento_id', $historico?->departamento_id);

        return [
            'empresa_id' => $this->empresaRule(false),
            'filial_id' => $this->filialRule($empresaId, false),
            'bem_patrimonial_id' => $this->bemRule($empresaId, $filialId, false),
            'unidade_administrativa_id' => $this->unidadeRule('unidade_administrativa_id', $empresaId, $filialId, false),
            'departamento_id' => $this->departamentoRule('departamento_id', $empresaId, $filialId, $unidadeId, false),
            'local_id' => $this->localRule('local_id', $empresaId, $filialId, $unidadeId, $departamentoId, false),
            'data_inicio' => ['sometimes', 'required', 'date'],
            'data_fim' => ['nullable', 'date', 'after_or_equal:data_inicio'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}
