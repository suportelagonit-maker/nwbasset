<?php

namespace App\Domain\Organization\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UpdateDepartamentoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $departamento = $this->route('departamento');
        $empresaId = (int) $this->input('empresa_id', $departamento?->empresa_id);
        $filialId = (int) $this->input('filial_id', $departamento?->filial_id);
        $unidadeId = (int) $this->input('unidade_administrativa_id', $departamento?->unidade_administrativa_id);

        return [
            'empresa_id' => ['sometimes', 'integer', Rule::exists('empresas', 'id')],
            'filial_id' => [
                'sometimes',
                'integer',
                Rule::exists('filiais', 'id')->where(fn ($query) => $query->where('empresa_id', $empresaId)),
            ],
            'unidade_administrativa_id' => [
                'sometimes',
                'integer',
                Rule::exists('unidades_administrativas', 'id')->where(fn ($query) => $query
                    ->where('empresa_id', $empresaId)
                    ->where('filial_id', $filialId)),
            ],
            'nome' => [
                'sometimes',
                'required',
                'string',
                'max:180',
                function (string $attribute, mixed $value, \Closure $fail) use ($departamento, $empresaId, $filialId, $unidadeId): void {
                    $exists = DB::table('departamentos')
                        ->where('empresa_id', $empresaId)
                        ->where('filial_id', $filialId)
                        ->where('unidade_administrativa_id', $unidadeId)
                        ->whereRaw('LOWER(TRIM(nome)) = LOWER(TRIM(?))', [(string) $value])
                        ->where('id', '<>', (int) ($departamento?->id ?? 0))
                        ->exists();

                    if ($exists) {
                        $fail('Já existe um departamento com este nome na unidade selecionada.');
                    }
                },
            ],
            'descricao' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'max:20'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'nome' => is_string($this->input('nome')) ? trim($this->input('nome')) : $this->input('nome'),
        ]);
    }
}
