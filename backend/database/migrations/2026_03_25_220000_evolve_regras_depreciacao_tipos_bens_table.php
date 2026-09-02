<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('regras_depreciacao_tipos_bens')) {
            return;
        }

        Schema::table('regras_depreciacao_tipos_bens', function (Blueprint $table): void {
            if (! Schema::hasColumn('regras_depreciacao_tipos_bens', 'tipo_bem_id')) {
                $table->foreignId('tipo_bem_id')
                    ->nullable()
                    ->after('empresa_id')
                    ->constrained('tipos_bens_patrimoniais')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('regras_depreciacao_tipos_bens', 'nome_regra')) {
                $table->string('nome_regra', 150)->nullable()->after('tipo_bem');
            }

            if (! Schema::hasColumn('regras_depreciacao_tipos_bens', 'base_regra')) {
                $table->string('base_regra', 20)->default('fiscal')->after('nome_regra');
            }

            if (! Schema::hasColumn('regras_depreciacao_tipos_bens', 'metodo_depreciacao')) {
                $table->string('metodo_depreciacao', 40)->default('linha_reta')->after('metodo_depreciacao_id');
            }

            if (! Schema::hasColumn('regras_depreciacao_tipos_bens', 'taxa_anual_percentual')) {
                $table->decimal('taxa_anual_percentual', 8, 4)->nullable()->after('taxa_anual');
            }

            if (! Schema::hasColumn('regras_depreciacao_tipos_bens', 'depreciavel')) {
                $table->boolean('depreciavel')->default(true)->after('valor_residual_percentual');
            }

            if (! Schema::hasColumn('regras_depreciacao_tipos_bens', 'requer_override_manual')) {
                $table->boolean('requer_override_manual')->default(false)->after('depreciavel');
            }

            if (! Schema::hasColumn('regras_depreciacao_tipos_bens', 'data_inicio_vigencia')) {
                $table->date('data_inicio_vigencia')->nullable()->after('requer_override_manual');
            }

            if (! Schema::hasColumn('regras_depreciacao_tipos_bens', 'data_fim_vigencia')) {
                $table->date('data_fim_vigencia')->nullable()->after('data_inicio_vigencia');
            }

            if (! Schema::hasColumn('regras_depreciacao_tipos_bens', 'ativo')) {
                $table->boolean('ativo')->default(true)->after('data_fim_vigencia');
            }

            if (! Schema::hasColumn('regras_depreciacao_tipos_bens', 'observacoes')) {
                $table->text('observacoes')->nullable()->after('ativo');
            }

            if (! Schema::hasColumn('regras_depreciacao_tipos_bens', 'criado_por')) {
                $table->foreignId('criado_por')->nullable()->after('observacoes')->constrained('usuarios')->nullOnDelete();
            }

            if (! Schema::hasColumn('regras_depreciacao_tipos_bens', 'atualizado_por')) {
                $table->foreignId('atualizado_por')->nullable()->after('criado_por')->constrained('usuarios')->nullOnDelete();
            }
        });

        DB::table('regras_depreciacao_tipos_bens')
            ->whereNull('taxa_anual_percentual')
            ->update(['taxa_anual_percentual' => DB::raw('COALESCE(taxa_anual, 0)')]);

        DB::table('regras_depreciacao_tipos_bens')
            ->whereNull('data_inicio_vigencia')
            ->update(['data_inicio_vigencia' => now()->toDateString()]);

        DB::table('regras_depreciacao_tipos_bens')
            ->whereNull('nome_regra')
            ->update(['nome_regra' => DB::raw("CONCAT('Regra padrão - ', tipo_bem)")]);

        DB::statement("
            UPDATE regras_depreciacao_tipos_bens r
               SET metodo_depreciacao = CASE
                    WHEN md.codigo = 'SOMA_DIGITOS' THEN 'soma_digitos'
                    WHEN md.codigo = 'UNIDADES_PRODUZIDAS' THEN 'unidades_produzidas'
                    ELSE 'linha_reta'
                END
              FROM metodos_depreciacao md
             WHERE r.metodo_depreciacao_id = md.id
               AND (r.metodo_depreciacao IS NULL OR r.metodo_depreciacao = '')
        ");

        if (Schema::hasTable('tipos_bens_patrimoniais')) {
            DB::statement("
                INSERT INTO tipos_bens_patrimoniais (empresa_id, nome, created_at, updated_at)
                SELECT e.id, v.nome, NOW(), NOW()
                  FROM empresas e
                  CROSS JOIN (
                      VALUES
                        ('Equipamentos'),
                        ('Informatica'),
                        ('Veiculos'),
                        ('Mobiliario'),
                        ('Utensilios'),
                        ('Terrenos'),
                        ('Edificacoes'),
                        ('Imoveis')
                  ) AS v(nome)
             LEFT JOIN tipos_bens_patrimoniais t
                    ON t.empresa_id = e.id
                   AND LOWER(t.nome) = LOWER(v.nome)
                 WHERE t.id IS NULL
            ");

            DB::statement("
                INSERT INTO tipos_bens_patrimoniais (empresa_id, nome, created_at, updated_at)
                SELECT DISTINCT r.empresa_id, r.tipo_bem, NOW(), NOW()
                  FROM regras_depreciacao_tipos_bens r
             LEFT JOIN tipos_bens_patrimoniais t
                    ON t.empresa_id = r.empresa_id
                   AND LOWER(t.nome) = LOWER(r.tipo_bem)
                 WHERE t.id IS NULL
                   AND TRIM(COALESCE(r.tipo_bem, '')) <> ''
            ");

            DB::statement("
                UPDATE regras_depreciacao_tipos_bens r
                   SET tipo_bem_id = t.id
                  FROM tipos_bens_patrimoniais t
                 WHERE t.empresa_id = r.empresa_id
                   AND LOWER(t.nome) = LOWER(r.tipo_bem)
                   AND r.tipo_bem_id IS NULL
            ");
        }

        DB::statement("
            UPDATE regras_depreciacao_tipos_bens
               SET depreciavel = false,
                   taxa_anual = 0,
                   taxa_anual_percentual = 0
             WHERE LOWER(tipo_bem) LIKE '%terreno%'
        ");

        try {
            Schema::table('regras_depreciacao_tipos_bens', function (Blueprint $table): void {
                $table->dropUnique('regras_depreciacao_tipos_bens_empresa_id_tipo_bem_unique');
            });
        } catch (\Throwable) {
        }

        try {
            Schema::table('regras_depreciacao_tipos_bens', function (Blueprint $table): void {
                $table->unique(
                    ['empresa_id', 'tipo_bem', 'base_regra', 'data_inicio_vigencia'],
                    'regra_dep_empresa_tipo_base_inicio_unique'
                );
            });
        } catch (\Throwable) {
        }

        try {
            Schema::table('regras_depreciacao_tipos_bens', function (Blueprint $table): void {
                $table->index(
                    ['empresa_id', 'tipo_bem', 'base_regra', 'ativo', 'data_inicio_vigencia', 'data_fim_vigencia'],
                    'regra_dep_consulta_vigencia_idx'
                );
            });
        } catch (\Throwable) {
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('regras_depreciacao_tipos_bens')) {
            return;
        }

        try {
            Schema::table('regras_depreciacao_tipos_bens', function (Blueprint $table): void {
                $table->dropIndex('regra_dep_consulta_vigencia_idx');
            });
        } catch (\Throwable) {
        }

        try {
            Schema::table('regras_depreciacao_tipos_bens', function (Blueprint $table): void {
                $table->dropUnique('regra_dep_empresa_tipo_base_inicio_unique');
            });
        } catch (\Throwable) {
        }

        try {
            Schema::table('regras_depreciacao_tipos_bens', function (Blueprint $table): void {
                $table->unique(['empresa_id', 'tipo_bem']);
            });
        } catch (\Throwable) {
        }

        Schema::table('regras_depreciacao_tipos_bens', function (Blueprint $table): void {
            foreach (['tipo_bem_id', 'nome_regra', 'base_regra', 'metodo_depreciacao', 'taxa_anual_percentual', 'depreciavel', 'requer_override_manual', 'data_inicio_vigencia', 'data_fim_vigencia', 'ativo', 'observacoes', 'criado_por', 'atualizado_por'] as $column) {
                if (Schema::hasColumn('regras_depreciacao_tipos_bens', $column)) {
                    if (in_array($column, ['tipo_bem_id', 'criado_por', 'atualizado_por'], true)) {
                        try {
                            $table->dropConstrainedForeignId($column);
                        } catch (\Throwable) {
                            $table->dropColumn($column);
                        }
                    } else {
                        $table->dropColumn($column);
                    }
                }
            }
        });
    }
};

