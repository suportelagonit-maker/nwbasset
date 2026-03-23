<?php

use App\Domain\Auth\Enums\RoleEnum;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('usuarios', function (Blueprint $table): void {
            $table->foreignId('empresa_id')
                ->nullable()
                ->after('id')
                ->constrained('empresas')
                ->nullOnDelete();
            $table->string('role', 40)
                ->default(RoleEnum::OPERADOR_INVENTARIO->value)
                ->after('password');
            $table->timestamp('ultimo_login_em')
                ->nullable()
                ->after('ativo');

            $table->index(['empresa_id', 'role', 'ativo'], 'usuarios_empresa_role_ativo_index');
        });

        DB::statement(<<<'SQL'
            UPDATE usuarios
            SET empresa_id = (
                SELECT ue.empresa_id
                FROM usuarios_empresas ue
                WHERE ue.usuario_id = usuarios.id
                ORDER BY ue.id
                LIMIT 1
            )
            WHERE empresa_id IS NULL
        SQL);

        DB::statement(<<<'SQL'
            UPDATE usuarios
            SET role = (
                SELECT CASE
                    WHEN UPPER(COALESCE(ue.perfil, '')) IN ('SUPER_ADMIN', 'ADMIN_EMPRESA', 'GESTOR_PATRIMONIAL', 'AUDITOR', 'OPERADOR_INVENTARIO') THEN UPPER(ue.perfil)
                    WHEN LOWER(COALESCE(ue.perfil, '')) = 'admin' THEN 'ADMIN_EMPRESA'
                    ELSE 'OPERADOR_INVENTARIO'
                END
                FROM usuarios_empresas ue
                WHERE ue.usuario_id = usuarios.id
                ORDER BY ue.id
                LIMIT 1
            )
            WHERE EXISTS (
                SELECT 1
                FROM usuarios_empresas ue
                WHERE ue.usuario_id = usuarios.id
            )
        SQL);
    }

    public function down(): void
    {
        Schema::table('usuarios', function (Blueprint $table): void {
            $table->dropIndex('usuarios_empresa_role_ativo_index');
            $table->dropConstrainedForeignId('empresa_id');
            $table->dropColumn(['role', 'ultimo_login_em']);
        });
    }
};
