# What we already have

## Router
- Dynamic routing support (:slug)
- Catchall routing support (...slugs)
- Static routing support
- Routing in general made with Trie & Hashmaps, DFS and Backtracking (only used when searching dynamic and catchall)

## HTTP Framework or Library, idk dude leave me alone, am i getting crazy?? nobody is talking to me, holy i need some friends
- Custom server options on server initialization
- Separated router initialization on server startup
- Custom request & response with a few properties and methods


# Todo

[X] (Quick one) implement adding data on catchall request and dynamic request to *req.params*
[ ] Re-design middleware's logic, it is currently using old route
resolution logic (the noob and boring one)
[ ] Regex patterns routing
[ ] Pattern matching routing (* and things like that)
[ ] Improve routing in general, implement parameter types, blabla
[ ] Websocket support
[ ] SSR support
[ ] Better controller system, current one doesn't fully convinces me
[ ] Benchmark everything and polish everything
[ ] Port this to Go, seems fun

