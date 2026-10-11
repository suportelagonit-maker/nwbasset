<?php

namespace App\Domain\Depreciation\Support;

/**
 * Taxas de depreciacao admitidas pela Receita Federal.
 *
 * Fonte: Anexo III da IN RFB 1.700/2017 (que reproduz a IN SRF 162/1998 com
 * as alteracoes da IN SRF 130/1999). Sao as taxas MAXIMAS dedutiveis no
 * IRPJ/CSLL — a empresa pode usar outra se comprovar a adequacao, e e
 * exatamente para isso que cada regra e editavel no sistema.
 *
 * A base societaria (CPC 27) nasce igual a fiscal, porque e o ponto de
 * partida honesto: a vida util economica so se separa da fiscal quando
 * alguem revisar e assumir a diferenca. Deixar a societaria vazia obrigaria
 * o sistema a cair na fiscal sem dizer, que e o que acontecia antes.
 *
 * Os produtos repetem o nome dos tipos de produto que o cadastro de bens ja
 * oferece, para a regra encaixar sem a pessoa configurar nada.
 */
final class TabelaReceitaFederal
{
    /**
     * Regras por tipo de bem.
     *
     * @return array<int, array{tipo_bem: string, vida_util_anos: int, taxa: float, depreciavel: bool, observacao: string}>
     */
    public static function tiposDeBem(): array
    {
        return [
            [
                'tipo_bem' => 'Edificacoes',
                'vida_util_anos' => 25,
                'taxa' => 4.0,
                'depreciavel' => true,
                'observacao' => 'Edificacoes e construcoes: 4% a.a. O TERRENO nao deprecia e deve ser cadastrado a parte.',
            ],
            [
                'tipo_bem' => 'Imoveis',
                'vida_util_anos' => 25,
                'taxa' => 4.0,
                'depreciavel' => true,
                'observacao' => 'Use so para a parte construida. Terreno e edificacao devem ser separados: terreno nao deprecia.',
            ],
            [
                'tipo_bem' => 'Instalacoes',
                'vida_util_anos' => 10,
                'taxa' => 10.0,
                'depreciavel' => true,
                'observacao' => 'Instalacoes: 10% a.a.',
            ],
            [
                'tipo_bem' => 'Equipamentos',
                'vida_util_anos' => 10,
                'taxa' => 10.0,
                'depreciavel' => true,
                'observacao' => 'Maquinas, aparelhos e equipamentos em geral: 10% a.a.',
            ],
            [
                'tipo_bem' => 'Mobiliario',
                'vida_util_anos' => 10,
                'taxa' => 10.0,
                'depreciavel' => true,
                'observacao' => 'Moveis e utensilios: 10% a.a.',
            ],
            [
                'tipo_bem' => 'Utensilios',
                'vida_util_anos' => 10,
                'taxa' => 10.0,
                'depreciavel' => true,
                'observacao' => 'Moveis e utensilios: 10% a.a.',
            ],
            [
                'tipo_bem' => 'Informatica',
                'vida_util_anos' => 5,
                'taxa' => 20.0,
                'depreciavel' => true,
                'observacao' => 'Computadores e perifericos (NCM 8471): 20% a.a.',
            ],
            [
                'tipo_bem' => 'Veiculos',
                'vida_util_anos' => 5,
                'taxa' => 20.0,
                'depreciavel' => true,
                'observacao' => 'Padrao de automovel de passageiros (NCM 8703): 20% a.a. Caminhao, onibus, moto e trator tem regra propria por produto.',
            ],
            [
                'tipo_bem' => 'Terrenos',
                'vida_util_anos' => 0,
                'taxa' => 0.0,
                'depreciavel' => false,
                'observacao' => 'Terreno nao sofre depreciacao (art. 317, par. 1o, do RIR/2018).',
            ],
        ];
    }

    /**
     * Regras por tipo de produto, quando o produto foge da taxa do tipo.
     *
     * @return array<int, array{tipo_bem: string, produto: string, vida_util_anos: int, taxa: float, observacao: string}>
     */
    public static function produtos(): array
    {
        return [
            [
                'tipo_bem' => 'Veiculos',
                'produto' => 'Caminhao',
                'vida_util_anos' => 4,
                'taxa' => 25.0,
                'observacao' => 'Veiculos para transporte de mercadorias (NCM 8704): 25% a.a.',
            ],
            [
                'tipo_bem' => 'Veiculos',
                'produto' => 'Onibus',
                'vida_util_anos' => 4,
                'taxa' => 25.0,
                'observacao' => 'Veiculos para 10 pessoas ou mais (NCM 8702): 25% a.a.',
            ],
            [
                'tipo_bem' => 'Veiculos',
                'produto' => 'Moto',
                'vida_util_anos' => 4,
                'taxa' => 25.0,
                'observacao' => 'Motocicletas (NCM 8711): 25% a.a.',
            ],
            [
                'tipo_bem' => 'Veiculos',
                'produto' => 'Trator',
                'vida_util_anos' => 4,
                'taxa' => 25.0,
                'observacao' => 'Tratores (NCM 8701): 25% a.a.',
            ],
            [
                'tipo_bem' => 'Veiculos',
                'produto' => 'Van',
                'vida_util_anos' => 4,
                'taxa' => 25.0,
                'observacao' => 'Quando usada para carga ou transporte coletivo (NCM 8702/8704): 25% a.a. Para passeio, use a regra do tipo.',
            ],
            [
                'tipo_bem' => 'Veiculos',
                'produto' => 'Carro',
                'vida_util_anos' => 5,
                'taxa' => 20.0,
                'observacao' => 'Automoveis de passageiros (NCM 8703): 20% a.a.',
            ],
            [
                'tipo_bem' => 'Equipamentos',
                'produto' => 'Ar-condicionado',
                'vida_util_anos' => 10,
                'taxa' => 10.0,
                'observacao' => 'Tratado como instalacao: 10% a.a.',
            ],
            [
                'tipo_bem' => 'Equipamentos',
                'produto' => 'Ferramenta eletrica',
                'vida_util_anos' => 5,
                'taxa' => 20.0,
                'observacao' => 'Ferramentas: 20% a.a. (vida util de 5 anos).',
            ],
            [
                'tipo_bem' => 'Utensilios',
                'produto' => 'Ferramenta manual',
                'vida_util_anos' => 5,
                'taxa' => 20.0,
                'observacao' => 'Ferramentas: 20% a.a. (vida util de 5 anos).',
            ],
        ];
    }
}
