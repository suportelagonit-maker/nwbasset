<?php

namespace App\Domain\Organization\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UpdateLocalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $local = $this->route('local');
        $empresaId = (int) $this->input('empresa_id', $local?->empresa_id);
        $filialId = (int) $this->input('filial_id', $local?->filial_id);
        $unidadeId = (int) $this->input('unidade_administrativa_id', $local?->unidade_administrativa_id);
        $departamentoId = (int) $this->input('departamento_id', $local?->departamento_id);

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
            'departamento_id' => [
                'sometimes',
                'integer',
                Rule::exists('departamentos', 'id')->where(fn ($query) => $query
                    ->where('empresa_id', $empresaId)
                    ->where('filial_id', $filialId)
                    ->where('unidade_administrativa_id', $unidadeId)),
            ],
            'nome' => [
                'sometimes',
                'required',
                'string',
                'max:180',
                function (string $attribute, mixed $value, \Closure $fail) use ($local, $empresaId, $filialId, $unidadeId, $departamentoId): void {
                    $exists = DB::table('locais')
                        ->where('empresa_id', $empresaId)
                        ->where('filial_id', $filialId)
                        ->where('unidade_administrativa_id', $unidadeId)
                        ->where('departamento_id', $departamentoId)
                        ->whereRaw('LOWER(TRIM(nome)) = LOWER(TRIM(?))', [(string) $value])
                        ->where('id', '<>', (int) ($local?->id ?? 0))
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
