## Control de Equipamiento ECR Solar

Aplicación interna para visualizar y gestionar el equipamiento crítico que se despliega en terreno para servicios de limpieza de paneles solares. El objetivo principal es ofrecer un tablero único con información de estado tipo semáforo, archivos adjuntos y tickets operativos por equipo.

### Arquitectura
- **Frontend / Backend:** Next.js (App Router) con Server Actions y componentes cliente/servidor.
- **Persistencia:** PostgreSQL gestionado vía Prisma ORM.
- **Almacenamiento de archivos:** Driver dual. En local se usa el sistema de ficheros (`./storage/files`), mientras que en Railway (u otros entornos marcados con variables `RAILWAY_*`) se almacenan los binarios directamente en PostgreSQL. Puedes forzar el modo deseado con `FILE_STORAGE_DRIVER=filesystem|database` y ajustar la ruta con `FILE_STORAGE_PATH`.
- **Estilos:** Tailwind CSS v4 con componentes propios.
- **Testing:** Vitest para pruebas puntuales.

### Características principales
- Layout de dos columnas: listado de equipamiento a la izquierda y ficha expandible con pestañas a la derecha.
- Toggle superior para alternar entre los 6 carros operativos y una vista de resumen global.
- Estados operativos tipo semáforo con historial (`EquipmentLog`) y responsable.
- Gestión de archivos por equipo: subida, descarga y eliminación directamente desde la ficha.
- Tickets con estados `CREADO`, `EN_PROCESO`, `FINALIZADO`, soporte de comentarios y prioridad visual.
- Modal de creación de equipamiento que solicita metadatos completos y foto principal.
- Semilla automática (`ensureSeedData`) que inicializa estados y equipamiento base en entornos vacíos.

### Requisitos previos
- Node.js 20+
- Docker Desktop (para levantar PostgreSQL local)
- npm 10+

### Puesta en marcha local
```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno base
cp env.sample .env

# 3. Levantar PostgreSQL en segundo plano
docker compose up -d

# 4. Ejecutar migraciones y generar el cliente Prisma
npm run db:migrate

# 5. Iniciar servidor de desarrollo
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`. El seed automático (`ensureSeedData`) generará los estados y equipos principales si la base se inicia vacía.
Se crean 6 carros (`CAR-01` … `CAR-06`) y para cada uno se replica el set base de equipamiento con códigos terminados en `-C0X`.

### Scripts disponibles
- `npm run dev`: servidor de desarrollo.
- `npm run build`: compilación para producción.
- `npm run start`: servidor en modo producción (requiere build previo).
- `npm run preview`: iniciar el build generado (alias de `next start`).
- `npm run lint`: validación con ESLint.
- `npm run test`: pruebas (Vitest).
- `npm run db:migrate`: migración Prisma (se ejecuta sobre el esquema actual).
- `npm run db:generate`: re-generar cliente Prisma.
- `npm run db:studio`: abrir Prisma Studio.

### Estructura relevante
- `src/app/page.tsx`: página principal con sidebar + detalle.
- `src/components/equipment/*`: componentes de interfaz.
- `src/components/car-switcher.tsx`: toggle superior de carros y acceso al resumen global.
- `src/components/equipment/summary.tsx`: vista consolidada de incidencias y tickets abiertos.
- `src/server/actions/*`: Server Actions para equipos, estados, archivos y tickets.
- `src/server/queries/*`: consultas compuestas para la UI.
- `src/lib/prisma.ts`: cliente Prisma singleton.
- `src/lib/storage.ts`: utilidades de almacenamiento que abstraen entre disco local y base de datos.
- `src/app/files/[fileId]/route.ts`: sirve los archivos ya sea redirigiendo a `file://` (filesystem) o transmitiendo el binario desde PostgreSQL.
- `prisma/schema.prisma`: modelo de datos.
- `prisma/migrations/20260103025713_car_fleet`: migración que introduce la tabla `Car` y el vínculo vehículo-equipo.
- `prisma/migrations/20260103140000_storage_driver`: migración que habilita el driver dual de archivos.
- `docker-compose.yml`: servicio PostgreSQL local.
- `tests/*`: pruebas base (Vitest).

### Flujos clave
- **Estados tipo semáforo:** formulario en el detalle del equipo que usa `assignEquipmentState` para actualizar el estado y registrar el historial.
- **Archivos adjuntos:** en local se guardan bajo `storage/files/<equipmentId>/`, mientras que en Railway se persisten en la columna `data` de `EquipmentFile`. En ambos casos se consumen vía `GET /files/:fileId`, que detecta el origen y responde acorde.
- **Tickets operativos:** creación, seguimiento y cierre desde la ficha del equipo, con cambios de estado y prioridad.
- **Comentarios de tickets:** formulario inline que persiste mensajes con autor opcional y actualiza `lastUpdateAt`.
- **Selección de carros:** el switch superior actualiza la URL (`?car=<id>`) y refresca el panel lateral. La opción “Resumen general” muestra todos los equipos con estado de alerta o tickets abiertos.

### Notas sobre almacenamiento de archivos
- En entorno local los archivos se guardan dentro del repositorio (`storage/files`) y el código evita versionarlos (`.gitignore`). Ajusta `FILE_STORAGE_PATH` en `.env` para cambiar la carpeta.
- Para usar un bucket S3 compatible (por ejemplo Railway Object Storage) define `FILE_STORAGE_DRIVER=object_storage` y completa `FILE_STORAGE_ENDPOINT_URL`, `FILE_STORAGE_REGION`, `FILE_STORAGE_BUCKET_NAME`, `FILE_STORAGE_ACCESS_KEY_ID` y `FILE_STORAGE_SECRET_ACCESS_KEY`. La ruta pública del objeto queda guardada en `EquipmentFile.storedPath`.
- Si la app detecta variables `RAILWAY_*` (o se define explícitamente `FILE_STORAGE_DRIVER=database`), los binarios se almacenan en la tabla `EquipmentFile.data`, manteniendo únicamente metadatos comunes (`fileName`, `mimeType`, etc.).
- Para forzar siempre filesystem usa `FILE_STORAGE_DRIVER=filesystem`. Esto es útil si Railway monta un volumen persistente y prefieres no cargar la base.
- El handler `GET /files/:fileId` gestiona los tres escenarios: redirige a `file://` en local, emite un enlace firmado del bucket o transmite el binario desde la base de datos.

### Pruebas
```bash
npm run test
```
Actualmente se incluye una prueba base para las utilidades de almacenamiento (`tests/storage.test.ts`). Amplía el set de pruebas según crezcan los módulos.

### Apagado
```bash
docker compose down
```
Esto detiene la base local utilizada durante el desarrollo.

### Despliegue sugerido (Railway u otros PaaS)
1. Define `DATABASE_URL` apuntando al PostgreSQL gestionado por el proveedor.
2. (Opcional) Si dispones de volumen persistente para ficheros, establece `FILE_STORAGE_DRIVER=filesystem` y `FILE_STORAGE_PATH=/data/files`. De lo contrario, deja que el driver automático persista en la base (`database`).
3. Ejecuta `npm install`, `npm run db:generate` y `prisma migrate deploy` durante el build (incluye las migraciones `car_fleet` y `storage_driver`).
4. Corre `npm run build` y expone el puerto 3000 con `npm run start`.
5. Si optas por un bucket externo (S3, GCS, etc.), adapta `src/lib/storage.ts` y el handler `/files/[fileId]` para generar URLs firmadas en lugar de transmitir el binario.
