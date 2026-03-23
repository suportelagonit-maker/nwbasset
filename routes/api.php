<?php

use App\Domain\AssetMovements\Controllers\BaixaBemController;
use App\Domain\AssetMovements\Controllers\HistoricoLocalizacaoBemController;
use App\Domain\AssetMovements\Controllers\ResponsabilidadeBemController;
use App\Domain\AssetMovements\Controllers\TransferenciaBemController;
use App\Domain\AssetRegistry\Controllers\BemPatrimonialController;
use App\Domain\AssetRegistry\Controllers\BemPatrimonialDocumentoController;
use App\Domain\AssetRegistry\Controllers\BemPatrimonialImagemController;
use App\Domain\AssetRegistry\Controllers\PlaquetaPatrimonialController;
use App\Domain\AssetRegistry\Controllers\PublicPlaquetaLookupController;
use App\Domain\Audit\Controllers\AuditoriaPatrimonialController;
use App\Domain\Auth\Controllers\AuthController;
use App\Domain\Auth\Controllers\RolePermissaoController;
use App\Domain\Auth\Controllers\UsuarioController;
use App\Domain\Dashboard\Controllers\DashboardPatrimonialController;
use App\Domain\Depreciation\Controllers\DepreciacaoBemController;
use App\Domain\Depreciation\Controllers\MetodoDepreciacaoController;
use App\Domain\Depreciation\Controllers\ParametroDepreciacaoController;
use App\Domain\Inventory\Controllers\ConciliacaoPatrimonialController;
use App\Domain\Inventory\Controllers\DivergenciaInventarioController;
use App\Domain\Inventory\Controllers\InventarioController;
use App\Domain\Inventory\Controllers\InventarioItemController;
use App\Domain\Organization\Controllers\EmpresaController;
use App\Domain\Organization\Controllers\FilialController;
use App\Domain\Organization\Controllers\DepartamentoController;
use App\Domain\Organization\Controllers\LocalController;
use App\Domain\Organization\Controllers\ResponsavelController;
use App\Domain\Organization\Controllers\UnidadeAdministrativaController;
use App\Domain\Reports\Controllers\ExportacaoRelatoriosController;
use App\Domain\Reports\Controllers\RelatorioPatrimonialController;
use Illuminate\Support\Facades\Route;

Route::get('/v1/status', function () {
    return response()->json([
        'app' => 'NWB Asset',
        'status' => 'ok',
    ]);
});

Route::prefix('v1')->group(function (): void {
    Route::get('public/plaquetas/lookup', [PublicPlaquetaLookupController::class, 'show']);
    Route::post('auth/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::apiResource('empresas', EmpresaController::class)
            ->parameters(['empresas' => 'empresa']);
        Route::post('empresas/{empresa}/logo', [EmpresaController::class, 'uploadLogo']);
        Route::delete('empresas/{empresa}/logo', [EmpresaController::class, 'destroyLogo']);

        Route::middleware(['empresa.context', 'role.permission:usuarios'])->group(function (): void {
            Route::get('usuarios/catalogo-permissoes', [UsuarioController::class, 'catalogoPermissoes']);
            Route::apiResource('usuarios', UsuarioController::class)
                ->parameters(['usuarios' => 'usuario']);
        });

        Route::middleware(['empresa.context', 'role.permission:filiais'])->group(function (): void {
            Route::apiResource('filiais', FilialController::class)
                ->parameters(['filiais' => 'filial']);
        });

        Route::middleware(['empresa.context', 'role.permission:permissoes'])->group(function (): void {
            Route::get('roles-permissoes', [RolePermissaoController::class, 'index']);
        });

        Route::middleware(['empresa.context', 'role.permission:bens'])->group(function (): void {
            Route::apiResource('bens', BemPatrimonialController::class)
                ->parameters(['bens' => 'bem']);
            Route::post('bens/{bem}/imagens', [BemPatrimonialImagemController::class, 'store']);
            Route::put('bens/{bem}/imagens/ordenacao', [BemPatrimonialImagemController::class, 'reordenar']);
            Route::patch('bens/{bem}/imagens/{imagem}/principal', [BemPatrimonialImagemController::class, 'definirPrincipal']);
            Route::delete('bens/{bem}/imagens/{imagem}', [BemPatrimonialImagemController::class, 'destroy']);
            Route::post('bens/{bem}/documentos', [BemPatrimonialDocumentoController::class, 'store']);
            Route::patch('bens/{bem}/documentos/{documento}', [BemPatrimonialDocumentoController::class, 'update']);
            Route::delete('bens/{bem}/documentos/{documento}', [BemPatrimonialDocumentoController::class, 'destroy']);
            Route::apiResource('plaquetas', PlaquetaPatrimonialController::class)
                ->parameters(['plaquetas' => 'plaqueta']);
            Route::post('plaquetas/estoque', [PlaquetaPatrimonialController::class, 'storeEstoque']);
            Route::post('plaquetas/importar', [PlaquetaPatrimonialController::class, 'importar']);
            Route::post('plaquetas/vincular', [PlaquetaPatrimonialController::class, 'vincular']);
            Route::apiResource('unidades-administrativas', UnidadeAdministrativaController::class)
                ->parameters(['unidades-administrativas' => 'unidade_administrativa']);
            Route::apiResource('departamentos', DepartamentoController::class);
            Route::apiResource('locais', LocalController::class)
                ->parameters(['locais' => 'local']);
            Route::apiResource('responsaveis', ResponsavelController::class)
                ->parameters(['responsaveis' => 'responsavel']);
        });

        Route::middleware(['empresa.context', 'role.permission:movimentacoes'])->group(function (): void {
            Route::apiResource('historico-localizacao-bens', HistoricoLocalizacaoBemController::class)
                ->parameters(['historico-localizacao-bens' => 'historico_localizacao_bem']);
            Route::apiResource('transferencias-bens', TransferenciaBemController::class)
                ->parameters(['transferencias-bens' => 'transferencia_bem']);
            Route::apiResource('baixas-bens', BaixaBemController::class)
                ->parameters(['baixas-bens' => 'baixa_bem']);
            Route::apiResource('responsabilidade-bens', ResponsabilidadeBemController::class)
                ->parameters(['responsabilidade-bens' => 'responsabilidade_bem']);
        });

        Route::middleware(['empresa.context', 'role.permission:depreciacoes'])->group(function (): void {
            Route::apiResource('parametros-depreciacao', ParametroDepreciacaoController::class)
                ->parameters(['parametros-depreciacao' => 'parametro_depreciacao']);
            Route::apiResource('depreciacoes', DepreciacaoBemController::class)
                ->parameters(['depreciacoes' => 'depreciacao']);
        });

        Route::middleware(['role.permission:depreciacoes'])->group(function (): void {
            Route::apiResource('metodos-depreciacao', MetodoDepreciacaoController::class)
                ->parameters(['metodos-depreciacao' => 'metodo_depreciacao']);
        });

        Route::middleware(['empresa.context', 'role.permission:inventarios'])->group(function (): void {
            Route::apiResource('inventarios', InventarioController::class)
                ->parameters(['inventarios' => 'inventario']);
            Route::apiResource('inventario-itens', InventarioItemController::class)
                ->parameters(['inventario-itens' => 'inventario_item']);
            Route::apiResource('conciliacoes', ConciliacaoPatrimonialController::class)
                ->parameters(['conciliacoes' => 'conciliacao']);
            Route::apiResource('divergencias', DivergenciaInventarioController::class)
                ->parameters(['divergencias' => 'divergencia']);
        });

        Route::middleware(['empresa.context', 'role.permission:relatorios'])->group(function (): void {
            Route::apiResource('auditorias', AuditoriaPatrimonialController::class)
                ->parameters(['auditorias' => 'auditoria']);

            Route::prefix('relatorios')->group(function (): void {
                Route::get('bens-por-local', [RelatorioPatrimonialController::class, 'bensPorLocal']);
                Route::get('bens-por-responsavel', [RelatorioPatrimonialController::class, 'bensPorResponsavel']);
                Route::get('depreciacao', [RelatorioPatrimonialController::class, 'depreciacao']);
                Route::get('inventario', [RelatorioPatrimonialController::class, 'inventario']);
                Route::get('divergencias', [RelatorioPatrimonialController::class, 'divergencias']);
            });

            Route::prefix('exportacoes')->group(function (): void {
                Route::get('bens-por-local/pdf', [ExportacaoRelatoriosController::class, 'bensPorLocalPdf']);
                Route::get('bens-por-local/excel', [ExportacaoRelatoriosController::class, 'bensPorLocalExcel']);
                Route::get('bens-por-local/csv', [ExportacaoRelatoriosController::class, 'bensPorLocalCsv']);
                Route::get('bens-por-responsavel/pdf', [ExportacaoRelatoriosController::class, 'bensPorResponsavelPdf']);
                Route::get('depreciacao/pdf', [ExportacaoRelatoriosController::class, 'depreciacaoPdf']);
                Route::get('inventario/pdf', [ExportacaoRelatoriosController::class, 'inventarioPdf']);
                Route::get('divergencias/pdf', [ExportacaoRelatoriosController::class, 'divergenciasPdf']);
            });
        });

        Route::middleware(['role.permission:dashboard'])->group(function (): void {
            Route::prefix('dashboard/patrimonio')->group(function (): void {
                Route::get('overview', [DashboardPatrimonialController::class, 'overview']);
                Route::get('resumo', [DashboardPatrimonialController::class, 'resumo']);
                Route::get('bens-por-local', [DashboardPatrimonialController::class, 'bensPorLocal']);
                Route::get('bens-por-departamento', [DashboardPatrimonialController::class, 'bensPorDepartamento']);
                Route::get('evolucao-patrimonio', [DashboardPatrimonialController::class, 'evolucaoPatrimonio']);
            });
        });
    });
});
