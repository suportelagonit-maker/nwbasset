<?php

namespace App\Domain\AssetMovements\Requests;

class UpdateTransferenciaBemRequest extends BaseBemMovimentacaoRequest
{
    public function rules(): array
    {
        $transferencia = $this->route('transferencia_bem');
        $empresaId = $this->input('empresa_id', $transferencia?->empresa_id);
        $filialId = $this->input('filial_id', $transferencia?->filial_id);
        $origemUnidadeId = $this->input('origem_unidade_administrativa_id', $transferencia?->origem_unidade_administrativa_id);
        $origemDepartamentoId = $this->input('origem_departamento_id', $transferencia?->origem_departamento_id);
        $destinoUnidadeId = $this->input('destino_unidade_administrativa_id', $transferencia?->destino_unidade_administrativa_id);
        $destinoDepartamentoId = $this->input('destino_departamento_id', $transferencia?->destino_departamento_id);
        $bemId = $this->input('bem_patrimonial_id', $transferencia?->bem_patrimonial_id);
        $bemDepartamentoId = $this->bemDepartamentoId($bemId, $empresaId, $filialId);

        return [
            'empresa_id' => $this->empresaRule(false),
            'filial_id' => $this->filialRule($empresaId, false),
            'bem_patrimonial_id' => $this->bemRule($empresaId, $filialId, false),
            'origem_unidade_administrativa_id' => $this->unidadeRule('origem_unidade_administrativa_id', $empresaId, $filialId, false),
            'origem_departamento_id' => $this->departamentoRule('origem_departamento_id', $empresaId, $filialId, $origemUnidadeId, false),
            'origem_local_id' => $this->localRule('origem_local_id', $empresaId, $filialId, $origemUnidadeId, $origemDepartamentoId, false),
            'origem_responsavel_id' => $this->responsavelRule($empresaId, $filialId, $bemDepartamentoId, false),
            'destino_unidade_administrativa_id' => $this->unidadeRule('destino_unidade_administrativa_id', $empresaId, $filialId, false),
            'destino_departamento_id' => $this->departamentoRule('destino_departamento_id', $empresaId, $filialId, $destinoUnidadeId, false),
            'destino_local_id' => $this->localRule('destino_local_id', $empresaId, $filialId, $destinoUnidadeId, $destinoDepartamentoId, false),
            'destino_responsavel_id' => $this->responsavelRule($empresaId, $filialId, $destinoDepartamentoId, false),
            'atualizar_responsavel_bem' => ['sometimes', 'boolean'],
            'data_transferencia' => ['sometimes', 'required', 'date'],
            'motivo' => ['sometimes', 'required', 'string', 'max:150'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}
