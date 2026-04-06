<?php

namespace App\Domain\Organization\Requests;

use App\Domain\Shared\Enums\StatusRegistroEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StoreEmpresaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $razaoSocial = (string) $this->input('razao_social', '');
        $nomeFantasia = (string) $this->input('nome_fantasia', '');

        return [
            'razao_social' => [
                'required',
                'string',
                'max:180',
                function (string $attribute, mixed $value, \Closure $fail) use ($razaoSocial): void {
                    $exists = DB::table('empresas')
                        ->whereRaw('LOWER(TRIM(razao_social)) = LOWER(TRIM(?))', [$razaoSocial])
                        ->exists();

                    if ($exists) {
                        $fail('Já existe uma empresa com esta razão social.');
                    }
                },
            ],
            'nome_fantasia' => [
                'required',
                'string',
                'max:180',
                function (string $attribute, mixed $value, \Closure $fail) use ($nomeFantasia): void {
                    $exists = DB::table('empresas')
                        ->whereRaw('LOWER(TRIM(nome_fantasia)) = LOWER(TRIM(?))', [$nomeFantasia])
                        ->exists();

                    if ($exists) {
                        $fail('Já existe uma empresa com este nome fantasia.');
                    }
                },
            ],
            'cnpj' => ['required', 'string', 'max:18', Rule::unique('empresas', 'cnpj')],
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

    protected function prepareForValidation(): void
    {
        $this->merge([
            'razao_social' => is_string($this->input('razao_social')) ? trim($this->input('razao_social')) : $this->input('razao_social'),
            'nome_fantasia' => is_string($this->input('nome_fantasia')) ? trim($this->input('nome_fantasia')) : $this->input('nome_fantasia'),
        ]);
    }
}
