<?php

namespace App\Domain\AssetRegistry\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBemPatrimonialDocumentoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tipo_documento' => [
                'required',
                'string',
                Rule::in(['NF_E', 'DANFE', 'XML', 'ORCAMENTO', 'GARANTIA']),
            ],
        ];
    }
}
