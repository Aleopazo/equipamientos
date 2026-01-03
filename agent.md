## Contexto para agentes futuros

- **Proyecto:** Control de equipamiento en terreno para ECR Solar.
- **Stack:** Next.js (App Router + Server Actions), Prisma + PostgreSQL, Tailwind CSS v4, Vitest para pruebas ligeras.
- **Objetivo principal:** tablero que liste el equipamiento clave (carro, generador, bombas, SteadyPress, robot, hidráulica) con estado semáforo, archivos adjuntos y tickets operativos.

### Componentes principales
- `src/app/page.tsx`: compone el layout general, ejecuta el seed inicial (`ensureSeedData`) y carga datos.
- `src/components/equipment/sidebar.tsx`: esquema lateral con indicadores de estado y acceso rápido a tickets abiertos.
- `src/components/equipment/detail.tsx`: detalle del equipo con formularios para estado, archivos y tickets.
- `src/server/actions/*`: mutaciones encapsuladas (equipos, estados, archivos, tickets).
- `src/server/queries/equipment.ts`: consultas centralizadas para la UI.
- `src/server/bootstrap.ts`: garantiza la creación de estados y equipos iniciales.
- `src/lib/storage.ts`: utilidades de almacenamiento local de archivos.
- `prisma/schema.prisma`: modelo de datos alineado con Equipment, EquipmentState, EquipmentFile, Ticket y EquipmentLog.

### Configuración rápida
1. `cp env.sample .env` y personalizar credenciales si corresponde.
2. `docker compose up -d` para PostgreSQL local.
3. `npm run db:migrate` (crea migración y genera el cliente Prisma).
4. `npm run dev` para levantar la web en `http://localhost:3000`.

### Flujo esperado
- El seed automático carga estados (“Operativo”, “Revisión”, “Crítico”) y el listado base de equipamiento.
- Cada equipo muestra un semáforo según su estado actual, tickets activos y código interno.
- Formulario de estado registra el cambio y una entrada en `EquipmentLog`.
- Formulario de archivos almacena los ficheros en `storage/files/<equipmentId>` y crea metadatos en BD.
- Tickets se crean, cierran o reabren desde la UI.

### Pruebas
- `npm run test` ejecuta Vitest (actualmente validamos almacenamiento en disco). Extender según necesidades futuras.

### Pendientes / sugerencias
- Añadir autenticación/roles cuando se integre con operaciones reales.
- Incorporar dashboard histórico o métricas (tiempo por estado, tickets por categoría).
- Evaluar migrar almacenamiento de archivos a un servicio externo (S3, GCS) cuando se despliegue en producción.

### Consideraciones
- Mantener Docker corriendo mientras se trabaja (`docker compose up -d`); la BD vive en el volumen `equip-control_postgres_data`.
- Utilizar Server Actions existentes para nuevas operaciones; evita crear endpoints REST a menos que sea estrictamente necesario.
- Si se agregan nuevos tipos de estados o equipos, actualizar `ensureSeedData` solo para defaults; los cambios en producción deberían hacerse mediante migraciones o acciones específicas.

