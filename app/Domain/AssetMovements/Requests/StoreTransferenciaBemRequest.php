<?php

namespace App\Domain\AssetMovements\Requests;

class StoreTransferenciaBemRequest extends BaseBemMovimentacaoRequest
{
    public function rules(): array
    {
        $empresaId = $this->input('empresa_id');
        $filialId = $this->input('filial_id');
        $bemId = $this->input('bem_patrimonial_id');
        $bemDepartamentoId = $this->bemDepartamentoId($bemId, $empresaId, $filialId);
        $destinoDepartamentoId = $this->input('destino_departamento_id');

        return [
            'empresa_id' => $this->empresaRule(),
            'filial_id' => $this->filialRule($empresaId),
            'bem_patrimonial_id' => $this->bemRule($empresaId, $filialId),
            'origem_unidade_administrativa_id' => $this->unidadeRule('origem_unidade_administrativa_id', $empresaId, $filialId),
            'origem_departamento_id' => $this->departamentoRule(
                'origem_departamento_id',
                $empresaId,
                $filialId,
                $this->input('origem_unidade_administrativa_id'),
            ),
            'origem_local_id' => $this->localRule(
                'origem_local_id',
                $empresaId,
                $filialId,
                $this->input('origem_unidade_administrativa_id'),
                $this->input('origem_departamento_id'),
            ),
            'origem_responsavel_id' => $this->responsavelRule($empresaId, $filialId, $bemDepartamentoId, false),
            'destino_unidade_administrativa_id' => $this->unidadeRule('destino_unidade_administrativa_id', $empresaId, $filialId),
            'destino_departamento_id' => $this->departamentoRule(
                'destino_departamento_id',
                $empresaId,
                $filialId,
                $this->input('destino_unidade_administrativa_id'),
            ),
            'destino_local_id' => $this->localRule(
                'destino_local_id',
                $empresaId,
                $filialId,
                $this->input('destino_unidade_administrativa_id'),
                $this->input('destino_departamento_id'),
            ),
            'destino_responsavel_id' => $this->responsavelRule($empresaId, $filialId, $destinoDepartamentoId, false),
            'atualizar_responsavel_bem' => ['sometimes', 'boolean'],
            'data_transferencia' => ['required', 'date'],
            'motivo' => ['required', 'string', 'max:150'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}
