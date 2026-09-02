<?php

namespace Database\Seeders;

use App\Domain\AssetMovements\Models\HistoricoLocalizacaoBem;
use App\Domain\AssetMovements\Services\BemMovimentacaoService;
use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Organization\Models\Departamento;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Models\Local;
use App\Domain\Organization\Models\Responsavel;
use App\Domain\Organization\Models\UnidadeAdministrativa;
use App\Domain\Shared\Services\CodigoCadastroService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class NwbAssetAssetMovementsSeeder extends Seeder
{
    public function run(): void
    {
        $empresa = Empresa::query()->where('cnpj', '00.000.000/0001-91')->first();
        $filial = Filial::query()->where('empresa_id', $empresa?->id)->where('matriz', true)->first();
        $unidade = UnidadeAdministrativa::query()->where('empresa_id', $empresa?->id)->where('nome', 'Administracao Patrimonial')->first();
        $departamento = Departamento::query()->where('empresa_id', $empresa?->id)->where('nome', 'Controle Patrimonial')->first();
        $localOrigem = Local::query()->where('empresa_id', $empresa?->id)->where('nome', 'Sala do Patrimonio')->first();
        $responsavelOrigem = Responsavel::query()->where('empresa_id', $empresa?->id)->where('matricula', 'MAT-001')->first();

        if (! $empresa || ! $filial || ! $unidade || ! $departamento || ! $localOrigem) {
            return;
        }

        $localDestino = DB::transaction(function () use ($empresa, $filial, $unidade, $departamento): Local {
            $local = Local::query()->firstOrCreate(
                [
                    'empresa_id' => $empresa->id,
                    'nome' => 'Sala de TI',
                ],
                [
                    'filial_id' => $filial->id,
                    'unidade_administrativa_id' => $unidade->id,
                    'departamento_id' => $departamento->id,
                    'codigo' => 'TMP-'.Str::upper(Str::random(10)),
                    'endereco' => 'Rua Demo, 100 - 2 Andar',
                    'descricao' => 'Local de destino para movimentacoes demo.',
                    'status' => 'ativo',
                ],
            );

            app(CodigoCadastroService::class)->aplicar($local, 'LOC');

            return $local->fresh();
        });

        $responsavelDestino = Responsavel::query()->firstOrCreate(
            [
                'empresa_id' => $empresa->id,
                'matricula' => 'MAT-002',
            ],
            [
                'filial_id' => $filial->id,
                'nome' => 'Joao Responsavel',
                'cpf' => '987.654.321-00',
                'email' => 'joao.responsavel@nwbasset.local',
                'telefone' => '(11) 97777-0002',
                'cargo' => 'Analista de Patrimonio',
                'status' => 'ativo',
            ],
        );

        $bens = BemPatrimonial::query()
            ->where('empresa_id', $empresa->id)
            ->orderBy('numero_tombo')
            ->get();

        if ($bens->isEmpty()) {
            return;
        }

        foreach ($bens as $indice => $bem) {
            HistoricoLocalizacaoBem::query()->firstOrCreate(
                [
                    'bem_patrimonial_id' => $bem->id,
                    'data_inicio' => $bem->data_aquisicao?->toDateString() ?? '2025-01-01',
                    'local_id' => $localOrigem->id,
                ],
                [
                    'empresa_id' => $empresa->id,
                    'filial_id' => $filial->id,
                    'unidade_administrativa_id' => $unidade->id,
                    'departamento_id' => $departamento->id,
                    'observacoes' => 'Historico inicial do bem demo '.($indice + 1).'.',
                ],
            );
        }

        $service = app(BemMovimentacaoService::class);
        $bemTransferencia = $bens->first();

        if ($bemTransferencia) {
            $jaExisteTransferencia = $bemTransferencia->transferencias()
                ->where('motivo', 'Realocacao para equipe de TI')
                ->exists();

            if (! $jaExisteTransferencia) {
                $service->registrarTransferencia([
                    'bem_patrimonial_id' => $bemTransferencia->id,
                    'empresa_id' => $empresa->id,
                    'filial_id' => $filial->id,
                    'origem_unidade_administrativa_id' => $unidade->id,
                    'origem_departamento_id' => $departamento->id,
                    'origem_local_id' => $localOrigem->id,
                    'destino_unidade_administrativa_id' => $unidade->id,
                    'destino_departamento_id' => $departamento->id,
                    'destino_local_id' => $localDestino->id,
                    'data_transferencia' => '2025-04-01',
                    'motivo' => 'Realocacao para equipe de TI',
                    'observacoes' => 'Movimentacao demonstrativa da fase 4.',
                ]);
            }
        }

        $bemResponsabilidade = $bens->skip(1)->first() ?? $bens->first();

        if ($bemResponsabilidade && $responsavelDestino) {
            $jaExisteResponsabilidade = $bemResponsabilidade->responsabilidades()
                ->where('responsavel_id', $responsavelDestino->id)
                ->where('data_inicio', '2025-02-15')
                ->exists();

            if (! $jaExisteResponsabilidade) {
                $service->registrarResponsabilidade([
                    'bem_patrimonial_id' => $bemResponsabilidade->id,
                    'empresa_id' => $empresa->id,
                    'filial_id' => $filial->id,
                    'responsavel_id' => $responsavelDestino->id,
                    'data_inicio' => '2025-02-15',
                    'data_fim' => null,
                    'observacoes' => 'Responsabilidade demo atribuida na fase 4.',
                ]);
            }
        }

        if ($responsavelOrigem && $bens->count() >= 3) {
            $bemTerceiro = $bens->get(2);

            if ($bemTerceiro) {
                $jaExisteResponsabilidade = $bemTerceiro->responsabilidades()
                    ->where('responsavel_id', $responsavelOrigem->id)
                    ->exists();

                if (! $jaExisteResponsabilidade) {
                    $service->registrarResponsabilidade([
                        'bem_patrimonial_id' => $bemTerceiro->id,
                        'empresa_id' => $empresa->id,
                        'filial_id' => $filial->id,
                        'responsavel_id' => $responsavelOrigem->id,
                        'data_inicio' => '2025-03-10',
                        'data_fim' => null,
                        'observacoes' => 'Responsabilidade inicial adicional para cobertura demo.',
                    ]);
                }
            }
        }
    }
}
