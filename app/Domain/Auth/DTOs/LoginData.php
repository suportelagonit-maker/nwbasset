<?php

namespace App\Domain\Auth\DTOs;

final readonly class LoginData
{
    public function __construct(
        public string $email,
        public string $password,
        public string $deviceName,
        public ?int $empresaId,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            email: $data['email'],
            password: $data['password'],
            deviceName: $data['device_name'] ?? 'nwbasset-api',
            empresaId: isset($data['empresa_id']) ? (int) $data['empresa_id'] : null,
        );
    }
}
