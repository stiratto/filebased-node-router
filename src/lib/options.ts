import { RequestWithPrototype } from "./request";
import { ResponseWithPrototype } from "./response";

export const cors = (opts, res: ResponseWithPrototype, req: RequestWithPrototype) => {
  // Access-Control-Allow-Origin
  if (opts.cors.origin) {
    res.setHeader("Access-Control-Allow-Origin", opts.cors.origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  // Access-Control-Allow-Credentials
  if (opts.cors.credentials) {
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  // Access-Control-Max-Age
  if (opts.cors.age) {
    res.setHeader("Access-Control-Max-Age", opts.cors.age.toString());
  }

  // Access-Control-Allow-Methods
  if (opts.cors.methods?.length) {
    const methods = opts.cors.methods.map(m => m.toUpperCase()).join(",");
    res.setHeader("Access-Control-Allow-Methods", methods);
  } else {
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,PUT,OPTIONS");
  }

  // Access-Control-Allow-Headers
  const requestedHeaders = req.headers["access-control-request-headers"];
  if (opts.cors.headers?.length) {
    res.setHeader("Access-Control-Allow-Headers", opts.cors.headers.join(","));
  } else if (requestedHeaders) {
    res.setHeader("Access-Control-Allow-Headers", requestedHeaders);
  }

  // Access-Control-Expose-Headers
  if (opts.cors.expose?.length) {
    res.setHeader("Access-Control-Expose-Headers", opts.cors.expose.join(","));
  }

}
