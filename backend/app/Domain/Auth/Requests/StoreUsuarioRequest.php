<?php

namespace App\Domain\Auth\Requests;

use App\Domain\Auth\Enums\RoleEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUsuarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:180'],
            'email' => ['required', 'email', 'max:255', Rule::unique('usuarios', 'email')],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['nullable', 'string', Rule::in($this->allowedRoles())],
            'ativo' => ['nullable', 'boolean'],
            'permissoes' => ['nullable', 'array'],
            'permissoes.*' => ['string', 'max:120'],
        ];
    }

    private function allowedRoles(): array
    {
        $usuario = $this->user();

        if ($usuario && method_exists($usuario, 'isSuperAdmin') && $usuario->isSuperAdmin()) {
            return RoleEnum::values();
        }

        return [
            RoleEnum::GESTOR_PATRIMONIAL->value,
            RoleEnum::AUDITOR->value,
            RoleEnum::OPERADOR_INVENTARIO->value,
        ];
    }
}
