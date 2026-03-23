# Backend NWB Asset (Laravel)

Target folder: `backend/`

## Stack

- PHP 8.2+
- Laravel 12
- PostgreSQL

## Comandos basicos

No diretorio `backend/`:

```powershell
composer install
php artisan key:generate
php artisan migrate
php artisan serve --host=127.0.0.1 --port=5000
```

## Testes

```powershell
php artisan test
```

## Observacao

Este backend atende o frontend web (`frontend-web`) e o mobile (`frontend-mobile`) via API em `/api/v1`.
