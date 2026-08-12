# [2.13.0](https://github.com/Jhomel-Dev/Minecraft-server/compare/v2.12.0...v2.13.0) (2026-08-12)


### Bug Fixes

* **agent): migrate execSync to spawnSync in Forge and NeoForge; fix(web:** prevent memory leak in E2E tests by using SIGKILL ([8623d3b](https://github.com/Jhomel-Dev/Minecraft-server/commit/8623d3bab2988ed03b107ed17505b977a077f0b9))
* **api:** implement server settings validation and execution fixes ([54f1250](https://github.com/Jhomel-Dev/Minecraft-server/commit/54f125021bdcf1b987ba79d9b783dab0dd1969dd))
* **api:** remove verifyToken from logout to ensure cookie clearance on expired access tokens ([40a770e](https://github.com/Jhomel-Dev/Minecraft-server/commit/40a770eec1dac548ebadd61ae424d92a379fb9c9))
* **api:** secure agent controller and gateway logic ([575f54e](https://github.com/Jhomel-Dev/Minecraft-server/commit/575f54e89101b38c54a25728a2d2bc5fee5aa1c3))
* **api:** secure auth module and configure global rate limiters ([d309612](https://github.com/Jhomel-Dev/Minecraft-server/commit/d309612b6a76be83076707d65caa8ee656d71a70))
* **ci:** add JWT_REFRESH_SECRET to e2e-tests workflow to fix failing tests ([7f5577e](https://github.com/Jhomel-Dev/Minecraft-server/commit/7f5577e54726ec7fd0af3d9e57fce8dcb0748c1a))
* **gui:** improve daemon respawn logic, check PID, and log spawn errors ([7e74afa](https://github.com/Jhomel-Dev/Minecraft-server/commit/7e74afafff3f4fffbb78f877fe0f354fb1290f0b))
* **gui:** remove debug globals and enforce strict CSP policy ([12e423e](https://github.com/Jhomel-Dev/Minecraft-server/commit/12e423eaaddadb3dcaf1b01eb0cca6d837eab1a8))
* **gui:** verify HTTP status in request_unlink ([2de9f64](https://github.com/Jhomel-Dev/Minecraft-server/commit/2de9f6490d5e97610e42763e31a69d6e03eb2f51))
* **localagent): port hotfix to ignore dev tools in SmartBootService; feat(api:** add tar.gz backup support and robust validation ([8bfecc9](https://github.com/Jhomel-Dev/Minecraft-server/commit/8bfecc920062176568f14c6e1ac0b359493a61b5))
* **localagent:** fix FabricInstaller command injection ([5021be6](https://github.com/Jhomel-Dev/Minecraft-server/commit/5021be67b03774a97bc8e6a07faad43309c60373))
* **localagent:** fix JVM memory arguments overwriting logic ([fd2b367](https://github.com/Jhomel-Dev/Minecraft-server/commit/fd2b367142c211e9b4a162a9b597c761e5ebec6f))
* **localagent:** improve BackupService security and performance ([58cc9aa](https://github.com/Jhomel-Dev/Minecraft-server/commit/58cc9aa77941bef54ca982581488c5c76856bc9c))
* **localagent:** remove sensitive agent token logging ([f3020e5](https://github.com/Jhomel-Dev/Minecraft-server/commit/f3020e592788b603553177faa0247e3fcc4679af))
* resolve remaining merge conflicts in daemon.rs ([859eefa](https://github.com/Jhomel-Dev/Minecraft-server/commit/859eefa1b30dc8e590509dbd8cf4fe0e1da1088e))
* **web:** add size limit and prevent path traversal in file uploads ([0d545ba](https://github.com/Jhomel-Dev/Minecraft-server/commit/0d545ba5feb4f9b1ed27f03b0fd6fc4f954718db))
* **web:** add try-catch to JSON parsing, fix RAM format, remove dead code ([1d5470e](https://github.com/Jhomel-Dev/Minecraft-server/commit/1d5470edf4302dc6a491fe459602da7641dfd63a))
* **web:** fix session refresh hang and aggressive polling ([27437c0](https://github.com/Jhomel-Dev/Minecraft-server/commit/27437c0bfbac05a210a84086b6fc028fab31a5ca))
* **web:** invalidate server-side session on logout ([521dbdf](https://github.com/Jhomel-Dev/Minecraft-server/commit/521dbdfefd76dbdcdc5a3625c1ef632f2eca5b4c))
* **web:** prevent proxy SSRF vulnerability via URL allowlist ([baf0a21](https://github.com/Jhomel-Dev/Minecraft-server/commit/baf0a214e6cfbee9130fea1409721c8c934052d5))


### Features

* **agentgui:** integrate secure daemon lockfile authentication ([558965d](https://github.com/Jhomel-Dev/Minecraft-server/commit/558965dde7378fa78735e75fcb299ebc375c00df))
* **agentgui:** integrate secure daemon lockfile authentication ([11d02f3](https://github.com/Jhomel-Dev/Minecraft-server/commit/11d02f359696ba339cbc036233c949685ab80bef))
* **localagent:** implement secure LocalDaemonController authentication ([3f0dcc2](https://github.com/Jhomel-Dev/Minecraft-server/commit/3f0dcc22e6df84383aebdadcede63eafdf58d3fe))

# [2.12.0](https://github.com/Jhomel-Dev/Minecraft-server/compare/v2.11.0...v2.12.0) (2026-08-01)


### Features

* **localagent:** add global exception handlers for graceful shutdown ([f9b709d](https://github.com/Jhomel-Dev/Minecraft-server/commit/f9b709d5f9c9856e5b03645f967349cde4cf702a))
* **localagent:** implement cross-platform process tree killing and port resilience ([3985db5](https://github.com/Jhomel-Dev/Minecraft-server/commit/3985db5f94718bd348316a93571905d1350bfe53))

# [2.11.0](https://github.com/Jhomel-Dev/Minecraft-server/compare/v2.10.0...v2.11.0) (2026-08-01)


### Features

* **web:** add i18n to profile and replace mock data with real auth and server stores ([840a33c](https://github.com/Jhomel-Dev/Minecraft-server/commit/840a33c767ce7a784240785df47e9ee4bb6171be))
* **web:** integrate i18n translations for server files, backups, and network pages ([4a78b13](https://github.com/Jhomel-Dev/Minecraft-server/commit/4a78b13c7c8f10f35c6d8fd4b4febf17e282377b))

# [2.10.0](https://github.com/Jhomel-Dev/Minecraft-server/compare/v2.9.1...v2.10.0) (2026-07-27)


### Bug Fixes

* **local-agent:** ensure config dir creation for daemon.lock in CI environments ([cfc66b1](https://github.com/Jhomel-Dev/Minecraft-server/commit/cfc66b1f9876e0aa494630470abfb5a711c9d491))
* **web:** fetch pending server size continuously without requiring page refresh ([e988068](https://github.com/Jhomel-Dev/Minecraft-server/commit/e9880681d9c2acaf8ccbbf04b5ce3a6319f18dd0))


### Features

* **agent-gui:** add single-instance plugin and lockfile path unit tests ([a10abbb](https://github.com/Jhomel-Dev/Minecraft-server/commit/a10abbbd8dada0f3b87643eeb83b8b606a1977f6))
* **agent-gui:** enable dynamic port resolution in frontend dev methods ([bd846b9](https://github.com/Jhomel-Dev/Minecraft-server/commit/bd846b92f01f2e7eab78b48435feff228f8bf7fa))
* **agent-gui:** implement daemon watchdog with backoff and graceful shutdown ([ec4ddd8](https://github.com/Jhomel-Dev/Minecraft-server/commit/ec4ddd82683bad638590224a3640196c1f4b01ae))
* **local-agent:** implement smartboot sweep and auto-increment port hunting ([1662511](https://github.com/Jhomel-Dev/Minecraft-server/commit/16625117304f9af67f9ce9050064aa2c331acb95))

## [2.9.1](https://github.com/Jhomel-Dev/Minecraft-server/compare/v2.9.0...v2.9.1) (2026-07-25)


### Bug Fixes

* **agent:** persist credentials, graceful disconnect, and local API priority ([a89cf59](https://github.com/Jhomel-Dev/Minecraft-server/commit/a89cf59696085946c5a74e33a86264a46d8c8f7c))

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
