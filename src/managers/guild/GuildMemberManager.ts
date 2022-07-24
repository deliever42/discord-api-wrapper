import {
    type Client,
    type Snowflake,
    type Guild,
    type CollectionLike,
    type APIGuildMember,
    type FetchMemberOptions,
    type EditGuildMemberData,
    type RESTPutAPIGuildMemberJSONBody,
    GuildMember,
} from '../../';

import { CachedManager } from '../CachedManager';

export class GuildMemberManager extends CachedManager<Snowflake, GuildMember> {
    public guild: Guild;
    public constructor(client: Client, guild: Guild) {
        super(client);

        this.guild = guild;
    }

    public async fetch(
        id?: Snowflake | null,
        { force, limit, after }: FetchMemberOptions = {
            force: false,
            limit: 1,
            after: 0 as unknown as string,
        }
    ): Promise<CollectionLike<Snowflake, GuildMember>> {
        if (id) {
            let _member = this.cache.get(id)!;

            if (!force && _member) {
                return _member;
            } else {
                const member = await this.client.rest.get<APIGuildMember>(
                    `/guilds/${this.guild.id}/members/${id}`
                );

                if (_member) {
                    _member = _member._patch(member);
                }

                return this.cache._add(
                    member.user?.id!,
                    _member ?? new GuildMember(this.client, this.guild, member)
                );
            }
        } else {
            const members = await this.client.rest.get<APIGuildMember[]>(
                `/guilds/${this.guild.id}/members`,
                { query: { limit, after } }
            );

            this.cache.clear();

            for (const member of members) {
                let _member = this.cache.get(member.user?.id!)!;

                if (_member) {
                    _member = _member._patch(member);
                }

                this.cache.set(
                    member.user?.id!,
                    _member ?? new GuildMember(this.client, this.guild, member)
                );
            }

            return this.cache;
        }
    }

    public async create(data: RESTPutAPIGuildMemberJSONBody, reason?: string) {
        const member = await this.client.rest.put<APIGuildMember>(
            `/guilds/${this.guild.id}/members`,
            {
                body: data,
                reason: reason,
            }
        );

        return this.cache._add(member.user?.id!, new GuildMember(this.client, this.guild, member));
    }

    public async kick(id: Snowflake, reason?: string) {
        await this.client.rest.delete(`/guilds/${this.guild.id}/members/${id}`, { reason: reason });
        this.cache.delete(id);
    }

    public async edit(id: Snowflake, data: EditGuildMemberData, reason?: string) {
        if (data.communication_disabled_until) {
            data.communication_disabled_until = new Date(
                data.communication_disabled_until
            ).toISOString() as unknown as number;
        }

        const member = await this.client.rest.patch<APIGuildMember>(
            `/guilds/${this.guild.id}/members/${id}`,
            {
                body: data,
                reason: reason,
            }
        );

        let _member = this.cache.get(id)!;

        if (_member) {
            _member = _member._patch(member);
        }

        return this.cache._add(
            member.user?.id!,
            _member ?? new GuildMember(this.client, this.guild, member)
        );
    }

    public async addRole(memberId: Snowflake, roleId: Snowflake, reason?: string) {
        await this.client.rest.put(`/guilds/${this.guild.id}/members/${memberId}/roles/${roleId}`, {
            reason: reason,
        });
    }

    public async removeRole(memberId: Snowflake, roleId: Snowflake, reason?: string) {
        await this.client.rest.delete(
            `/guilds/${this.guild.id}/members/${memberId}/roles/${roleId}`,
            {
                reason: reason,
            }
        );
    }
}
