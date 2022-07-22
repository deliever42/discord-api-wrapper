import { AsyncQueue } from '@sapphire/async-queue';
import fetch, { type HeaderInit } from 'node-fetch';
import {
    type RequestManagerOptions,
    type RateLimitData,
    HTTPError,
    DiscordAPIError,
    RateLimitError,
    Collection,
    RequestOptions,
    Sleep,
} from '../..';
import FormData from 'form-data';
import { Blob } from 'node:buffer';

export class RequestManager {
    public queue = new AsyncQueue();
    public token: string | undefined;
    public rejectOnRateLimit: boolean;
    public offset: number;
    public baseURL: string;
    public authPrefix: 'Bot' | 'Bearer';
    public baseHeaders: HeaderInit;
    public retries = new Collection<`/${string}`, number>();
    #retries: number;
    #rateLimits = new Collection<string, RateLimitData>();
    #globalRateLimitData: RateLimitData = { limited: false };

    public constructor({
        offset,
        rejectOnRateLimit,
        baseURL,
        authPrefix,
        retries,
        baseHeaders,
    }: RequestManagerOptions) {
        this.rejectOnRateLimit = rejectOnRateLimit ?? false;
        this.offset = offset ?? 250;
        this.baseURL = baseURL;
        this.authPrefix = authPrefix ?? 'Bot';
        this.#retries = retries ?? 2;
        this.baseHeaders = baseHeaders ?? {
            'content-type': 'application/json',
        };
    }

    public get rateLimits(): Readonly<Collection<string, RateLimitData>> {
        return this.#rateLimits;
    }

    public get globalRateLimitData(): Readonly<RateLimitData> {
        return this.#globalRateLimitData;
    }

    public async request<T>(route: `/${string}`, options: RequestOptions = {}): Promise<T> {
        await this.queue.wait();

        //@ts-ignore
        if (!options.headers) options.headers = {};

        options.headers = { ...options.headers, ...this.baseHeaders };

        if (this.token) {
            //@ts-ignore
            options.headers['Authorization'] = this.token;
        }

        if (options.reason) {
            //@ts-ignore
            options.headers['X-Audit-Log-Reason'] = encodeURIComponent(options.reason);
        }

        options.method ||= 'GET';

        if (Object.keys(options.query || {}).length) {
            //@ts-ignore
            route +=
                '?' +
                Object.entries(options.query!)
                    .map(([key, value]) => `${key}=${value}`)
                    .join('&');
        }

        if (options.formData || options.files?.length) {
            const body = options.body ?? {};

            options.body = new FormData();

            //@ts-ignore
            options.body.append('payload_json', JSON.stringify(body));

            if (options.files?.length) {
                for (const file of options.files) {
                    //@ts-ignore
                    options.body.append(file.name, file.data, file.type);
                }
            }

            options.headers = {
                ...options.headers,
                //@ts-ignore
                ...options.body.getHeaders(),
            };
        }

        const fullRoute = this.baseURL + route;

        if (this.#globalRateLimitData.limited) {
            await Sleep(this.#globalRateLimitData.retry!);
            this.#rateLimits.clear();
            this.#globalRateLimitData = { limited: false };
        }

        try {
            const response = await fetch(fullRoute, options);

            const data = await response.json();
            const status = response.status;

            if (status >= 200 && status < 300) {
                return data;
            } else if (status === 400) {
                throw new HTTPError(status, options.method, fullRoute, 'Bad Request');
            } else if (status === 401) {
                this.token = undefined;

                throw new HTTPError(status, options.method, fullRoute, 'Unauthorized');
            } else if (status === 402) {
                throw new HTTPError(status, options.method, fullRoute, 'Gateway Unvailable');
            } else if (status === 403) {
                throw new HTTPError(status, options.method, fullRoute, 'Forbidden');
            } else if (status === 404) {
                throw new HTTPError(status, options.method, fullRoute, 'Not Found');
            } else if (status === 405) {
                throw new HTTPError(status, options.method, fullRoute, 'Method Not Allowed');
            } else if (status === 429) {
                const scope = response.headers.get('x-ratelimit-scope');
                const limit = response.headers.get('x-ratelimit-limit');
                const remaining = response.headers.get('x-ratelimit-remaining');
                const reset = response.headers.get('x-ratelimit-reset-after');
                const hash = response.headers.get('x-ratelimit-bucket');
                const retry = response.headers.get('retry-after');

                if (scope === 'global') {
                    this.#globalRateLimitData = {
                        scope: (scope as any) || 'user',
                        limit: limit ? +limit : Infinity,
                        remaining: remaining ? +remaining : 1,
                        reset: reset ? Date.now() + +reset * 1000 + this.offset : Date.now(),
                        retry: retry ? +retry * 1000 + this.offset : 0,
                        limited: true,
                        route,
                    };
                } else {
                    this.rateLimits.set(route, {
                        scope: (scope as any) || 'user',
                        limit: limit ? +limit : Infinity,
                        remaining: remaining ? +remaining : 1,
                        reset: reset ? Date.now() + +reset * 1000 + this.offset : Date.now(),
                        retry: retry ? +retry * 1000 + this.offset : 0,
                        limited: true,
                        route,
                    });
                }

                const rateLimitData = this.#globalRateLimitData.limited
                    ? this.#globalRateLimitData
                    : this.rateLimits.get(route)!;

                if (this.rejectOnRateLimit) {
                    throw new RateLimitError(
                        rateLimitData.limit?.toString()!,
                        rateLimitData.remaining?.toString()!,
                        rateLimitData.reset?.toString()!,
                        hash!,
                        rateLimitData.retry?.toString()!,
                        rateLimitData.scope!,
                        status,
                        options.method,
                        fullRoute
                    );
                }

                const rateLimitRetry = this.#globalRateLimitData.limited
                    ? this.#globalRateLimitData.retry
                    : this.#rateLimits.get(route)?.retry;

                await Sleep(rateLimitRetry!);

                return this.request(route, options);
            } else if (status >= 400 && status < 500) {
                throw new DiscordAPIError(
                    status,
                    data.code,
                    options.method,
                    fullRoute,
                    data.message
                );
            } else if (status >= 500 && status < 600) {
                throw new HTTPError(status, options.method, fullRoute, 'Internal Server Error');
            } else {
                return data;
            }
        } catch (error: any) {
            let retries = this.retries.get(route) || 0;

            if (retries !== this.#retries) {
                this.retries.set(route, ++retries);
                return this.request(route, options);
            }

            this.retries.delete(route);
            throw error;
        } finally {
            this.queue.shift();
        }
    }

    public async get<T>(route: `/${string}`, options: RequestOptions = {}) {
        return await this.request<T>(route, { ...options, method: 'GET' });
    }

    public async post<T>(route: `/${string}`, options: RequestOptions = {}) {
        return await this.request<T>(route, { ...options, method: 'POST' });
    }

    public async put<T>(route: `/${string}`, options: RequestOptions = {}) {
        return await this.request<T>(route, { ...options, method: 'PUT' });
    }

    public async patch<T>(route: `/${string}`, options: RequestOptions = {}) {
        return await this.request<T>(route, { ...options, method: 'PATCH' });
    }

    public async delete<T>(route: `/${string}`, options: RequestOptions = {}) {
        return await this.request<T>(route, { ...options, method: 'DELETE' });
    }

    public setToken(token: string) {
        this.token = this.authPrefix + ' ' + token;
    }
}
