import type { RequestMethods } from '../../../';

export class HTTPError extends Error {
    public status: number;
    public method: RequestMethods;
    public url: string;
    public message: string;

    public constructor(status: number, method: RequestMethods, url: string, message: string) {
        super(message);

        this.status = status;
        this.method = method;
        this.url = url;
        this.message = message;
    }
}
