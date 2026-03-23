<?php

namespace App\Domain\AssetRegistry\Controllers;

use App\Domain\AssetRegistry\Services\PlaquetaPatrimonialService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicPlaquetaLookupController extends Controller
{
    public function __construct(private readonly PlaquetaPatrimonialService $plaquetaPatrimonialService)
    {
    }

    public function show(Request $request): JsonResponse
    {
        $codigo = (string) $request->query('codigo', '');
        $plaqueta = $this->plaquetaPatrimonialService->localizarPorCodigo($codigo);

        if ($plaqueta === null || $plaqueta->bemPatrimonial === null) {
            return response()->json([
                'message' => 'Plaqueta nao encontrada.',
            ], 404);
        }

        $bem = $plaqueta->bemPatrimonial;

        return response()->json([
            'data' => [
                'plaqueta' => [
                    'id' => $plaqueta->id,
                    'codigo_plaqueta' => $plaqueta->codigo_plaqueta,
                    'numero_plaqueta' => $plaqueta->numero_plaqueta,
                    'codigo_barras_conteudo' => $plaqueta->codigo_barras_conteudo,
                    'link_consulta' => $plaqueta->link_consulta,
                    'status' => $plaqueta->status?->value ?? $plaqueta->status,
                    'data_aplicacao' => $plaqueta->data_aplicacao,
                ],
                'bem' => [
                    'id' => $bem->id,
                    'numero_tombo' => $bem->numero_tombo,
                    'descricao' => $bem->descricao,
                    'categoria' => $bem->categoria,
                    'marca' => $bem->marca,
                    'modelo' => $bem->modelo,
                    'status_bem' => $bem->status_bem,
                    'estado_conservacao' => $bem->estado_conservacao,
                ],
                'empresa' => [
                    'id' => $bem->empresa?->id,
                    'nome_fantasia' => $bem->empresa?->nome_fantasia,
                    'logo_url' => $bem->empresa?->logo_url,
                ],
                'filial' => [
                    'id' => $bem->filial?->id,
                    'nome' => $bem->filial?->nome,
                ],
                'local' => [
                    'id' => $bem->local?->id,
                    'nome' => $bem->local?->nome,
                ],
                'responsavel' => [
                    'id' => $bem->responsavel?->id,
                    'nome' => $bem->responsavel?->nome,
                    'matricula' => $bem->responsavel?->matricula,
                ],
            ],
        ]);
    }
}
