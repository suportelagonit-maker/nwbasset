<?php

namespace App\Domain\Organization\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StoreUnidadeAdministrativaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $empresaId = (int) $this->input('empresa_id');
        $filialId = (int) $this->input('filial_id');

        return [
            'empresa_id' => ['required', 'integer', Rule::exists('empresas', 'id')],
            'filial_id' => [
                'required',
                'integer',
                Rule::exists('filiais', 'id')->where(fn ($query) => $query->where('empresa_id', $this->input('empresa_id'))),
            ],
            'nome' => [
                'required',
                'string',
                'max:180',
                function (string $attribute, mixed $value, \Closure $fail) use ($empresaId, $filialId): void {
                    $exists = DB::table('unidades_administrativas')
                        ->where('empresa_id', $empresaId)
                        ->where('filial_id', $filialId)
                        ->whereRaw('LOWER(TRIM(nome)) = LOWER(TRIM(?))', [(string) $value])
                        ->exists();

                    if ($exists) {
                        $fail('Já existe uma unidade administrativa com este nome na filial selecionada.');
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
