## Contexto para agentes futuros

- **Proyecto:** Control de equipamiento en terreno para ECR Solar.
- **Stack:** Next.js (App Router + Server Actions), Prisma + PostgreSQL, Tailwind CSS v4, Vitest para pruebas ligeras.
- **Objetivo principal:** tablero que liste el equipamiento clave (carro, generador, bombas, SteadyPress, robot, hidráulica) con estado semáforo, archivos adjuntos y tickets operativos.

### Componentes principales
- `src/app/page.tsx`: compone el layout general, ejecuta el seed inicial (`ensureSeedData`) y carga datos.
- `src/components/car-switcher.tsx`: toggle superior para alternar entre los 6 carros y el resumen global.
- `src/components/equipment/sidebar.tsx`: listado lateral con indicador de estado (color semáforo) y conteo de tickets abiertos.
- `src/components/equipment/detail.tsx`: detalle del equipo organizado en pestañas expandibles (ficha, estado, archivos, tickets, historial).
- `src/components/equipment/summary.tsx`: consolidado de equipos en alerta y tickets activos.
- `src/server/actions/*`: mutaciones encapsuladas (equipos, estados, archivos, tickets, comentarios).
- `src/server/queries/equipment.ts`: consultas centralizadas para la UI.
- `src/server/bootstrap.ts`: garantiza la creación de estados y equipos iniciales.
- `src/lib/storage.ts`: utilidades de almacenamiento local de archivos.
- `prisma/schema.prisma`: modelo de datos alineado con Car, Equipment, EquipmentState, EquipmentFile, Ticket y EquipmentLog.

### Configuración rápida
1. `cp env.sample .env` y personalizar credenciales si corresponde.
2. `docker compose up -d` para PostgreSQL local.
3. `npm run db:migrate` (aplica migraciones y genera el cliente Prisma).
4. `npm run dev` para levantar la web en `http://localhost:3000`.

### Flujo esperado
- El seed automático carga estados (“Operativo”, “Revisión”, “Crítico”), crea 6 carros (`CAR-01` … `CAR-06`) y replica el set base de equipamiento por carro (`-C0X`).
- Cada equipo muestra un semáforo según su estado actual, tickets activos (excluye `FINALIZADO`) y código interno.
- Formulario de estado registra el cambio y una entrada en `EquipmentLog`.
- Formulario de archivos almacena los ficheros en `storage/files/<equipmentId>` y crea metadatos en BD.
- Tickets se crean, cambian entre `CREADO`, `EN_PROCESO`, `FINALIZADO` y pueden recibir comentarios.
- El estado y las acciones relevantes invalidan la caché vía `revalidatePath("/")`.
- El switch superior actualiza `?car=` o `?view=summary` y redefine el dataset mostrado en el panel lateral.
- El resumen general (`EquipmentIssuesSummary`) agrupa equipos con incidentes y ofrece accesos directos al detalle.

### Pruebas
- `npm run test` ejecuta Vitest (actualmente validamos almacenamiento en disco). Extender según necesidades futuras.
- `npm run build` valida que el código compile con los tipos estrictos de Prisma y Next.

### Pendientes / sugerencias
- Añadir autenticación/roles cuando se integre con operaciones reales.
- Incorporar dashboard histórico o métricas (tiempo por estado, tickets por categoría).
- Evaluar migrar almacenamiento de archivos a un servicio externo (S3, GCS) cuando se despliegue en producción.
- Completar cobertura de pruebas para Server Actions críticas (creación/actualización de equipos, tickets con comentarios).

### Consideraciones
- Mantener Docker corriendo mientras se trabaja (`docker compose up -d`); la BD vive en el volumen `equip-control_postgres_data`.
- Utilizar Server Actions existentes para nuevas operaciones; evita crear endpoints REST a menos que sea estrictamente necesario.
- Si se agregan nuevos tipos de estados o equipos, actualizar `ensureSeedData` solo para defaults; los cambios en producción deberían hacerse mediante migraciones o acciones específicas.
- Para Railway u otros PaaS, monta un volumen para `FILE_STORAGE_PATH` o reemplaza el handler de archivos por URLs remotas.
- Si se introducen más carros, replica la lógica de seeds o expone un formulario administrativo; recuerda mantener la unicidad de códigos de equipo.

