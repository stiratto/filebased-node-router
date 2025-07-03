import busboy from 'busboy';
import { mimeTypes } from './consts';
import type { RequestWithPrototype } from './request';
import type { ResponseWithPrototype } from './response';
import type { ContentTypes } from './types';

export class Parser {
  contentType: ContentTypes;
  data: Buffer;
  body: any;
  parsers: string[];

  constructor(
    req: RequestWithPrototype,
    res: ResponseWithPrototype,
    parsers: string[]
  ) {
    this.parsers = parsers;
  }

  async init(
    req: RequestWithPrototype,
    res: ResponseWithPrototype
  ): Promise<any> {
    // if method is not post, return
    if (!(req.method === 'POST')) return;

    // extract headers and put them on this.

    const contentType = req.headers['content-type'];
    // extract only the header (not boundary or encoding=utf)
    const [baseType] = contentType.split(';').map((s) => s.trim());
    this.contentType = baseType as ContentTypes;

    // so we dont get undefined on some cases of this.body

    if (
      this.contentType.includes('text/') ||
      this.contentType.includes('json') ||
      this.contentType.includes('x-www-form-urlencoded') ||
      this.contentType.includes('xml') ||
      this.contentType.includes('javascript')
    ) {
      this.body = '';
    } else {
      this.body = Buffer.alloc(0);
    }

    await this.handleData(req, res);
  }

  private async handleData(
    req: RequestWithPrototype,
    res: ResponseWithPrototype
  ): Promise<any> {
    // decide if the content-type from the request is supported in
    // the server
    this.isParserEnabled();

    await this.parseBody(req, res);
  }

  private isParserEnabled() {
    // maps the parsers configured by user to actual headers
    const enabledTypes = this.parsers.map((p) => mimeTypes[p]);

    if (!enabledTypes.includes(this.contentType)) {
      throw new Error(
        `Couldn't parse body with Content-Type ${this.contentType}, please enable it on Server config`
      );
    }
  }

  private async parseBody(
    req: RequestWithPrototype,
    res: ResponseWithPrototype
  ) {
    return new Promise((resolve) => {
      // json case
      if (this.contentType === 'application/json') {
        req.on('data', (chunk) => {
          this.onData(chunk);
        });

        req.on('end', () => {
          req.body = JSON.parse(this.body);
          resolve(this.data);
        });

        // multipart case
      } else if (this.contentType === 'multipart/form-data') {
        return this.parseMultipart(req, res);
        // url encoded case
      } else if (this.contentType === 'application/x-www-form-urlencoded') {
        return this.parseEncodedUrl();
      }
    });
  }

  /**
   * When data reaches this server, add the chunks to body depending
   * on the typeof body, if it's string, then we are dealing with JSON
   * or other Content-Type that is not binary, else, it's binary.
   *
   * @returns Nothing
   */
  private onData(chunk: Buffer | string) {
    if (typeof this.body === 'string') {
      this.body += chunk.toString();
    } else if (Buffer.isBuffer(this.body)) {
      this.body = Buffer.concat([this.body, chunk as Buffer]);
    } else {
      throw new Error('Unknown body type');
    }
  }

  private parseMultipart(
    req: RequestWithPrototype,
    res: ResponseWithPrototype
  ) {
    req.body = {};
    const bb = busboy({ headers: req.headers });

    bb.on('file', (name, file, info) => {
      const { filename, encoding, mimeType } = info;
      let totalBytes = 0;
      const MAX_SIZE = 3 * 1024 * 1024;

      let image = Buffer.alloc(MAX_SIZE);

      file
        .on('data', (data) => {
          // max size
          totalBytes += data.length;
          if (totalBytes > MAX_SIZE) {
            throw new Error(
              `File is too big, max is ${MAX_SIZE / (1024 * 1024)}MB`
            );
          }
          image = Buffer.concat([image, data]);
        })
        .on('close', () => {
          req.body[filename] = {
            buffer: image,
            filename,
            encoding,
            mimeType,
          };
          console.log(req.body[filename]);
        });
    });

    bb.on('field', (name, val, info) => {
      req.body[name] = val;
    });

    bb.on('close', () => {
      res.writeHead(303, { Connection: 'close', Location: '/' });
      res.end();
    });

    req.pipe(bb);
  }

  /**
   * Ends the request body parsing.
   * Handles:
   * - application/json
   * - application/x-www-form-urlencoded
   *
   * @returns A JSON object or the raw body itself if no case found.
   *
   */

  private parseEncodedUrl() {
    const query = new URLSearchParams(this.body);
    const constructedObject: Record<string, string> = {};
    for (const [key, value] of query.entries()) {
      constructedObject[key] = value;
    }

    return constructedObject;
  }
}
