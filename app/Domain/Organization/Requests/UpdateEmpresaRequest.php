<?php

namespace App\Domain\Organization\Requests;

use App\Domain\Shared\Enums\StatusRegistroEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmpresaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'razao_social' => ['sometimes', 'required', 'string', 'max:180'],
            'nome_fantasia' => ['sometimes', 'required', 'string', 'max:180'],
            'cnpj' => ['sometimes', 'required', 'string', 'max:18', Rule::unique('empresas', 'cnpj')->ignore($this->route('empresa')?->id)],
            'email' => ['nullable', 'email', 'max:255'],
            'telefone' => ['nullable', 'string', 'max:30'],
            'timezone' => ['nullable', 'string', 'max:80'],
            'status' => ['nullable', Rule::enum(StatusRegistroEnum::class)],
            'matriz_nome' => ['nullable', 'string', 'max:180'],
            'cep' => ['nullable', 'string', 'max:10'],
            'endereco' => ['nullable', 'string', 'max:255'],
            'numero' => ['nullable', 'string', 'max:30'],
            'complemento' => ['nullable', 'string', 'max:120'],
            'bairro' => ['nullable', 'string', 'max:120'],
            'cidade' => ['nullable', 'string', 'max:120'],
            'estado' => ['nullable', 'string', 'size:2'],
        ];
    }
}
