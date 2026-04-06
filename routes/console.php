<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('data:dedupe-master-data {--dry-run : Apenas simula, sem aplicar alterações}', function () {
    $dryRun = (bool) $this->option('dry-run');

    $targets = [
        [
            'table' => 'filiais',
            'scopeColumns' => ['empresa_id'],
            'normalizedTextColumns' => ['nome'],
        ],
        [
            'table' => 'unidades_administrativas',
            'scopeColumns' => ['empresa_id', 'filial_id'],
            'normalizedTextColumns' => ['nome'],
        ],
        [
            'table' => 'departamentos',
            'scopeColumns' => ['empresa_id', 'filial_id', 'unidade_administrativa_id'],
            'normalizedTextColumns' => ['nome'],
        ],
        [
            'table' => 'locais',
            'scopeColumns' => ['empresa_id', 'filial_id', 'unidade_administrativa_id', 'departamento_id'],
            'normalizedTextColumns' => ['nome'],
        ],
    ];

    $targetTables = array_map(static fn (array $target): string => $target['table'], $targets);
    $placeholders = implode(',', array_fill(0, count($targetTables), '?'));

    $foreignKeys = DB::select(
        <<<SQL
        SELECT
            ccu.table_name AS referenced_table,
            kcu.table_name AS referencing_table,
            kcu.column_name AS referencing_column
        FROM information_schema.table_constraints tc
        INNER JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        INNER JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
            AND ccu.column_name = 'id'
            AND ccu.table_name IN ($placeholders)
        ORDER BY ccu.table_name, kcu.table_name, kcu.column_name
        SQL,
        $targetTables,
    );

    $foreignKeyMap = [];
    foreach ($foreignKeys as $foreignKey) {
        $foreignKeyMap[$foreignKey->referenced_table][] = [
            'table' => $foreignKey->referencing_table,
            'column' => $foreignKey->referencing_column,
        ];
    }

    $stats = [
        'groups' => 0,
        'updatedReferences' => 0,
        'deletedRows' => 0,
    ];

    $processTargets = function () use ($targets, $foreignKeyMap, $dryRun, &$stats): int {
        $changes = 0;

        foreach ($targets as $target) {
            $table = $target['table'];
            $scopeColumns = $target['scopeColumns'];
            $normalizedTextColumns = $target['normalizedTextColumns'];

            $selectParts = ['MIN(id) AS keep_id', "STRING_AGG(id::text, ',' ORDER BY id) AS ids_csv", 'COUNT(*) AS total'];
            $groupParts = [];

            foreach ($scopeColumns as $scopeColumn) {
                $selectParts[] = $scopeColumn;
                $groupParts[] = $scopeColumn;
            }

            foreach ($normalizedTextColumns as $textColumn) {
                $alias = $textColumn.'_norm';
                $expression = "LOWER(BTRIM(COALESCE($textColumn, '')))";
                $selectParts[] = "$expression AS $alias";
                $groupParts[] = $expression;
            }

            if (empty($groupParts)) {
                continue;
            }

            $duplicates = DB::select(
                sprintf(
                    'SELECT %s FROM %s GROUP BY %s HAVING COUNT(*) > 1',
                    implode(', ', $selectParts),
                    $table,
                    implode(', ', $groupParts),
                ),
            );

            if (empty($duplicates)) {
                continue;
            }

            $this->newLine();
            $this->info(sprintf('Tabela %s: %d grupo(s) duplicado(s).', $table, count($duplicates)));

            foreach ($duplicates as $duplicateGroup) {
                $ids = array_values(array_filter(array_map('intval', explode(',', (string) $duplicateGroup->ids_csv))));
                if (count($ids) < 2) {
                    continue;
                }

                $keepId = array_shift($ids);
                $stats['groups']++;

                $this->line(sprintf('  - Manter ID %d | Remover IDs [%s]', $keepId, implode(', ', $ids)));

                foreach ($ids as $duplicateId) {
                    foreach ($foreignKeyMap[$table] ?? [] as $foreignKey) {
                        $query = DB::table($foreignKey['table'])->where($foreignKey['column'], $duplicateId);
                        $affected = $dryRun ? (clone $query)->count() : $query->update([$foreignKey['column'] => $keepId]);

                        if ($affected > 0) {
                            $stats['updatedReferences'] += $affected;
                            $this->line(
                                sprintf(
                                    '    > %s.%s: %d referência(s) %s',
                                    $foreignKey['table'],
                                    $foreignKey['column'],
                                    $affected,
                                    $dryRun ? 'seriam atualizadas' : 'atualizadas',
                                ),
                            );
                        }
                    }

                    if ($dryRun) {
                        $stats['deletedRows']++;
                        $changes++;
                        continue;
                    }

                    $deleted = DB::table($table)->where('id', $duplicateId)->delete();
                    if ($deleted > 0) {
                        $stats['deletedRows'] += $deleted;
                        $changes += $deleted;
                    }
                }
            }
        }

        return $changes;
    };

    $execute = function () use (&$processTargets, $dryRun): void {
        $iteration = 1;
        do {
            $this->newLine();
            $this->comment(sprintf('Passo %d de deduplicação...', $iteration));
            $changes = $processTargets();
            $iteration++;
        } while ($changes > 0 && $iteration <= 10 && !$dryRun);
    };

    if ($dryRun) {
        $this->warn('Executando em modo simulação (dry-run). Nenhuma alteração será persistida.');
        $execute();
    } else {
        DB::transaction(function () use ($execute): void {
            $execute();
        });
    }

    $this->newLine();
    $this->info('Resumo da deduplicação:');
    $this->line(sprintf('- Grupos duplicados tratados: %d', $stats['groups']));
    $this->line(sprintf('- Referências atualizadas: %d', $stats['updatedReferences']));
    $this->line(sprintf('- Registros removidos: %d', $stats['deletedRows']));
})->purpose('Remove duplicidades de cadastros organizacionais (exceto bens patrimoniais).');
