import { IncomingMessage, ServerResponse } from "http"
//
const index = (req: IncomingMessage, res: ServerResponse) => {
  console.log("oooaosdoadosapdoaspdoaspdoads")
  let id = crypto.randomUUID()
  let response = {
    id,
  }
  return response
}

export default {
  index
}

