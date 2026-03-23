<?php

namespace App\Domain\AssetRegistry\Controllers;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\AssetRegistry\Models\BemPatrimonialDocumento;
use App\Domain\AssetRegistry\Requests\StoreBemPatrimonialDocumentoRequest;
use App\Domain\AssetRegistry\Requests\UpdateBemPatrimonialDocumentoRequest;
use App\Domain\AssetRegistry\Resources\BemPatrimonialDocumentoResource;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BemPatrimonialDocumentoController extends Controller
{
    public function store(StoreBemPatrimonialDocumentoRequest $request, BemPatrimonial $bem): JsonResponse
    {
        $this->empresaContext()->garantirModelDaEmpresa($bem);
        $tipoDocumentoPadrao = $request->string('tipo_documento')->toString();

        $documentosCriados = DB::transaction(function () use ($bem, $request, $tipoDocumentoPadrao): array {
            $criados = [];

            foreach ($request->file('documentos', []) as $arquivo) {
                $nomeBase = pathinfo($arquivo->getClientOriginalName(), PATHINFO_FILENAME);
                $nomeArquivo = Str::slug($nomeBase, '-') . '-' . Str::uuid()->toString() . '.' . $arquivo->getClientOriginalExtension();
                $caminho = $arquivo->storeAs(
                    sprintf('bens/%d/%d/documentos', $bem->empresa_id, $bem->id),
                    $nomeArquivo,
                    'public',
                );

                $tipoDocumento = $tipoDocumentoPadrao !== ''
                    ? $tipoDocumentoPadrao
                    : ($arquivo->getClientOriginalExtension() === 'xml' ? 'XML' : 'DANFE');

                $criados[] = BemPatrimonialDocumento::query()->create([
                    'bem_patrimonial_id' => $bem->id,
                    'empresa_id' => $bem->empresa_id,
                    'filial_id' => $bem->filial_id,
                    'tipo_documento' => $tipoDocumento,
                    'caminho_arquivo' => $caminho,
                    'nome_original' => $arquivo->getClientOriginalName(),
                    'mime_type' => $arquivo->getClientMimeType() ?? 'application/octet-stream',
                    'tamanho_bytes' => $arquivo->getSize() ?? 0,
                ]);
            }

            return $criados;
        });

        return response()->json([
            'message' => 'Documentos do bem enviados com sucesso.',
            'data' => BemPatrimonialDocumentoResource::collection(collect($documentosCriados)),
        ], 201);
    }

    public function destroy(BemPatrimonial $bem, BemPatrimonialDocumento $documento): JsonResponse
    {
        $this->empresaContext()->garantirModelDaEmpresa($bem);

        if ((int) $documento->bem_patrimonial_id !== (int) $bem->id) {
            abort(404);
        }

        $documento->delete();

        return response()->json([
            'message' => 'Documento removido com sucesso.',
        ]);
    }

    public function update(UpdateBemPatrimonialDocumentoRequest $request, BemPatrimonial $bem, BemPatrimonialDocumento $documento): JsonResponse
    {
        $this->empresaContext()->garantirModelDaEmpresa($bem);

        if ((int) $documento->bem_patrimonial_id !== (int) $bem->id) {
            abort(404);
        }

        $documento->update($request->validated());

        return response()->json([
            'message' => 'Tipo do documento atualizado com sucesso.',
            'data' => new BemPatrimonialDocumentoResource($documento->fresh()),
        ]);
    }
}
