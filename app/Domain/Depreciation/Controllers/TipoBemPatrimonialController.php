<?php

namespace App\Domain\Depreciation\Controllers;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Depreciation\Models\RegraDepreciacaoTipoBem;
use App\Domain\Depreciation\Models\TipoBemPatrimonial;
use App\Domain\Depreciation\Resources\TipoBemPatrimonialResource;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

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
            ->map(static fn (string $nome): string => mb_strtolower(trim($nome)))
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
            $chave = mb_strtolower($nome);

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
}
