# Reliability & Resilience (CraftControl)

Este documento detalla los mecanismos arquitectónicos implementados para garantizar que el sistema (API + Agente) sea robusto, tolerante a fallos y predecible.

## 1. Gestión de Procesos (Agent)

El Agente local interactúa con procesos binarios (`java` para Minecraft, `bore` para túneles). Para evitar fugas de memoria o procesos huérfanos (zombis), se implementó:

- **ProcessManager:** Una clase genérica que encapsula `spawn`, maneja los flujos `stdout`/`stderr` de forma segura y expone un método `stopGracefully`.
- **PidStore:** Un sistema de persistencia en disco (`~/.minecraft-manager/agent-state.json`) que mapea cada servidor activo con el PID de su proceso en el sistema operativo.
- **Recuperación de Huérfanos:** Al iniciar, el Agente lee el `PidStore`. Si encuentra procesos vivos (mediante `process.kill(pid, 0)`), asume su control, evitando que queden corriendo sin supervisión.
- **waitForExit:** El apagado de servidores ya no es un `SIGKILL` ciego. Se envía un `stop` por la consola, seguido de un *polling* no bloqueante. Si el proceso no muere en 10 segundos, se fuerza su cierre.

## 2. Consistencia de Estado (API)

Para evitar desincronizaciones entre lo que el Agente ejecuta y lo que la Base de Datos cree que está pasando:

- **Fuente de Verdad Local:** El Agente siempre tiene la razón. Al conectarse, emite un evento `SYNC_STATE` con la lista exacta de servidores corriendo. La API reconcilia la Base de Datos, apagando los que deban estar apagados y encendiendo los que sigan activos.
- **Máquina de Estados Finita (ServerStateMachine):** Se prohíben las transiciones inválidas (ej. pasar de `OFFLINE` a `STOPPING`). Esto evita que un error lógico corrompa el estado en BD.

## 3. Observabilidad

- **Envelopes (Sobres):** Todos los mensajes por WebSocket viajan envueltos en un sobre `{ type, payload, requestId, agentId }`. Esto permite trazar peticiones desde el Frontend hasta el Agente.
- **Logging Estructurado:** Se reemplazaron los `console.log` dispersos por Winston (JSON estructurado).
- **Sanitización:** El logger censura automáticamente cualquier llave o valor sensible (tokens JWT, secrets) antes de volcarlo a `stdout`.
- **Health Checks Profundos:** El endpoint `/api/health` no solo responde 200, sino que ejecuta un `SELECT 1` real contra la base de datos para asegurar conectividad. El Agente tiene su propio `/health` que verifica RAM y permisos de disco.
