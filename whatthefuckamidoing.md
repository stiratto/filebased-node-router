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




## Como verificar si una ruta ya existe?
Rutas a tomar en cuenta:
/user/getId 1
/user/[id] 2

/user/profile/[id] 2
/user/profile 1

Rutas estaticas tienen mas prioridad (campo isDynamic en cada TrieNode)

Llega req.url = /user/getId, como verificamos si existe?
> routeExists(['user', 'getId'])

Hay que recorrer el trie. Para cada segmento que viene en la url,
verificamos si existe en curr.children.

Si no existe: Verificar si curr es una ruta dinamica. Si lo es,
continuar con esa ruta. Si no, return.
Solo vamos a retornar si hasControllers = true.


```
           


```





Que tenemos hasta ahora:

Rutas estaticas
Rutas dinamicas
Ruta dinamica catchall


Por hacer:

- Middlewares
- Buen soporte para metodos HTTP








---


# Middlewares
Llega la request. Las rutas ya estan registradas.
Antes de que la request llegue a un controlador de una ruta,
ejecutamos los middlewares. Donde estan esos middlewares?




- Se ejecutan antes de que la request llegue a los controladores
- Se ejecutan en una ruta especifica o globalmente
- Se ejecutan en orden, es decir, si middleware1 se registro antes de
  middleware2, middleware2 no se puede ejecutar antes de middleware1.
- Se pueden ejecutar ya sea globalmente, por grupo de ruta (/admin >
/admin/profile, /admin/route/route1) o por ruta individual.


Primero, leamos middlewares solo en la carpeta src/middlewares/.
Los middlewares en src/middlewares son los que se ejecutaran
globalmente.



funcion next()

La funcion next() hace que un middleware continue con el proceso de la
request. 
Si un middleware no llama a next() en su main(), la respuesta no
continuara
La llamada a next() ejecuta el middleware siguiente al actual.

Como podemos implementar next()?







