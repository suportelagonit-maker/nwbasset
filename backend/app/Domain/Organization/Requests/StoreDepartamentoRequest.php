<?php

namespace App\Domain\Organization\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StoreDepartamentoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $empresaId = (int) $this->input('empresa_id');
        $filialId = (int) $this->input('filial_id');
        $unidadeId = (int) $this->input('unidade_administrativa_id');

        return [
            'empresa_id' => ['required', 'integer', Rule::exists('empresas', 'id')],
            'filial_id' => [
                'required',
                'integer',
                Rule::exists('filiais', 'id')->where(fn ($query) => $query->where('empresa_id', $this->input('empresa_id'))),
            ],
            'unidade_administrativa_id' => [
                'required',
                'integer',
                Rule::exists('unidades_administrativas', 'id')->where(fn ($query) => $query
                    ->where('empresa_id', $this->input('empresa_id'))
                    ->where('filial_id', $this->input('filial_id'))),
            ],
            'nome' => [
                'required',
                'string',
                'max:180',
                function (string $attribute, mixed $value, \Closure $fail) use ($empresaId, $filialId, $unidadeId): void {
                    $exists = DB::table('departamentos')
                        ->where('empresa_id', $empresaId)
                        ->where('filial_id', $filialId)
                        ->where('unidade_administrativa_id', $unidadeId)
                        ->whereRaw('LOWER(TRIM(nome)) = LOWER(TRIM(?))', [(string) $value])
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
