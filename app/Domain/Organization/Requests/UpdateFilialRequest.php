<?php

namespace App\Domain\Organization\Requests;

use App\Domain\Shared\Enums\StatusRegistroEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFilialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $filialId = $this->route('filial')?->id;

        return [
            'nome' => ['sometimes', 'required', 'string', 'max:180'],
            'cnpj' => ['nullable', 'string', 'max:18', Rule::unique('filiais', 'cnpj')->ignore($filialId)],
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
}
