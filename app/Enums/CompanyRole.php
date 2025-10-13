<?php

namespace App\Enums;

enum CompanyRole: string
{
    case OWNER = 'owner';
    case MANAGER = 'manager';
    case DISPATCHER = 'dispatcher';
    case DRIVER = 'driver';

    /** Роли, которые может назначать manager */
    public static function manageableByManager(): array
    {
        return [self::DISPATCHER, self::DRIVER];
    }

    /** Роли, которые может назначать owner */
    public static function manageableByOwner(): array
    {
        return [self::MANAGER, self::DISPATCHER, self::DRIVER];
    }

    public static function all(): array
    {
        return [self::OWNER, self::MANAGER, self::DISPATCHER, self::DRIVER];
    }
}
