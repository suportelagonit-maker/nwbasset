<?php

namespace App\Domain\Auth\Models;

use Illuminate\Database\Eloquent\Model;

class RolePermissao extends Model
{
    public $timestamps = false;

    protected $table = 'roles_permissoes';

    protected $fillable = [
        'role',
        'permissao',
    ];
}
