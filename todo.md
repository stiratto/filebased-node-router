# What we already have

## Router
- Dynamic routing support (:slug)
- Catchall routing support (...slugs)
- Static routing support
- Routing in general made with Trie & Hashmaps, DFS and Backtracking (only used when searching dynamic and catchall)

- Custom server options on server initialization
- Separated router initialization on server startup
- Custom request & response with a few properties and methods


# Todo

[X] (Quick one) implement adding data on catchall request and dynamic request to *req.params*
[X] Re-design middleware's logic, it is currently using old route
resolution logic (the noob and boring one) -- THIS IS THE CURRENT MAIN GOAL
[X] Remake collectMiddlewares() function, current one is broken.
[ ] Regex patterns routing
[ ] Pattern matching routing (* and things like that)
[ ] Improve routing in general, implement parameter types, blabla
[ ] Websocket support
[ ] SSR support
[ ] Better controller system, current one doesn't fully convinces me
[ ] Benchmark everything and polish everything
[ ] Port this to Go, looks fun


## How would we implement WebSockets support?
First, WebSockets is just a communication protocol (standardized) that
allows sending messages in real time, it does that by maintaining an
open TCP connection between the server and the client.

# WEBSOCKETS ToDo
[X] Register a websocket into a route node
To register a websocket into a route node, we should do the following:
When exploring the directories and registering controllers and routes
into the trie, if we stumble upon a ws.ts file, we have to register
this websocket in the route that it is in.
So, the route should have an array of websockets handlers.

[ ] Instead of registering just the name of the websocket (not useful,
obviously), register a whole WebSocket object containing the handlers
and custom props that we define later on.

-- 

[ ] Be able to define useful props to each websocket, like
maxConnections or something like that.
[ ] Resolve routes to websocket routes.

