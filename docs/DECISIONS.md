# Architecture Decisions Record (ADR)

## Decisión 1: Clean Code Estricto
- **Regla:** Cero anidamiento de IFs (Early returns) y cero comentarios redundantes.
- **Por qué:** Reducir la carga cognitiva. El código debe ser autodescriptivo mediante nombres de variables y separación de responsabilidades.
- **Consecuencias:** Los métodos son extremadamente cortos. Se requiere delegar en clases especializadas (ej. `ServerProcess` -> `ProcessManager`).

## Decisión 2: Envelopes sobre WebSockets
- **Problema:** Los eventos sueltos (ej. `socket.emit('STATUS_UPDATE')`) hacían imposible seguir el rastro de una acción.
- **Solución:** Todos los payloads se inyectan dentro de una propiedad `payload`, acompañados de un `type` y un `requestId` generado.
- **Consecuencias:** Permite implementar el logger correlacional sin modificar la lógica interna de los controladores.

## Decisión 3: Máquina de Estados de Servidores
- **Problema:** Múltiples componentes seteaban el estado del servidor a cadenas sueltas ('ONLINE', 'OFFLINE'), provocando inconsistencias si un socket se cerraba inesperadamente.
- **Solución:** `ServerStateMachine.js` impone las reglas teóricas de grafos. Si un evento intenta pasar de un estado a otro no contemplado en `validTransitions`, se aborta y se loguea.

## Decisión 4: Reemplazo de Switches/Ifs largos por Mapas (Diccionarios)
- **Problema:** Archivos como `ConnectionService` y `LocalAgentController` tenían decenas de líneas repetidas con `.on(...)`.
- **Solución:** Declarar diccionarios estáticos mapeando el "String del evento" a su "Handler / Callback".
- **Por qué:** Cumple con OCP (Open-Closed Principle). Si se añade un nuevo comando de consola, solo se agrega una línea al mapa, sin tocar lógica estructural.
