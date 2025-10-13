<?php

namespace App\Enums;

enum CompanyMemberStatus: string
{
    case ACTIVE = 'active';
    case SUSPENDED = 'suspended';
}
