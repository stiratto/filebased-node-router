import http from "http"

export const cors = (req: http.IncomingMessage, res: http.ServerResponse) => {
  if (req.headers.origin === "http://localhost:5173") {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173")
  }
}


export const send = (res: http.ServerResponse, message: string, status: number) => {
  res.writeHead(status, { "Content-Type": "application/json" })
  res.end(JSON.stringify(message))
}



