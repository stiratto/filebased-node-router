import { Server } from '@/server'

new Server(4000, {
  cors: {
    enabled: true,
    // can be uppercase or lowercase, it'll get formatted properly
  },
  parsers: ['json', 'multipart', 'urlencoded']
})
