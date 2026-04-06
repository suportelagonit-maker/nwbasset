<?php

namespace App\Domain\Organization\Requests;

use App\Domain\Shared\Enums\StatusRegistroEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StoreFilialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $empresaId = (int) $this->attributes->get('empresa_id');

        return [
            'nome' => [
                'required',
                'string',
                'max:180',
                function (string $attribute, mixed $value, \Closure $fail) use ($empresaId): void {
                    $exists = DB::table('filiais')
                        ->where('empresa_id', $empresaId)
                        ->whereRaw('LOWER(TRIM(nome)) = LOWER(TRIM(?))', [(string) $value])
                        ->exists();

                    if ($exists) {
                        $fail('Já existe uma filial com este nome nesta empresa.');
                    }
                },
            ],
            'cnpj' => ['nullable', 'string', 'max:18', Rule::unique('filiais', 'cnpj')],
            'matriz' => ['nullable', 'boolean'],
            'endereco' => ['nullable', 'string', 'max:255'],
            'cep' => ['nullable', 'string', 'max:10'],
            'numero' => ['nullable', 'string', 'max:30'],
            'complemento' => ['nullable', 'string', 'max:120'],
            'bairro' => ['nullable', 'string', 'max:120'],
            'cidade' => ['nullable', 'string', 'max:120'],
            'estado' => ['nullable', 'string', 'size:2'],
            'status' => ['nullable', Rule::enum(StatusRegistroEnum::class)],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'nome' => is_string($this->input('nome')) ? trim($this->input('nome')) : $this->input('nome'),
        ]);
    }
}
