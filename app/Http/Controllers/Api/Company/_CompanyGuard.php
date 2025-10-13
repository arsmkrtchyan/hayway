<?php
// app/Http/Controllers/Api/Company/_CompanyGuard.php
namespace App\Http\Controllers\Api\Company;

use App\Models\Company;
use Illuminate\Http\Request;

trait _CompanyGuard {
    private function assertCanView(Request $r, Company $c): void {
        $u = $r->user();
        $ok = $c->owner_user_id === $u->id
            || $c->members()->where('users.id',$u->id)->exists();
        abort_unless($ok, 403, 'forbidden');
    }
    private function assertCanManage(Request $r, Company $c): void {
        $u = $r->user();
        $ok = $c->owner_user_id === $u->id
            || $c->members()->where('users.id',$u->id)->wherePivotIn('role',['dispatcher'])->exists();
        abort_unless($ok, 403, 'forbidden');
    }
}
