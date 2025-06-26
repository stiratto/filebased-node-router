import { RequestWithPrototype } from "@/lib/request"
import { ResponseWithPrototype } from "@/lib/response"

const main = (req: RequestWithPrototype, res: ResponseWithPrototype) => {
  const { name, password } = req.body

  let connectedUsers = ["user1"]
  connectedUsers.push(name)
  return { status: 200, data: connectedUsers }
}

module.exports = {
  main
}
