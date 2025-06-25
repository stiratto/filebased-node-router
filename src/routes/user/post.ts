import { send } from "@/lib/utils"
import { IncomingMessage, ServerResponse } from "http"

const main = (req: IncomingMessage, res: ServerResponse) => {
  let connectedUsers = ["user1"]
  connectedUsers.push("user2")
  return connectedUsers
}

module.exports = {
  main
}
