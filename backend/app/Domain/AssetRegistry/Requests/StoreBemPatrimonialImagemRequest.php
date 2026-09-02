<?php

namespace App\Domain\AssetRegistry\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBemPatrimonialImagemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'imagens' => ['required', 'array', 'min:1', 'max:5'],
            'imagens.*' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:6144'],
        ];
    }
}
