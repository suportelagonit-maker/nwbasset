<?php

namespace App\Domain\Auth\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Throwable;

class CaptchaValidationService
{
    public function validateOrFail(?string $captchaToken, ?string $remoteIp = null): void
    {
        if (! config('services.turnstile.enabled', false)) {
            return;
        }

        if (! is_string($captchaToken) || trim($captchaToken) === '') {
            throw ValidationException::withMessages([
                'captcha_token' => ['Confirme o CAPTCHA para continuar.'],
            ]);
        }

        $secretKey = (string) config('services.turnstile.secret_key', '');

        if ($secretKey === '') {
            throw ValidationException::withMessages([
                'captcha_token' => ['CAPTCHA nao configurado no servidor.'],
            ]);
        }

        $verifyUrl = (string) config(
            'services.turnstile.verify_url',
            'https://challenges.cloudflare.com/turnstile/v0/siteverify'
        );
        $verifyTls = (bool) config('services.turnstile.verify_tls', true);

        try {
            $request = Http::asForm()->timeout(8);

            if (! $verifyTls) {
                $request = $request->withoutVerifying();
            }

            $response = $request->post($verifyUrl, [
                    'secret' => $secretKey,
                    'response' => $captchaToken,
                    'remoteip' => $remoteIp,
                ]);
        } catch (Throwable) {
            throw ValidationException::withMessages([
                'captcha_token' => ['Nao foi possivel validar o CAPTCHA. Tente novamente.'],
            ]);
        }

        if (! $response->ok()) {
            throw ValidationException::withMessages([
                'captcha_token' => ['Falha ao validar CAPTCHA. Tente novamente.'],
            ]);
        }

        $payload = $response->json();
        $success = is_array($payload) && (bool) ($payload['success'] ?? false);

        if (! $success) {
            throw ValidationException::withMessages([
                'captcha_token' => ['CAPTCHA invalido. Refaça a validacao humana.'],
            ]);
        }
    }
}
