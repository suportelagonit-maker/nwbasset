<?php

namespace App\Domain\Auth\Resources;

use App\Domain\Auth\Models\RolePermissao;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UsuarioResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'empresa_id' => $this->empresa_id,
            'nome' => $this->nome,
            'email' => $this->email,
            'role' => $this->role,
            'is_super_admin' => method_exists($this->resource, 'isSuperAdmin')
                ? $this->resource->isSuperAdmin()
                : false,
            'role_atual' => method_exists($this->resource, 'roleForEmpresa')
                ? $this->resource->roleForEmpresa($request->attributes->get('empresa_id'))
                : $this->role,
            'permissoes' => method_exists($this->resource, 'permissoesDiretasLista')
                ? $this->resolvePermissoes($request)
                : [],
            'ativo' => (bool) $this->ativo,
            'ultimo_login_em' => $this->ultimo_login_em,
            'empresa_atual' => $this->when(
                $this->resource->relationLoaded('empresa') && $this->empresa !== null,
                fn () => [
                    'id' => $this->empresa->id,
                    'nome_fantasia' => $this->empresa->nome_fantasia,
                    'cnpj' => $this->empresa->cnpj,
                    'logo_url' => $this->empresa->logo_url,
                ],
            ),
            'empresas' => method_exists($this->resource, 'empresasAcessiveis')
                ? $this->resource->empresasAcessiveis()->map(fn ($empresa) => [
                    'id' => $empresa->id,
                    'nome_fantasia' => $empresa->nome_fantasia,
                    'cnpj' => $empresa->cnpj,
                    'logo_url' => $empresa->logo_url,
                    'perfil' => $empresa->pivot?->perfil,
                ])->values()
                : $this->whenLoaded('empresas', fn () => $this->empresas->map(fn ($empresa) => [
                    'id' => $empresa->id,
                    'nome_fantasia' => $empresa->nome_fantasia,
                    'cnpj' => $empresa->cnpj,
                    'logo_url' => $empresa->logo_url,
                    'perfil' => $empresa->pivot?->perfil,
                ])->values()),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    private function resolvePermissoes(Request $request): array
    {
        $empresaId = $request->attributes->get('empresa_id');
        $diretas = $this->resource->permissoesDiretasLista($empresaId);

        if ($diretas !== []) {
            return $diretas;
        }

        $role = method_exists($this->resource, 'roleForEmpresa')
            ? $this->resource->roleForEmpresa($empresaId)
            : $this->role;

        return RolePermissao::query()
            ->where('role', $role)
            ->orderBy('permissao')
            ->pluck('permissao')
            ->all();
    }
}
