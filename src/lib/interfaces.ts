import { TMethod } from "./types"

export interface Route {
  path: string
  middlewares?: Function[]
  controllers?: Controller[]
}

export interface Controller {
  handler: Function
}


