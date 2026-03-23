<?php

namespace App\Domain\AssetRegistry\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBemPatrimonialDocumentoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tipo_documento' => [
                'nullable',
                'string',
                Rule::in(['NF_E', 'DANFE', 'XML', 'ORCAMENTO', 'GARANTIA']),
            ],
            'documentos' => ['required', 'array', 'min:1', 'max:5'],
            'documentos.*' => ['required', 'file', 'mimes:pdf,xml', 'max:10240'],
        ];
    }
}
