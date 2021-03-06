import type {
    APIEmbed,
    APIEmbedAuthor,
    APIEmbedField,
    APIEmbedFooter,
    APIEmbedImage,
    APIEmbedProvider,
    APIEmbedThumbnail,
    APIEmbedVideo,
} from '../index';

import { BaseBuilder } from './BaseBuilder';

export class EmbedBuilder extends BaseBuilder {
    public author: APIEmbedAuthor | null;
    public color: number;
    public description: string | null;
    public fields: APIEmbedField[];
    public footer: APIEmbedFooter | null;
    public image: APIEmbedImage | null;
    public provider: APIEmbedProvider | null;
    public thumbnail: APIEmbedThumbnail | null;
    public timestamp: string | null;
    public title: string | null;
    public url: string | null;
    public video: APIEmbedVideo | null;

    public constructor(data?: APIEmbed) {
        super();

        this.author = data?.author ?? null;
        this.color = data?.color ?? 0;
        this.description = data?.description ?? null;
        this.fields = data?.fields ?? [];
        this.footer = data?.footer ?? null;
        this.image = data?.image ?? null;
        this.provider = data?.provider ?? null;
        this.thumbnail = data?.thumbnail ?? null;
        this.timestamp = data?.timestamp ?? null;
        this.title = data?.title ?? null;
        this.url = data?.url ?? null;
        this.video = data?.video ?? null;
    }

    public setAuthor(author: APIEmbedAuthor) {
        return this._change('author', author);
    }

    public setColor(color: number) {
        return this._change('color', color);
    }

    public setDescription(description: string) {
        return this._change('description', description);
    }

    public setFields(...fields: APIEmbedField[]) {
        return this._change('fields', fields);
    }

    public addFields(...fields: APIEmbedField[]) {
        return this._change('fields', this.fields.concat(fields));
    }

    public removeFields(...fields: APIEmbedField[]) {
        for (const field of fields) {
            const index = this.fields.indexOf(field);

            if (index > -1) {
                this.fields.splice(index, 1);
            }
        }

        return this;
    }

    public setFooter(footer: APIEmbedFooter) {
        return this._change('footer', footer);
    }

    public setImage(image: APIEmbedImage) {
        return this._change('image', image);
    }

    public setProvider(provider: APIEmbedProvider) {
        return this._change('provider', provider);
    }

    public setThumbnail(thumbnail: APIEmbedThumbnail) {
        return this._change('thumbnail', thumbnail);
    }

    public setTimestamp(timestamp: string) {
        return this._change('timestamp', timestamp);
    }

    public setTitle(title: string) {
        return this._change('title', title);
    }

    public setURL(url: string) {
        return this._change('url', url);
    }

    public setVideo(video: APIEmbedVideo) {
        return this._change('video', video);
    }
}
