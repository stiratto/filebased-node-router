import busboy from "busboy";
import { ServerResponseAndPrototype } from "@/server";
import { ResponseWithPrototype } from "./response";
import { RequestWithPrototype } from "./request";

type ContentTypes =
  "application/json"
  | "application/x-www-form-urlencoded"
  | "multipart/form-data"

export class Parser {
  contentType: ContentTypes
  data: Buffer
  body: any;
  req: RequestWithPrototype
  res: ServerResponseAndPrototype

  constructor(req: RequestWithPrototype, res: ResponseWithPrototype) {
    this.req = req;
    this.res = res;
  }

  async init(): Promise<any> {

    // if method is not post, return
    if (!(this.req.method === "POST"))
      return

    // extract headers and put them on this.
    const contentType = this.req.headers['content-type']
    this.contentType = contentType as ContentTypes


    // so we dont get undefined on some cases of this.body
    if (
      this.contentType.includes("text/") ||
      this.contentType.includes("json") ||
      this.contentType.includes("x-www-form-urlencoded") ||
      this.contentType.includes("xml") ||
      this.contentType.includes("javascript")
    ) {
      this.body = ""
    } else {
      this.body = Buffer.alloc(0)
    }


    return new Promise((resolve) => {

      // special handling for multipart/form-data
      if (contentType.startsWith("multipart/form-data")) {
        this.parseMultipart()
      } else {
        // if it's not multipart, let's treat it as text/plain or json
        // or other that is not binary

        this.req.on("data", (chunk) => {
          this.onData(chunk)
        })

        this.req.on("end", () => {
          const data = this.end()
          this.req.body = data
          resolve(data)
        })
      }

    })
  }

  /**
   * Populates the body instance variable to avoid reassigning
   * body being undefined.
   *
   * @returns Nothing
   */
  private onData(chunk: Buffer | "string") {
    if (typeof this.body === 'string') {
      this.body += chunk.toString()
    } else if (Buffer.isBuffer(this.body)) {
      this.body = Buffer.concat([this.body, chunk as Buffer])
    } else {
      throw new Error("Unknown chunk type")
    }
  }


  private parseMultipart() {

    const bb = busboy({ headers: this.req.headers });

    bb.on('file', (name, file, info) => {

      const { filename, encoding, mimeType } = info;

      console.log(
        `File [${name}]: filename: %j, encoding: %j, mimeType: %j`,
        filename,
        encoding,
        mimeType
      );

      file.on('data', (data) => {
        console.log(`File [${name}] got ${data.length} bytes`);
      }).on('close', () => {
        console.log(`File [${name}] done`);
      });

    });

    bb.on('field', (name, val, info) => {
      console.log(`Field [${name}]: value: %j`, val);
    });

    bb.on('close', () => {
      console.log('Done parsing form!');
      this.res.writeHead(303, { Connection: 'close', Location: '/' });
      this.res.end();
    });

    this.req.pipe(bb)
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
  private end() {

    // Content-Type: 'application/json'
    if (this.contentType === 'application/json')
      try {
        console.log(this.body)
        return JSON.parse(this.body)
      } catch (err) {
        throw new Error("Invalid JSON")
      }

    // Content-Type: 'application/x-www-form-urlencoded'
    if (this.contentType === 'application/x-www-form-urlencoded') {
      const query = new URLSearchParams(this.body)
      let constructedObject: Record<string, string> = {}
      for (const [key, value] of query.entries()) {
        constructedObject[key] = value
      }

      return constructedObject
    }

    return this.body
  }

}
