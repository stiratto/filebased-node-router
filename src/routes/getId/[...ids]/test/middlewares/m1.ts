import { defineProps } from "@/lib/utils"

export const props = defineProps({})

export const main = (req, res, next) => {
  console.log("middleware on ...ids/test")
  next()
}
