<?php

namespace App\Domain\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:120'],
            'empresa_id' => ['nullable', 'integer', 'exists:empresas,id'],
            'captcha_token' => ['nullable', 'string', 'max:4096'],
        ];
    }
}
