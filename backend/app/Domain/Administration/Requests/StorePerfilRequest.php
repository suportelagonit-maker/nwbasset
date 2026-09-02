<?php

namespace App\Domain\Administration\Requests;

use App\Domain\Shared\Enums\StatusRegistroEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePerfilRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $empresaId = (int) $this->attributes->get('empresa_id');

        return [
            'codigo' => ['required', 'string', 'max:50', Rule::unique('perfis', 'codigo')->where(fn ($query) => $query->where('empresa_id', $empresaId))],
            'nome' => ['required', 'string', 'max:120', Rule::unique('perfis', 'nome')->where(fn ($query) => $query->where('empresa_id', $empresaId))],
            'descricao' => ['nullable', 'string'],
            'status' => ['nullable', Rule::enum(StatusRegistroEnum::class)],
            'sistema' => ['nullable', 'boolean'],
            'permissao_ids' => ['array'],
            'permissao_ids.*' => [Rule::exists('permissoes', 'id')->where(fn ($query) => $query->where('empresa_id', $empresaId))],
        ];
    }
}
