import { defineWebSocketProps } from "@/lib/websockets/utils";
import { Duplex } from "stream";

export const props = defineWebSocketProps({
})

const arr: number[] = []

export function handleConnection(socket: Duplex) {
  // Dev should decide whether or not to let the websocket connection be
  // established

  arr.push(1)
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
    "Upgrade: websocket\r\n" +
    "Connection: Upgrade\r\n",
  );
  console.log('Connection')
  console.log(arr)

}

export function handleMessage() {
}

export function handleDisconnection() {
  arr.pop()
  console.log('Disconnection')
  console.log(arr)
}

