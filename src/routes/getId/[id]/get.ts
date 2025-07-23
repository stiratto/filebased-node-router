import { Controller } from "@/lib/interfaces"

const main: Controller['handler'] = (req, res) => {
  console.log("on controller getid/id")
  return { status: 200, data: `id/${req?.params.id}` }
}

export default {
  main
}
