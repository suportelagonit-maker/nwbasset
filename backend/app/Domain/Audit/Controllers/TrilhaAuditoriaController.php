<?php

namespace App\Domain\Audit\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Trilha de auditoria: um feed cronologico unico do que aconteceu na
 * empresa, juntando as duas fontes que o sistema ja gravava e ninguem
 * conseguia consultar.
 *
 *  - auditoria_eventos            -> acesso e administracao (login, logout,
 *                                    criacao de usuario, mudanca de perfil)
 *  - logs_operacoes_patrimoniais  -> operacoes no patrimonio (baixa,
 *                                    transferencia, depreciacao, inventario)
 *
 * Antes cada evento caia num canto do banco sem tela. Aqui eles viram uma
 * linha do tempo filtravel — e o que um auditor pede primeiro.
 */
class TrilhaAuditoriaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $empresaId = (int) $request->attributes->get('empresa_id');

        $dados = $request->validate([
            'fonte' => ['nullable', 'in:acesso,operacao'],
            'usuario_id' => ['nullable', 'integer'],
            'data_inicial' => ['nullable', 'date'],
            'data_final' => ['nullable', 'date'],
            'busca' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $acesso = DB::table('auditoria_eventos')
            ->where('empresa_id', $empresaId)
            ->selectRaw("'acesso' as fonte, id, usuario_id, evento, entidade_tipo as entidade, entidade_id, descricao, ip_address as ip, created_at");

        $operacao = DB::table('logs_operacoes_patrimoniais')
            ->where('empresa_id', $empresaId)
            ->selectRaw("'operacao' as fonte, id, usuario_id, operacao as evento, entidade, entidade_id, CAST(NULL AS text) as descricao, CAST(NULL AS varchar) as ip, created_at");

        // O filtro de busca usa as colunas reais de cada tabela: a de
        // acesso guarda o evento em `evento`/`descricao`, a de operacao em
        // `operacao`/`entidade`.
        $this->aplicarFiltros($acesso, $dados, 'evento', 'descricao');
        $this->aplicarFiltros($operacao, $dados, 'operacao', 'entidade');

        // O filtro de fonte escolhe quais tabelas entram na uniao.
        $fonte = $dados['fonte'] ?? null;

        if ($fonte === 'acesso') {
            $uniao = $acesso;
        } elseif ($fonte === 'operacao') {
            $uniao = $operacao;
        } else {
            $uniao = $acesso->unionAll($operacao);
        }

        $trilha = DB::query()
            ->fromSub($uniao, 't')
            ->leftJoin('usuarios', 'usuarios.id', '=', 't.usuario_id')
            ->orderByDesc('t.created_at')
            ->selectRaw('t.*, usuarios.nome as usuario_nome, usuarios.email as usuario_email')
            ->paginate($dados['per_page'] ?? 20);

        $trilha->getCollection()->transform(fn ($linha): array => [
            'fonte' => $linha->fonte,
            'id' => $linha->id,
            'evento' => $linha->evento,
            'rotulo' => $this->rotuloDoEvento((string) $linha->evento),
            'entidade' => $linha->entidade,
            'entidade_id' => $linha->entidade_id,
            'descricao' => $linha->descricao,
            'ip' => $linha->ip,
            'usuario' => $linha->usuario_id ? [
                'id' => $linha->usuario_id,
                'nome' => $linha->usuario_nome,
                'email' => $linha->usuario_email,
            ] : null,
            'em' => Carbon::parse($linha->created_at)->toIso8601String(),
        ]);

        return response()->json([
            'data' => $trilha->items(),
            'meta' => [
                'pagina' => $trilha->currentPage(),
                'por_pagina' => $trilha->perPage(),
                'total' => $trilha->total(),
                'ultima_pagina' => $trilha->lastPage(),
            ],
        ]);
    }

    /** @param array<string, mixed> $dados */
    private function aplicarFiltros($query, array $dados, string $colunaEvento, string $colunaTexto): void
    {
        if (! empty($dados['usuario_id'])) {
            $query->where('usuario_id', (int) $dados['usuario_id']);
        }

        if (! empty($dados['data_inicial'])) {
            $query->whereDate('created_at', '>=', $dados['data_inicial']);
        }

        if (! empty($dados['data_final'])) {
            $query->whereDate('created_at', '<=', $dados['data_final']);
        }

        if (! empty($dados['busca'])) {
            $termo = '%'.mb_strtolower($dados['busca']).'%';
            $query->where(function ($inner) use ($termo, $colunaEvento, $colunaTexto): void {
                $inner->whereRaw("LOWER({$colunaEvento}) LIKE ?", [$termo])
                    ->orWhereRaw("LOWER(COALESCE({$colunaTexto}, {$colunaEvento})) LIKE ?", [$termo]);
            });
        }
    }

    private function rotuloDoEvento(string $evento): string
    {
        return match (mb_strtoupper($evento)) {
            'LOGIN', 'login' => 'Entrada no sistema',
            'LOGOUT', 'logout' => 'Saída do sistema',
            'CRIACAO', 'criacao' => 'Cadastro criado',
            'ATUALIZACAO', 'atualizacao' => 'Cadastro alterado',
            'EXCLUSAO', 'exclusao' => 'Cadastro excluído',
            'ASSOCIACAO', 'associacao' => 'Vínculo alterado',
            'BAIXA_BEM' => 'Baixa de bem',
            'TRANSFERENCIA_BEM' => 'Transferência de bem',
            'DEPRECIACAO_BEM' => 'Depreciação de bem',
            'DEPRECIACAO_COMPETENCIA_FECHADA' => 'Competência de depreciação fechada',
            'DEPRECIACAO_COMPETENCIA_REABERTA' => 'Competência de depreciação reaberta',
            'INVENTARIO_CRIADO' => 'Inventário criado',
            'INVENTARIO_CONCILIADO' => 'Inventário conciliado',
            'INVENTARIO_ITEM_ATUALIZADO' => 'Item de inventário atualizado',
            default => ucfirst(mb_strtolower(str_replace('_', ' ', $evento))),
        };
    }
}
