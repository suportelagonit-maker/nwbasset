<?php

namespace App\Domain\AssetMovements\Requests;

class StoreTransferenciaBemRequest extends BaseBemMovimentacaoRequest
{
    public function rules(): array
    {
        return [
            'empresa_id' => $this->empresaRule(),
            'filial_id' => $this->filialRule($this->input('empresa_id')),
            'bem_patrimonial_id' => $this->bemRule($this->input('empresa_id'), $this->input('filial_id')),
            'origem_unidade_administrativa_id' => $this->unidadeRule('origem_unidade_administrativa_id', $this->input('empresa_id'), $this->input('filial_id')),
            'origem_departamento_id' => $this->departamentoRule(
                'origem_departamento_id',
                $this->input('empresa_id'),
                $this->input('filial_id'),
                $this->input('origem_unidade_administrativa_id'),
            ),
            'origem_local_id' => $this->localRule(
                'origem_local_id',
                $this->input('empresa_id'),
                $this->input('filial_id'),
                $this->input('origem_unidade_administrativa_id'),
                $this->input('origem_departamento_id'),
            ),
            'destino_unidade_administrativa_id' => $this->unidadeRule('destino_unidade_administrativa_id', $this->input('empresa_id'), $this->input('filial_id')),
            'destino_departamento_id' => $this->departamentoRule(
                'destino_departamento_id',
                $this->input('empresa_id'),
                $this->input('filial_id'),
                $this->input('destino_unidade_administrativa_id'),
            ),
            'destino_local_id' => $this->localRule(
                'destino_local_id',
                $this->input('empresa_id'),
                $this->input('filial_id'),
                $this->input('destino_unidade_administrativa_id'),
                $this->input('destino_departamento_id'),
            ),
            'data_transferencia' => ['required', 'date'],
            'motivo' => ['required', 'string', 'max:150'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}
