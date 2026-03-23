<?php

namespace App\Domain\Administration\Requests;

use App\Domain\Shared\Enums\StatusRegistroEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePermissaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $empresaId = (int) $this->attributes->get('empresa_id');
        $permissaoId = $this->route('permissao')?->id;

        return [
            'grupo' => ['sometimes', 'required', 'string', 'max:80'],
            'codigo' => ['sometimes', 'required', 'string', 'max:80', Rule::unique('permissoes', 'codigo')->where(fn ($query) => $query->where('empresa_id', $empresaId))->ignore($permissaoId)],
            'nome' => ['sometimes', 'required', 'string', 'max:150'],
            'descricao' => ['nullable', 'string'],
            'status' => ['nullable', Rule::enum(StatusRegistroEnum::class)],
            'sistema' => ['nullable', 'boolean'],
        ];
    }
}
