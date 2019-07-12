## Configuracion
Se configuran las constantes S y M en un json. 


## Endpoints
```
POST /sensor
```
Registra un sensor al sistema de monitoreo, devuelve el id asignado al sensor.

```
POST /sensor/:id { value: int }
```
Recibe el valor enviado por un sensor y se agrega a una cola en una tupla del estilo ```<valor, sensor_id, timestamp>``` para su posterior procesamiento.


## Procesamiento
Cada cierta cantidad de tiempo (30 segundos) se agarra uno a uno los elementos de la cola. Se determinan posibles nuevos mínimos y máximos, y verifica que la diferencia entre estos esa superior a la constante S y que el valor promedio la constante M.


## Sugerencias
Cada sensor podría overridear la config default con constantes S y M específicas, al registrar el sensor el sensor se debería incluir dichas constantes en caso de ser necesario.

