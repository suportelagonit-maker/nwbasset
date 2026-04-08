<?php

namespace App\Domain\AssetRegistry\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class UpdateTipoProdutoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tipoBemRules = ['nullable', 'integer'];
        if (Schema::hasTable('tipos_bens_patrimoniais')) {
            $tipoBemRules[] = Rule::exists('tipos_bens_patrimoniais', 'id')
                ->where('empresa_id', (int) $this->attributes->get('empresa_id'));
        }

        return [
            'tipo_bem_id' => $tipoBemRules,
            'nome' => ['sometimes', 'required', 'string', 'max:150'],
            'descricao' => ['nullable', 'string', 'max:500'],
            'ativo' => ['nullable', 'boolean'],
        ];
    }
}
