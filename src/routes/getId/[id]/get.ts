import { Controller } from "@/lib/interfaces"

const main: Controller['handler'] = (req, res) => {
  return { status: 200, data: `id/${req?.params.id}` }
}

export default {
  main
}
