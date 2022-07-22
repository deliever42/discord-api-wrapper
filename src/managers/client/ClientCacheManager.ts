import {
    type Client,
    ClientGuildManager,
    ClientUserManager,
    ClientEmojiManager,
    ClientRoleManager,
} from '../../';

import { BaseManager } from '../BaseManager';

export class ClientCacheManager extends BaseManager {
    public guilds: ClientGuildManager;
    public users: ClientUserManager;
    public emojis: ClientEmojiManager;
    public roles: ClientRoleManager;

    public constructor(client: Client) {
        super(client);

        this.guilds = new ClientGuildManager(client);
        this.users = new ClientUserManager(client);
        this.emojis = new ClientEmojiManager(client);
        this.roles = new ClientRoleManager(client);
    }
}