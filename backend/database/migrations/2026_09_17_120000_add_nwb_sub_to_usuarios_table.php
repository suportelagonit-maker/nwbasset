<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Vinculo do usuario local com a identidade do NWB ID (claim "sub" do
     * Keycloak). E-mail nao serve como chave: pode mudar; o sub, nao.
     */
    public function up(): void
    {
        Schema::table('usuarios', function (Blueprint $table): void {
            $table->string('nwb_sub', 64)->nullable()->unique()->after('email');
            $table->string('auth_origem', 10)->default('LOCAL')->after('nwb_sub');
        });
    }

    public function down(): void
    {
        Schema::table('usuarios', function (Blueprint $table): void {
            $table->dropUnique(['nwb_sub']);
            $table->dropColumn(['nwb_sub', 'auth_origem']);
        });
    }
};
