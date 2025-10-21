import { defineMiddlewareProps } from "@/lib/utils"

export const props = defineMiddlewareProps({})

export const main = (req, res, next) => {
  console.log("middleware on ...ids/test")
  next()
}
