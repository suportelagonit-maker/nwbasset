<?php

namespace App\Providers;

use App\Domain\Administration\Models\Perfil;
use App\Domain\Administration\Models\Permissao;
use App\Domain\Administration\Policies\PerfilPolicy;
use App\Domain\Administration\Policies\PermissaoPolicy;
use App\Domain\Audit\Models\AuditoriaEvento;
use App\Domain\Audit\Policies\AuditoriaEventoPolicy;
use App\Domain\MultiCompany\Services\EmpresaContext;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Policies\EmpresaPolicy;
use App\Domain\Organization\Policies\FilialPolicy;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Auth\Policies\UsuarioPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(EmpresaContext::class, static fn (): EmpresaContext => new EmpresaContext());
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Empresa::class, EmpresaPolicy::class);
        Gate::policy(Filial::class, FilialPolicy::class);
        Gate::policy(Usuario::class, UsuarioPolicy::class);
        Gate::policy(Perfil::class, PerfilPolicy::class);
        Gate::policy(Permissao::class, PermissaoPolicy::class);
        Gate::policy(AuditoriaEvento::class, AuditoriaEventoPolicy::class);

        // Freio contra força bruta no login: por IP e por par e-mail+IP.
        // O CAPTCHA continua sendo a primeira barreira; isto cobre o caso de
        // ele estar desligado ou ser contornado.
        RateLimiter::for('login', static fn (Request $request): array => [
            Limit::perMinute(20)->by('login-ip:'.$request->ip()),
            Limit::perMinute(5)->by('login-conta:'.strtolower((string) $request->input('email')).'|'.$request->ip()),
        ]);
    }
}
