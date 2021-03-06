import { type GatewayMessageDeleteDispatch, BaseWebSocketHandler } from '../../../index';

export default class MessageDeleteHandler extends BaseWebSocketHandler {
    public constructor() {
        super('MessageDelete');
    }

    public override handle({ d }: GatewayMessageDeleteDispatch) {
        if (d.guild_id) {
            const guild = this.shard.guilds.get(d.guild_id);

            if (guild) {
                const channel = guild.caches.channels.cache.get(d.channel_id);

                if (channel) {
                    const message = (channel as any).caches.messages.get(d.id);

                    if (message) {
                        (channel as any).caches.messages.cache.delete(d.id);
                        this.shard.manager.client.emit('messageDelete', message);
                    }
                }
            }
        } else {
            const channel = this.shard.manager.client.caches.channels.cache.get(d.channel_id);

            if (channel) {
                const message = (channel as any).caches.messages.get(d.id);

                if (message) {
                    (channel as any).caches.messages.cache.delete(d.id);
                    this.shard.manager.client.emit('messageDelete', message);
                }
            }
        }
    }
}
