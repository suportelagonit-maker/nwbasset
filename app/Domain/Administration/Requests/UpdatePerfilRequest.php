<?php

namespace App\Domain\Administration\Requests;

use App\Domain\Shared\Enums\StatusRegistroEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePerfilRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $empresaId = (int) $this->attributes->get('empresa_id');
        $perfilId = $this->route('perfil')?->id;

        return [
            'codigo' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('perfis', 'codigo')->where(fn ($query) => $query->where('empresa_id', $empresaId))->ignore($perfilId)],
            'nome' => ['sometimes', 'required', 'string', 'max:120', Rule::unique('perfis', 'nome')->where(fn ($query) => $query->where('empresa_id', $empresaId))->ignore($perfilId)],
            'descricao' => ['nullable', 'string'],
            'status' => ['nullable', Rule::enum(StatusRegistroEnum::class)],
            'sistema' => ['nullable', 'boolean'],
            'permissao_ids' => ['sometimes', 'array'],
            'permissao_ids.*' => [Rule::exists('permissoes', 'id')->where(fn ($query) => $query->where('empresa_id', $empresaId))],
        ];
    }
}
