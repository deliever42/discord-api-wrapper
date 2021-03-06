import { type GatewayIntentBitsResolvable, GatewayIntentBits } from '../../index';

export function GatewayIntentBitsResolver(intents: GatewayIntentBitsResolvable): number | number[] {
    let res = intents;

    if (typeof intents === 'string') {
        res = GatewayIntentBits[intents] as number;
    } else if (Array.isArray(intents)) {
        res = intents.map((intent) =>
            typeof intent === 'string' ? GatewayIntentBits[intent] : intent
        ) as number[];
    }

    return res as number | number[];
}
