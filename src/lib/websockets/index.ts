// The app starts, what do we do so the app reads the websockets?
import fs from "fs/promises"
import { WebSocketOptions } from "../types"
import { Router } from "@/router"

interface WebSocketProps {
  baseUrl: string
}


interface WebSocketFile {
  props: WebSocketProps,
  handleEvent: () => void
}

export class WebSocketsInstance {
  // Contains the register websockets files, not literal websockets,
  // but websockets files (ws.ts), each file would contain props and
  // functions
  private registeredWebSockets: WebSocketFile[]
  constructor(private router: Router) {
    this.registeredWebSockets = []
  }



  async registerWebSocket(path: string, segments: string[]) {
    await this.readWebSocket(path, segments)

  }


  async readWebSocket(path: string, segments) {
    try {

      const { props, handleEvent } = await import(path) as WebSocketFile


      // const { route } = routeExists

      const socketToAdd: WebSocketFile = {
        props,
        handleEvent
      }

      const newArr = [...this.registeredWebSockets, socketToAdd]
      this.registeredWebSockets = newArr
    } catch (err: any) {
      throw new Error(err)
    }
  }
}
