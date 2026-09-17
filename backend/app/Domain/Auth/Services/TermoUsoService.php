<?php

namespace App\Domain\Auth\Services;

use App\Domain\Auth\Models\TermoUsoAceite;
use App\Domain\Auth\Models\Usuario;
use Illuminate\Http\Request;
use RuntimeException;

class TermoUsoService
{
    /** Versao vigente do termo. */
    public function versao(): string
    {
        return (string) config('termo_uso.versao');
    }

    /** Conteudo HTML da versao vigente e o hash que identifica esse texto. */
    public function conteudo(): array
    {
        $versao = $this->versao();
        $caminho = resource_path("termos/termo-uso-v{$versao}.html");

        if (! is_file($caminho)) {
            throw new RuntimeException("Arquivo do termo de uso nao encontrado para a versao {$versao}.");
        }

        $html = (string) file_get_contents($caminho);

        return [
            'versao' => $versao,
            'titulo' => (string) config('termo_uso.titulo'),
            'publicado_em' => (string) config('termo_uso.publicado_em'),
            'hash' => hash('sha256', $html),
            'conteudo_html' => $html,
        ];
    }

    /** Aceite do usuario para a versao vigente, se existir. */
    public function aceiteAtual(Usuario $usuario): ?TermoUsoAceite
    {
        return TermoUsoAceite::query()
            ->where('usuario_id', $usuario->id)
            ->where('versao', $this->versao())
            ->first();
    }

    public function pendente(Usuario $usuario): bool
    {
        return $this->aceiteAtual($usuario) === null;
    }

    /**
     * Registra o aceite da versao vigente com os dados que provam a
     * manifestacao: quem (nome e e-mail no momento), quando, de onde (IP e
     * navegador) e o que (hash do texto).
     */
    public function registrarAceite(Usuario $usuario, Request $request): TermoUsoAceite
    {
        $existente = $this->aceiteAtual($usuario);

        if ($existente) {
            return $existente;
        }

        $conteudo = $this->conteudo();

        return TermoUsoAceite::create([
            'usuario_id' => $usuario->id,
            'versao' => $conteudo['versao'],
            'hash_conteudo' => $conteudo['hash'],
            'nome_usuario' => $usuario->nome,
            'email_usuario' => $usuario->email,
            'aceito_em' => now(),
            'ip' => $request->ip(),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 500),
        ]);
    }

    /** Representacao do aceite para a API (null quando pendente). */
    public function resumoAceite(?TermoUsoAceite $aceite): ?array
    {
        if (! $aceite) {
            return null;
        }

        return [
            'versao' => $aceite->versao,
            'nome_usuario' => $aceite->nome_usuario,
            'email_usuario' => $aceite->email_usuario,
            'aceito_em' => $aceite->aceito_em?->toIso8601String(),
            'ip' => $aceite->ip,
            'hash_conteudo' => $aceite->hash_conteudo,
        ];
    }
}
