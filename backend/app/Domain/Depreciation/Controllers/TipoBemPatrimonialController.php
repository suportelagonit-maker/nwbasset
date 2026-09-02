<?php

namespace App\Domain\Depreciation\Controllers;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Depreciation\Models\RegraDepreciacaoTipoBem;
use App\Domain\Depreciation\Models\TipoBemPatrimonial;
use App\Domain\Depreciation\Resources\TipoBemPatrimonialResource;
use App\Domain\Depreciation\Requests\StoreTipoBemPatrimonialRequest;
use App\Domain\Depreciation\Requests\UpdateTipoBemPatrimonialRequest;
use App\Http\Controllers\Controller;
use App\Domain\AssetRegistry\Models\TipoProduto;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class TipoBemPatrimonialController extends Controller
{
    private const TIPOS_PADRAO = [
        'Equipamentos',
        'Informatica',
        'Veiculos',
        'Mobiliario',
        'Utensilios',
        'Terrenos',
        'Edificacoes',
        'Imoveis',
    ];

    public function index(Request $request)
    {
        $empresaId = (int) $request->attributes->get('empresa_id');

        if (! Schema::hasTable('tipos_bens_patrimoniais')) {
            $data = $this->montarFallbackTipos($empresaId)->map(static fn (string $nome): array => [
                'id' => null,
                'empresa_id' => $empresaId,
                'nome' => $nome,
                'created_at' => null,
                'updated_at' => null,
            ])->values();

            return response()->json(['data' => $data]);
        }

        $this->sincronizarTiposDaEmpresa($empresaId);

        $query = TipoBemPatrimonial::query()
            ->where('empresa_id', $empresaId)
            ->orderBy('nome');

        if ($request->filled('nome')) {
            $query->where('nome', 'ilike', '%' . trim((string) $request->input('nome')) . '%');
        }

        return TipoBemPatrimonialResource::collection($query->get());
    }

    public function store(StoreTipoBemPatrimonialRequest $request)
    {
        if (! Schema::hasTable('tipos_bens_patrimoniais')) {
            return response()->json(['message' => 'Tabela tipos_bens_patrimoniais não existe. Rode as migrations.'], 400);
        }

        $payload = $request->validated();
        $payload['empresa_id'] = (int) $request->attributes->get('empresa_id');

        $tipo = TipoBemPatrimonial::query()->create($payload);

        return new TipoBemPatrimonialResource($tipo);
    }

    public function update(UpdateTipoBemPatrimonialRequest $request, TipoBemPatrimonial $tipo_bem)
    {
        if (! Schema::hasTable('tipos_bens_patrimoniais')) {
            return response()->json(['message' => 'Tabela tipos_bens_patrimoniais não existe. Rode as migrations.'], 400);
        }

        if ((int) $tipo_bem->empresa_id !== (int) $request->attributes->get('empresa_id')) {
            abort(403, 'Acesso negado a tipo de bem de outra empresa.');
        }

        $tipo_bem->update($request->validated());

        return new TipoBemPatrimonialResource($tipo_bem);
    }

    public function destroy(Request $request, TipoBemPatrimonial $tipo_bem)
    {
        if (! Schema::hasTable('tipos_bens_patrimoniais')) {
            return response()->json(['message' => 'Tabela tipos_bens_patrimoniais não existe. Rode as migrations.'], 400);
        }

        if ((int) $tipo_bem->empresa_id !== (int) $request->attributes->get('empresa_id')) {
            abort(403, 'Acesso negado a tipo de bem de outra empresa.');
        }

        if ($tipo_bem->regrasDepreciacao()->exists()) {
            return response()->json([
                'message' => 'Não é possível excluir: existem regras de depreciação vinculadas a este tipo de bem.',
            ], 409);
        }

        if (Schema::hasTable('tipos_produtos') && TipoProduto::query()
            ->where('empresa_id', $tipo_bem->empresa_id)
            ->where('tipo_bem_id', $tipo_bem->id)
            ->exists()) {
            return response()->json([
                'message' => 'Não é possível excluir: existem tipos de produto vinculados a este tipo de bem.',
            ], 409);
        }

        try {
            $tipo_bem->delete();
        } catch (QueryException $exception) {
            return response()->json([
                'message' => 'Não foi possível excluir. Remova os vínculos antes de tentar novamente.',
            ], 409);
        }

        return response()->json(['message' => 'Tipo de bem excluído com sucesso.']);
    }

    private function montarFallbackTipos(int $empresaId)
    {
        return collect(self::TIPOS_PADRAO)
            ->merge(
                BemPatrimonial::query()
                    ->where('empresa_id', $empresaId)
                    ->whereNotNull('categoria')
                    ->pluck('categoria')
                    ->map(static fn (?string $categoria): string => trim((string) $categoria)),
            )
            ->merge(
                RegraDepreciacaoTipoBem::query()
                    ->where('empresa_id', $empresaId)
                    ->pluck('tipo_bem')
                    ->map(static fn (?string $tipoBem): string => trim((string) $tipoBem)),
            )
            ->map(static fn (string $nome): string => trim($nome))
            ->filter(static fn (string $nome): bool => $nome !== '')
            ->unique(static fn (string $nome): string => mb_strtolower($nome))
            ->sort(static fn (string $a, string $b): int => strcasecmp($a, $b));
    }

    private function sincronizarTiposDaEmpresa(int $empresaId): void
    {
        $tiposExistentes = TipoBemPatrimonial::query()
            ->where('empresa_id', $empresaId)
            ->pluck('nome')
            ->map(fn (string $nome): string => $this->normalizarNome($nome))
            ->all();

        $indice = array_fill_keys($tiposExistentes, true);

        $tipos = collect(self::TIPOS_PADRAO)
            ->merge(
                BemPatrimonial::query()
                    ->where('empresa_id', $empresaId)
                    ->whereNotNull('categoria')
                    ->pluck('categoria')
                    ->map(static fn (?string $categoria): string => trim((string) $categoria)),
            )
            ->merge(
                RegraDepreciacaoTipoBem::query()
                    ->where('empresa_id', $empresaId)
                    ->pluck('tipo_bem')
                    ->map(static fn (?string $tipoBem): string => trim((string) $tipoBem)),
            )
            ->map(static fn (string $nome): string => trim($nome))
            ->filter(static fn (string $nome): bool => $nome !== '');

        $inserir = [];

        foreach ($tipos as $nome) {
            $chave = $this->normalizarNome($nome);

            if (isset($indice[$chave])) {
                continue;
            }

            $indice[$chave] = true;
            $inserir[] = [
                'empresa_id' => $empresaId,
                'nome' => $nome,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if ($inserir !== []) {
            TipoBemPatrimonial::query()->insert($inserir);
        }
    }

    private function normalizarNome(string $valor): string
    {
        return Str::lower(Str::ascii(trim($valor)));
    }
}
