<?php

namespace App\Domain\AssetMovements\Requests;

class StoreHistoricoLocalizacaoBemRequest extends BaseBemMovimentacaoRequest
{
    public function rules(): array
    {
        return [
            'empresa_id' => $this->empresaRule(),
            'filial_id' => $this->filialRule($this->input('empresa_id')),
            'bem_patrimonial_id' => $this->bemRule($this->input('empresa_id'), $this->input('filial_id')),
            'unidade_administrativa_id' => $this->unidadeRule('unidade_administrativa_id', $this->input('empresa_id'), $this->input('filial_id')),
            'departamento_id' => $this->departamentoRule(
                'departamento_id',
                $this->input('empresa_id'),
                $this->input('filial_id'),
                $this->input('unidade_administrativa_id'),
            ),
            'local_id' => $this->localRule(
                'local_id',
                $this->input('empresa_id'),
                $this->input('filial_id'),
                $this->input('unidade_administrativa_id'),
                $this->input('departamento_id'),
            ),
            'data_inicio' => ['required', 'date'],
            'data_fim' => ['nullable', 'date', 'after_or_equal:data_inicio'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}
