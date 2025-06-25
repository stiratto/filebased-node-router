import { Server } from "@/server"

const server = new Server(4000, {
  cors: {
    enabled: true,
    // can be uppercase or lowercase, it'll get formatted properly
  }
})
