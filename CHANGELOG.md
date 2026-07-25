# [2.9.0](https://github.com/Jhomel-Dev/Minecraft-server/compare/v2.8.0...v2.9.0) (2026-07-25)


### Bug Fixes

* **agent:** gracefully disconnect socket.io connection before process exit ([3f2fba2](https://github.com/Jhomel-Dev/Minecraft-server/commit/3f2fba2fc9415d95270dd7d9eea787345e05d0ec))


### Features

* **agent:** implement minimize to system tray and background execution ([75241d9](https://github.com/Jhomel-Dev/Minecraft-server/commit/75241d96d1112e847b2b8d9bad495104f6fc4797))
* **web:** block server actions globally when agent disconnects ([04bd74b](https://github.com/Jhomel-Dev/Minecraft-server/commit/04bd74b96d834939bcccd579c9299dd55b8999ba))
* **web:** implement skeleton loading and suppress polling logs ([faefec6](https://github.com/Jhomel-Dev/Minecraft-server/commit/faefec6d8be4fb77d68e0529f3ebc8fd195cd4b7))

# [2.8.0](https://github.com/Jhomel-Dev/Minecraft-server/compare/v2.7.4...v2.8.0) (2026-07-24)


### Bug Fixes

* **agent:** intercept window close event to gracefully shutdown local daemon ([b4555ef](https://github.com/Jhomel-Dev/Minecraft-server/commit/b4555ef1bdfe732ee866dcf32f01260e8641d6f5))


### Features

* **web:** improve offline agent ux in server cards and fix translation keys ([e262908](https://github.com/Jhomel-Dev/Minecraft-server/commit/e262908b89bd074e75ba5a25a2365d8c27dd9b52))

## [2.7.4](https://github.com/Jhomel-Dev/Minecraft-server/compare/v2.7.3...v2.7.4) (2026-07-23)


### Bug Fixes

* **api,agent-gui:** allow dynamic vercel cors and ensure tauri closes cleanly on shutdown ([e3c1b42](https://github.com/Jhomel-Dev/Minecraft-server/commit/e3c1b424ad6c4686ed7a22ccef3bb9c751ba4d5d))

## [2.7.3](https://github.com/Jhomel-Dev/Minecraft-server/compare/v2.7.2...v2.7.3) (2026-07-23)


### Bug Fixes

* **core:** sync agent socket disconnection state and patch legacy vbs encoding ([f2253ba](https://github.com/Jhomel-Dev/Minecraft-server/commit/f2253ba29b6cce3649f68d788f7c2d8f55f16072))
* corregir salto de linea en className ([e0376bf](https://github.com/Jhomel-Dev/Minecraft-server/commit/e0376bf01734782427a1b43ff46638e78d9c9fd9))

## [2.7.2](https://github.com/Jhomel-Dev/Minecraft-server/compare/v2.7.1...v2.7.2) (2026-07-22)


### Bug Fixes

* **ci:** trigger agent build on semantic-release completion and dynamically fetch tag ([dc4790b](https://github.com/Jhomel-Dev/Minecraft-server/commit/dc4790b905e8d74d96bd0a8606d19a8ea50111d7))

## [2.7.1](https://github.com/Jhomel-Dev/Minecraft-server/compare/v2.7.0...v2.7.1) (2026-07-22)


### Bug Fixes

* **web:** update hardcoded release fallback links to point to latest ([5ca8a80](https://github.com/Jhomel-Dev/Minecraft-server/commit/5ca8a809eaa17ca17eb3f4e597cfa47b0214ef6f))

# [2.7.0](https://github.com/Jhomel-Dev/Minecraft-server/compare/v2.6.0...v2.7.0) (2026-07-22)


### Features

* **api:** add interactive Swagger documentation ([89194e7](https://github.com/Jhomel-Dev/Minecraft-server/commit/89194e7117d015f948c0385813a8a7f953f92274))

# [2.6.0](https://github.com/Jhomel-Dev/Minecraft-server/compare/v2.5.0...v2.6.0) (2026-07-22)


### Features

* **backend:** standardize API and Agent logs to english for robust E2E parsing ([d8b2c15](https://github.com/Jhomel-Dev/Minecraft-server/commit/d8b2c15d641abf41db847e29d4256876544e039c))
* **i18n:** implement next-intl across all dashboard components and landing page ([c4586c9](https://github.com/Jhomel-Dev/Minecraft-server/commit/c4586c949353660b0ae2173e2031853d471bcc5d))

# [2.5.0](https://github.com/Jhomel-Dev/Minecraft-server/compare/v2.4.0...v2.5.0) (2026-07-22)


### Bug Fixes

* **ci:** bypass rate limiters during E2E testing to prevent 429 timeouts ([8a81e38](https://github.com/Jhomel-Dev/Minecraft-server/commit/8a81e38a2d16e68eb5d3fd2256398328ee8f9c38))


### Features

* **agent:** implement Phase 2 security hardening (Sanitize serverId and JVM args) ([0461e3b](https://github.com/Jhomel-Dev/Minecraft-server/commit/0461e3bc9a5f790d937f451daca5f354dee90012))
* **api:** implement Phase 1 security hardening (Helmet, CORS, Rate Limit) ([97f54d1](https://github.com/Jhomel-Dev/Minecraft-server/commit/97f54d12dc16137fa98f1cf5e7a57a9a8e052da5))

# [2.4.0](https://github.com/Jhomel-Dev/Minecraft-server/compare/v2.3.0...v2.4.0) (2026-07-21)


### Bug Fixes

* **agent:** support dynamic daemon port and fix e2e teardown process ([9d36d67](https://github.com/Jhomel-Dev/Minecraft-server/commit/9d36d679e203e11fed46048f3d2f5c378f395c3e))
* **api:** fix prisma esm import syntax and force client generation in CI ([c91ab86](https://github.com/Jhomel-Dev/Minecraft-server/commit/c91ab86e3e6301e3656d135c83e2a662d0f9b523))
* **api:** propagate serverId in SEND_COMMAND to LocalAgent ([0074990](https://github.com/Jhomel-Dev/Minecraft-server/commit/00749905072fe8e493281c64949a1d42f13c3a43))
* **ci:** fix E2E api startup and patch high severity npm vulnerabilities ([2bdf31f](https://github.com/Jhomel-Dev/Minecraft-server/commit/2bdf31ffef63ec15ab061908d5101ded53cd0489))
* **ci:** fix postgres health check and disable strict react-hooks lint rules ([94d0afb](https://github.com/Jhomel-Dev/Minecraft-server/commit/94d0afb0bc9a9dd24785a626691cd2192ffa88ff))
* **ci:** fix postgres health check, update dependencies, and resolve TS types ([91b261b](https://github.com/Jhomel-Dev/Minecraft-server/commit/91b261b592aa4c85014a77c94a31203b3b620538))
* **ci:** point wait-on to health endpoint and initialize db in e2e ([458799a](https://github.com/Jhomel-Dev/Minecraft-server/commit/458799ab66034c9d46fcb7d72af02a082fb28ec5))
* **ci:** prevent port collision by explicitly setting PORT 4000 for api and PORT 3000 for web ([6b8e946](https://github.com/Jhomel-Dev/Minecraft-server/commit/6b8e946a71b4f68a6b00e76b71b39b4e13601b78))
* **release:** include AgentGUI and Tauri files in automated versioning ([8e8db75](https://github.com/Jhomel-Dev/Minecraft-server/commit/8e8db75155af723334abd7b7fcfa5d0b9e93394d))
* **web:** hardcode 1GB RAM default limit and fix jsconfig TS parsing ([1b4dc04](https://github.com/Jhomel-Dev/Minecraft-server/commit/1b4dc0432f7464c72089ec80f74b51482215a1c9))


### Features

* **agent:** implement smart boot and refactor controller logic into services ([112ca9e](https://github.com/Jhomel-Dev/Minecraft-server/commit/112ca9eb0b3b36582c212bb16b0f457b10be4954))
* **release:** automate monorepo version bumping and changelog generation ([36b01ca](https://github.com/Jhomel-Dev/Minecraft-server/commit/36b01caf68f4ae71523648e14ffb384f9e85a2d5))
