import http from "http"
import { parse } from "url"
import { WebSocket, WebSocketServer } from "ws"
import { cors } from "@/lib/utils"
import { Router } from "@/router"

// let connectedUsers = new Map<string, WebSocket>()

const router = new Router()
const server = http.createServer((req, res) => {
   cors(req, res)
   router.handleRequest(req, res)

})

// const wss = new WebSocketServer({ server })

// wss.on('connection', function connection(ws, req) {
//    const { pathname, query } = parse(req.url!, true)
//
//    if (pathname === '/connect') {
//       console.log("user connected")
//       const { userId: id } = query
//       if (id !== 'null') {
//          connectedUsers.set(id as string, ws)
//       }
//
//    } else if (pathname === "/disconnect") {
//       const { id } = query
//       if (id !== 'null') {
//          connectedUsers.delete(id as string)
//       }
//    }
//
//
//    ws.on('message', function message(data: string) {
//       const parsedData = JSON.parse(data)
//       const { to, message, userId } = parsedData
//
//       console.log(`Message from ${userId} to ${to}: ${message}`)
//
//       const receiverSocket = connectedUsers.get(to)
//
//       if (receiverSocket) {
//          console.log("asd")
//          receiverSocket?.send(JSON.stringify({
//             type: "new_message",
//             from: userId,
//             to,
//             message,
//          }))
//       } else {
//          console.log("nop nop")
//       }
//    })
// })
//

server.listen(4000)
