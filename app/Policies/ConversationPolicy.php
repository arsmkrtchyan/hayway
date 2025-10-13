<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;

class ConversationPolicy {
    public function access(User $u, Conversation $c): bool {
        return $c->driver_user_id === $u->id || $c->client_user_id === $u->id;
    }
}
