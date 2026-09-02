<?php

namespace App\Domain\Organization\DTOs;

use Illuminate\Support\Arr;

final readonly class EmpresaData
{
    public function __construct(
        public array $attributes,
        public ?string $matrizNome,
        public array $matrizEndereco,
    ) {
    }

    public static function fromArray(array $data): self
    {
        $matrizEnderecoKeys = ['cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado'];

        return new self(
            attributes: Arr::except($data, ['matriz_nome']),
            matrizNome: $data['matriz_nome'] ?? null,
            matrizEndereco: Arr::only($data, $matrizEnderecoKeys),
        );
    }
}
