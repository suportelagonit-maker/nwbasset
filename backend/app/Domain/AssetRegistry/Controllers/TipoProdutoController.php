<?php

namespace App\Domain\AssetRegistry\Controllers;

use App\Domain\AssetRegistry\Models\TipoProduto;
use App\Domain\AssetRegistry\Requests\StoreTipoProdutoRequest;
use App\Domain\AssetRegistry\Requests\UpdateTipoProdutoRequest;
use App\Domain\AssetRegistry\Resources\TipoProdutoResource;
use App\Domain\Depreciation\Models\TipoBemPatrimonial;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class TipoProdutoController extends Controller
{
    private const PRESETS = [
        'informatica' => [
            'Computador',
            'Notebook',
            'Monitor',
            'Impressora',
            'Servidor',
            'Equipamento de rede',
        ],
        'equipamentos' => [
            'Projetor',
            'Nobreak',
            'Ar-condicionado',
            'Ferramenta elétrica',
        ],
        'mobiliario' => [
            'Cadeira',
            'Mesa',
            'Armário',
            'Estante',
            'Bancada',
        ],
        'utensilios' => [
            'Copa/Cozinha',
            'Limpeza',
            'Escritório',
            'Ferramenta manual',
        ],
        'veiculos' => [
            'Carro',
            'Moto',
            'Van',
            'Caminhão',
            'Ônibus',
        ],
    ];

    public function index(Request $request)
    {
        $empresaId = (int) $request->attributes->get('empresa_id');

        if (! Schema::hasTable('tipos_produtos')) {
            return response()->json([
                'data' => $this->presetData($empresaId),
            ]);
        }

        $this->sincronizarPresets($empresaId);

        $query = TipoProduto::query()
            ->where('empresa_id', $empresaId)
            ->orderBy('nome');

        if ($request->filled('tipo_bem_id')) {
            $query->where('tipo_bem_id', $request->integer('tipo_bem_id'));
        }

        if ($request->filled('ativo')) {
            $query->where('ativo', (bool) $request->boolean('ativo'));
        }

        return TipoProdutoResource::collection($query->get());
    }

    public function store(StoreTipoProdutoRequest $request)
    {
        if (! Schema::hasTable('tipos_produtos')) {
            return response()->json([
                'message' => 'Tabela tipos_produtos não existe. Rode as migrations.',
            ], 400);
        }

        $payload = $request->validated();
        $payload['empresa_id'] = (int) $request->attributes->get('empresa_id');
        $payload['ativo'] = array_key_exists('ativo', $payload) ? (bool) $payload['ativo'] : true;

        $tipoProduto = TipoProduto::query()->create($payload);

        return new TipoProdutoResource($tipoProduto);
    }

    public function update(UpdateTipoProdutoRequest $request, TipoProduto $tipos_produto)
    {
        if ((int) $tipos_produto->empresa_id !== (int) $request->attributes->get('empresa_id')) {
            abort(403, 'Acesso negado ao produto de outra empresa.');
        }

        $payload = $request->validated();
        if (array_key_exists('ativo', $payload)) {
            $payload['ativo'] = (bool) $payload['ativo'];
        }
        $tipos_produto->update($payload);

        return new TipoProdutoResource($tipos_produto);
    }

    public function destroy(Request $request, TipoProduto $tipos_produto)
    {
        if ((int) $tipos_produto->empresa_id !== (int) $request->attributes->get('empresa_id')) {
            abort(403, 'Acesso negado ao produto de outra empresa.');
        }

        $tipos_produto->delete();

        return response()->noContent();
    }

    private function presetData(int $empresaId): array
    {
        $items = [];
        foreach (self::PRESETS as $tipo => $produtos) {
            foreach ($produtos as $idx => $produto) {
                $items[] = [
                    'id' => null,
                    'empresa_id' => $empresaId,
                    'tipo_bem_id' => null,
                    'tipo_bem' => $tipo,
                    'nome' => $produto,
                    'descricao' => null,
                    'ativo' => true,
                    'created_at' => null,
                    'updated_at' => null,
                    'preset' => true,
                    'ordem' => $idx + 1,
                ];
            }
        }

        return $items;
    }

    private function sincronizarPresets(int $empresaId): void
    {
        $existentes = TipoProduto::query()
            ->where('empresa_id', $empresaId)
            ->get()
            ->reduce(function (array $carry, TipoProduto $item): array {
                $carry[$this->normalizarNome($item->nome)] = true;
                return $carry;
            }, []);

        $lookupTipoBemId = $this->mapearTipoBemIds($empresaId);
        $inserir = [];

        foreach (self::PRESETS as $tipo => $produtos) {
            $tipoKey = $this->normalizarNome($tipo);
            $tipoBemId = $lookupTipoBemId[$tipoKey] ?? null;

            foreach ($produtos as $produto) {
                $nomeNormalizado = $this->normalizarNome($produto);
                if (isset($existentes[$nomeNormalizado])) {
                    continue;
                }

                $existentes[$nomeNormalizado] = true;
                $inserir[] = [
                    'empresa_id' => $empresaId,
                    'tipo_bem_id' => $tipoBemId,
                    'nome' => $produto,
                    'descricao' => null,
                    'ativo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        if ($inserir !== []) {
            TipoProduto::query()->insert($inserir);
        }
    }

    private function mapearTipoBemIds(int $empresaId): array
    {
        if (! Schema::hasTable('tipos_bens_patrimoniais')) {
            return [];
        }

        return TipoBemPatrimonial::query()
            ->where('empresa_id', $empresaId)
            ->get()
            ->reduce(function (array $carry, TipoBemPatrimonial $item): array {
                $carry[$this->normalizarNome($item->nome ?? $item->tipo_bem ?? '')] = $item->id;
                return $carry;
            }, []);
    }

    private function normalizarNome(string $valor): string
    {
        $plain = iconv('UTF-8', 'ASCII//TRANSLIT', $valor);
        return strtolower(trim($plain ?? $valor));
    }
}
