# UN FOKIN FRAMEWORK Y ROUTER PARA SERVIDORES NODE
Se inicializa el server, se leen las rutas y controladores.

QUEREMOS:

---

Cada ruta registrada en el file system dentro de 'routes/' como 'user' o 'admin' ( que se
traduce a /user o /admin) meterla en un map para que sea mas rapido
obtener una ruta.

Los controladores son hijos de la carpeta ruta, cada metodo tiene su
controlador, cada controlador debe tener el nombre de un metodo
(post.ts, get.ts, patch.ts)

> Cosas a tener en cuenta acerca de las rutas
- No pueden haber dos rutas con el mismo path.
- No pueden haber dos handlers para un solo metodo, es decir, solo
puede haber 1 metodo de cada uno (1 para get, otro para post, asi.)


Cada ruta tendra un Map asignado con los metodos y sus respectivos
handlers.
            
                               controladores   
              path            method | handler
Algo asi: ```Map<string, Map<string, Controller>>```

(mucho mejor que un array)

 Cuando leyamos UNA ruta, registramos TODOS los controladores de esa
ruta.

Para leer los controladores de una ruta, podemos acceder a los
archivos del path en el filesystem de esa ruta.
Para cada archivo, registramos ese metodo en el Map de la ruta
correspondiente, algo asi:

```
recorrer controladores de /home/user/path-to-server/src/routes/user/
    para cada controlador
        obtener metodo y function handler
        revisar si ya hay un metodo en route con ese metodo
        
        si no hay, anadir ese metodo y handler a la ruta correspondiente
        si ya lo hay, skipeamos



```

---

---
Rutas dinamicas sencillas (/user/:id)

Una ruta dinamica seria una carpeta con el nombre [id]/
src/
    routes/
        user/
            [id]/
                post.ts
                get.ts



///


Para guardar las rutas usaremos un Trie.
                               path    nested paths
TrieNode.children sera un Map<string, RouteTrieNode>
Para registrar una ruta utilizamos segmentos.
Un segment es una parte del path. 
/user/id = ["user", "id"]
/user/[id] = ["user", ":id"]

Al registrar una ruta, loopeamos en todos los segmentos de la ruta que
queremos registrar.
Revisamos si el Trie tiene una key con el segmento actual.
Si no lo tiene, registramos ese segmento con un RouteTrieNode vacio.

Si lo tiene, registramos el segmento siguiente en ese RouteTrieNode,
seria un hijo, una nested route

--- 
Loopear el Trie y hacer algo con cada ruta ya existente.
Empezamos desde el root
let curr = this.routes
Aqui, curr seria el nodo root.
curr.children contiene todos los hashmaps con las rutas

'getId': RouteTrieNode
'user': RouteTrieNode

Loop en curr.children.entries()
Esto nos da acceso al segment y al nodo hijo, a las nested routes
Podemos usar recursividad. logRoutes(node)


---

