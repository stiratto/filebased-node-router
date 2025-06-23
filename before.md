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
