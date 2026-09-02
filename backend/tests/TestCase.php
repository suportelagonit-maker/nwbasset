<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    /**
     * Banco usado quando nenhum outro e informado por DB_TEST_DATABASE.
     */
    private const FALLBACK_TEST_DATABASE = 'nwbasset_testing';

    /**
     * Isolamento do banco de teste.
     *
     * Os testes desta suite chamam Artisan::call('migrate:fresh') no proprio
     * setUp, o que DERRUBA TODAS AS TABELAS do banco conectado. Rodar a suite
     * apontando para o banco da aplicacao destruiria os dados reais.
     *
     * O nome do banco nao pode depender so do phpunit.xml: o atributo
     * force="true" do PHPUnit nao vence uma variavel de ambiente real, e dentro
     * do container DB_DATABASE aponta para o banco da aplicacao. Por isso o
     * alvo e fixado aqui, na configuracao do Laravel, e conferido logo depois.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $connection = config('database.default');
        $target = env('DB_TEST_DATABASE') ?: self::FALLBACK_TEST_DATABASE;

        config()->set("database.connections.{$connection}.database", $target);
        DB::purge($connection);

        $database = (string) DB::connection()->getDatabaseName();

        if (! str_contains($database, 'testing')) {
            throw new RuntimeException(sprintf(
                'Execucao interrompida: os testes rodam migrate:fresh e apagariam o banco "%s". '
                .'Esperado um banco de teste (nome contendo "testing"). '
                .'Ajuste DB_TEST_DATABASE ou a conexao "%s".',
                $database,
                $connection,
            ));
        }
    }
}
