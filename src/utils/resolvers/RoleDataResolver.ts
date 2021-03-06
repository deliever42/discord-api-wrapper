import {
    type RoleData,
    PermissionFlagsBitsResolver,
    PermissionFlagsBitField,
    ColorResolver,
} from '../../index';

export const RolePattern = /<@&(\d{17,19})>/;

export function RoleDataResolver(role: RoleData) {
    const res = role;

    if (res.permissions) {
        res.permissions = new PermissionFlagsBitField().set(
            PermissionFlagsBitsResolver(res.permissions)
        );
    }

    if (res.color) {
        res.color = ColorResolver(res.color);
    }

    return res;
}
