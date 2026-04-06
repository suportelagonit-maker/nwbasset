<?php

namespace App\Domain\Organization\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StoreLocalRequest extends FormRequest
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
        $departamentoId = (int) $this->input('departamento_id');

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
            'departamento_id' => [
                'required',
                'integer',
                Rule::exists('departamentos', 'id')->where(fn ($query) => $query
                    ->where('empresa_id', $this->input('empresa_id'))
                    ->where('filial_id', $this->input('filial_id'))
                    ->where('unidade_administrativa_id', $this->input('unidade_administrativa_id'))),
            ],
            'nome' => [
                'required',
                'string',
                'max:180',
                function (string $attribute, mixed $value, \Closure $fail) use ($empresaId, $filialId, $unidadeId, $departamentoId): void {
                    $exists = DB::table('locais')
                        ->where('empresa_id', $empresaId)
                        ->where('filial_id', $filialId)
                        ->where('unidade_administrativa_id', $unidadeId)
                        ->where('departamento_id', $departamentoId)
                        ->whereRaw('LOWER(TRIM(nome)) = LOWER(TRIM(?))', [(string) $value])
                        ->exists();

                    if ($exists) {
                        $fail('Já existe um local com este nome no departamento selecionado.');
                    }
                },
            ],
            'endereco' => ['nullable', 'string', 'max:255'],
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
