<?php

namespace App\Domain\AssetRegistry\Controllers;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\AssetRegistry\Models\BemPatrimonialImagem;
use App\Domain\AssetRegistry\Requests\StoreBemPatrimonialImagemRequest;
use App\Domain\AssetRegistry\Requests\UpdateBemPatrimonialImagemOrdenacaoRequest;
use App\Domain\AssetRegistry\Resources\BemPatrimonialImagemResource;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BemPatrimonialImagemController extends Controller
{
    public function store(StoreBemPatrimonialImagemRequest $request, BemPatrimonial $bem): JsonResponse
    {
        $this->empresaContext()->garantirModelDaEmpresa($bem);

        $quantidadeAtual = $bem->imagens()->count();
        $novasImagens = count($request->file('imagens', []));

        if (($quantidadeAtual + $novasImagens) > 5) {
            return response()->json([
                'message' => 'O bem patrimonial permite no maximo 5 imagens.',
            ], 422);
        }

        $proximaOrdem = (int) $bem->imagens()->max('ordem');
        $temImagemPrincipal = $bem->imagens()->where('principal', true)->exists();
        $imagensCriadas = DB::transaction(function () use ($bem, $request, $proximaOrdem, $temImagemPrincipal): array {
            $criadas = [];

            foreach ($request->file('imagens', []) as $index => $arquivo) {
                $nomeBase = pathinfo($arquivo->getClientOriginalName(), PATHINFO_FILENAME);
                $nomeArquivo = Str::slug($nomeBase, '-') . '-' . Str::uuid()->toString() . '.' . $arquivo->getClientOriginalExtension();
                $caminho = $arquivo->storeAs(
                    sprintf('bens/%d/%d', $bem->empresa_id, $bem->id),
                    $nomeArquivo,
                    'public',
                );

                $criadas[] = BemPatrimonialImagem::query()->create([
                    'bem_patrimonial_id' => $bem->id,
                    'empresa_id' => $bem->empresa_id,
                    'filial_id' => $bem->filial_id,
                    'caminho_arquivo' => $caminho,
                    'nome_original' => $arquivo->getClientOriginalName(),
                    'mime_type' => $arquivo->getClientMimeType() ?? 'application/octet-stream',
                    'tamanho_bytes' => $arquivo->getSize() ?? 0,
                    'ordem' => $proximaOrdem + $index + 1,
                    'principal' => !$temImagemPrincipal && $index === 0,
                ]);
            }

            return $criadas;
        });

        return response()->json([
            'message' => 'Imagens do bem enviadas com sucesso.',
            'data' => BemPatrimonialImagemResource::collection(collect($imagensCriadas)),
        ], 201);
    }

    public function destroy(BemPatrimonial $bem, BemPatrimonialImagem $imagem): JsonResponse
    {
        $this->empresaContext()->garantirModelDaEmpresa($bem);

        if ((int) $imagem->bem_patrimonial_id !== (int) $bem->id) {
            abort(404);
        }

        $imagem->delete();

        return response()->json([
            'message' => 'Imagem removida com sucesso.',
        ]);
    }

    public function definirPrincipal(BemPatrimonial $bem, BemPatrimonialImagem $imagem): JsonResponse
    {
        $this->empresaContext()->garantirModelDaEmpresa($bem);

        if ((int) $imagem->bem_patrimonial_id !== (int) $bem->id) {
            abort(404);
        }

        DB::transaction(function () use ($bem, $imagem): void {
            $bem->imagens()->update(['principal' => false]);
            $imagem->forceFill(['principal' => true])->save();
        });

        return response()->json([
            'message' => 'Imagem principal definida com sucesso.',
            'data' => new BemPatrimonialImagemResource($imagem->fresh()),
        ]);
    }

    public function reordenar(UpdateBemPatrimonialImagemOrdenacaoRequest $request, BemPatrimonial $bem): JsonResponse
    {
        $this->empresaContext()->garantirModelDaEmpresa($bem);

        $ids = collect($request->validated()['imagens'])->map(fn ($id) => (int) $id)->values();
        $imagensBem = $bem->imagens()->pluck('id')->map(fn ($id) => (int) $id)->values();

        if ($ids->sort()->values()->all() !== $imagensBem->sort()->values()->all()) {
            return response()->json([
                'message' => 'A ordenacao enviada nao corresponde ao conjunto de imagens do bem.',
            ], 422);
        }

        DB::transaction(function () use ($ids): void {
            $ids->each(function (int $id, int $index): void {
                BemPatrimonialImagem::query()
                    ->whereKey($id)
                    ->update(['ordem' => $index + 1]);
            });
        });

        return response()->json([
            'message' => 'Ordem das imagens atualizada com sucesso.',
        ]);
    }
}
