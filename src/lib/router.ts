import http from "http"
import { parse } from "url"
import { send } from "./utils"

// let's create a simple router from scratch that uses folder names as
// routes, like next.js does
//
// we want:
// - folder names as routes. (getId folder maps to /getId route)
// - files names inside folder maps to logic. (index.ts inside getId should contain the routes controllers)
// - we want to specify method post when registrating a new route,
//    this way we could add headers and customize responses depending on
//    the method
//
// 
// a single route can contain various methods, each folder route will
// have a file for each method (post.ts, get.ts, etc)
//

type Method = "POST" | "GET" | "PUT" | "DELETE" | "PATCH" | "WEBSOCKET"

export class Router {
  private routes: [];

  constructor() {
    this.routes = []
    this.readRoutes()
  }

  // read folder names inside /routes
  async readRoutes() {
    const folderName = ""
  }
}


export const router = (req: http.IncomingMessage, res: http.ServerResponse) => {


  const { pathname, query } = parse(req.url!, true)

  if (req.method === 'GET') {
    switch (pathname) {
      case "/checkId":
        if (query.id !== 'null' && connectedUsers.has(query.id as string)) {
          send(res, "Found", 200)
        } else {
          send(res, "ID Not Found", 400)
        }
        break

      default:
        res.writeHead(404)
        res.end()

    }
  } else if (req.method === "POST") {
    switch (pathname) {
      case '/initiateChat':
        try {
          let body = "";
          req.on("data", chunk => {
            body += chunk.toString();
          });

          req.on("end", () => {
            const { id, remoteId } = JSON.parse(body)
            if (!id || !remoteId) {
              return send(res, "Missing parameters", 400);
            }

            const remoteUserSocket = connectedUsers.get(remoteId)

            if (remoteUserSocket) {
              console.log(`User ${id} is initiating a chat with user ${remoteId}`)
              remoteUserSocket.send(JSON.stringify({
                type: "new_chat",
                from: id
              }))
            }

            send(res, "Chat initiated", 200)
          })
        } catch (err: any) {
          send(res, "Invalid JSON", 400)
        }


    }
  }
}
