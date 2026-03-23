<?php

namespace App\Domain\Shared\Services;

use Illuminate\Database\Eloquent\Model;

class CodigoCadastroService
{
    public function gerar(string $prefixo, int $id, int $padding = 6): string
    {
        return sprintf('%s-%0'.$padding.'d', strtoupper($prefixo), $id);
    }

    public function aplicar(Model $model, string $prefixo, string $column = 'codigo', int $padding = 6): string
    {
        $codigo = $this->gerar($prefixo, (int) $model->getKey(), $padding);

        if ($model->getAttribute($column) !== $codigo) {
            $model->forceFill([$column => $codigo])->saveQuietly();
        }

        return $codigo;
    }
}
