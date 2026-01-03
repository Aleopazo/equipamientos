## Control de Equipamiento ECR Solar

Aplicación interna para visualizar y gestionar el equipamiento crítico que se despliega en terreno para servicios de limpieza de paneles solares. El objetivo principal es ofrecer un tablero único con información de estado tipo semáforo, archivos adjuntos y tickets operativos por equipo.

### Arquitectura
- **Frontend / Backend:** Next.js (App Router) con Server Actions.
- **Persistencia:** PostgreSQL + Prisma ORM.
- **Almacenamiento de archivos:** Sistema de ficheros local (`./storage/files`).
- **Estilos:** Tailwind CSS (v4) con componentes propios.

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

### Scripts disponibles
- `npm run dev`: servidor de desarrollo.
- `npm run build`: compilación para producción.
- `npm run start`: servidor en modo producción.
- `npm run lint`: validación con ESLint.
- `npm run test`: pruebas (Vitest).
- `npm run db:migrate`: migración Prisma (se ejecuta sobre el esquema actual).
- `npm run db:generate`: re-generar cliente Prisma.
- `npm run db:studio`: abrir Prisma Studio.

### Estructura relevante
- `src/app/page.tsx`: página principal con sidebar + detalle.
- `src/components/equipment/*`: componentes de interfaz.
- `src/server/actions/*`: Server Actions para equipos, estados, archivos y tickets.
- `src/server/queries/*`: consultas compuestas para la UI.
- `src/lib/prisma.ts`: cliente Prisma singleton.
- `src/lib/storage.ts`: utilidades de almacenamiento en disco.
- `prisma/schema.prisma`: modelo de datos.
- `docker-compose.yml`: servicio PostgreSQL local.
- `tests/*`: pruebas base (Vitest).

### Flujos clave
- **Estados tipo semáforo:** formulario en el detalle del equipo que usa `assignEquipmentState` para actualizar el estado y registrar el historial.
- **Archivos adjuntos:** los ficheros se guardan bajo `storage/files/<equipmentId>/`; pueden descargarse vía `GET /files/:fileId`.
- **Tickets operativos:** creación, cierre y reapertura desde la UI con las acciones de `tickets`.

### Notas sobre almacenamiento de archivos
- En entorno local los archivos se guardan dentro del repositorio (`storage/files`). Ajusta `FILE_STORAGE_PATH` en `.env` si quieres otro destino.
- Verifica los permisos del directorio cuando despliegues en servidores Linux.

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
