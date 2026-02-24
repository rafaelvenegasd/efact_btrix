# efact_btrix

Sistema de **facturación electrónica para Ecuador** integrado con Bitrix24.
Construido con NestJS 10, TypeScript, Prisma (PostgreSQL) y BullMQ (Redis).

Implementa el ciclo completo de emisión de comprobantes electrónicos ante el **SRI** (Servicio de Rentas Internas):
generación de XML, firma digital XAdES-BES, envío a recepción, consulta de autorización y generación del RIDE (PDF).

---

## Tabla de contenidos

- [Arquitectura](#arquitectura)
- [Requisitos previos](#requisitos-previos)
- [Configuración del entorno](#configuración-del-entorno)
- [Ejecución con Docker (recomendado)](#ejecución-con-docker-recomendado)
- [Ejecución en local (desarrollo)](#ejecución-en-local-desarrollo)
- [Scripts disponibles](#scripts-disponibles)
- [Flujo de emisión](#flujo-de-emisión)
- [API](#api)
- [Base de datos](#base-de-datos)
- [Estructura del proyecto](#estructura-del-proyecto)

---

## Arquitectura

El sistema está compuesto por **dos procesos independientes** que comparten la base de datos y Redis:

| Proceso | Entry point | Función |
|---|---|---|
| **API** | `src/main.ts` | Servidor HTTP (NestJS), recibe peticiones de Bitrix24 |
| **Worker** | `src/worker.ts` | Procesador BullMQ, maneja el ciclo de vida del comprobante |

```
Bitrix24 → POST /bitrix/emit-invoice
               │
               ▼
         [API] InvoiceService.createDraft()
               │
               ▼
         BullMQ "invoice-processing"
               │
               ▼
         [Worker] InvoiceProcessingProcessor
               ├── generateXml()
               ├── sign() (XAdES-BES)
               ├── sendToReception() (SRI SOAP)
               ├── checkAuthorizationWithRetry()
               └── generateRide() (PDF)
```

---

## Requisitos previos

### Para ejecutar con Docker

- [Docker](https://docs.docker.com/get-docker/) >= 24
- [Docker Compose](https://docs.docker.com/compose/) >= 2.20

### Para ejecutar en local

- [Node.js](https://nodejs.org/) >= 20
- [npm](https://www.npmjs.com/) >= 10
- PostgreSQL 16
- Redis 7

---

## Configuración del entorno

1. Copia el archivo de ejemplo y edítalo con tus valores:

```bash
cp .env.example .env
```

2. Variables requeridas:

```dotenv
# ── Aplicación ────────────────────────────────────────────
NODE_ENV=development
PORT=4000
API_PREFIX=api/v1

# ── Base de datos ─────────────────────────────────────────
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/efact_btrix?schema=public"

# ── Redis / BullMQ ────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ── JWT ───────────────────────────────────────────────────
JWT_SECRET=cambia-esto-en-produccion-usa-una-cadena-larga-aleatoria
JWT_EXPIRATION=86400s

# ── SRI Ecuador ───────────────────────────────────────────
SRI_ENV=TEST                     # TEST | PROD

SRI_RECEPCION_TEST=https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl
SRI_AUTORIZACION_TEST=https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl

SRI_RECEPCION_PROD=https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl
SRI_AUTORIZACION_PROD=https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl

SRI_AUTH_POLL_INTERVAL_MS=5000   # Intervalo de consulta de autorización
SRI_AUTH_MAX_RETRIES=12          # Máximo de reintentos de autorización

# ── Empresa (tenant único) ────────────────────────────────
COMPANY_RUC=0990123456001
COMPANY_RAZON_SOCIAL=MI EMPRESA S.A.
COMPANY_NOMBRE_COMERCIAL=MI EMPRESA
COMPANY_DIR_MATRIZ=Av. Principal 123, Guayaquil
COMPANY_DIR_ESTABLECIMIENTO=Av. Principal 123, Guayaquil
COMPANY_CONTRIBUYENTE_ESPECIAL=   # Número si aplica, dejar vacío si no
COMPANY_OBLIGADO_CONTABILIDAD=SI
COMPANY_ESTABLECIMIENTO=001
COMPANY_PUNTO_EMISION=001

# ── Firma electrónica ─────────────────────────────────────
SIGNING_CERT_PATH=./certs/certificate.p12
SIGNING_CERT_PASSWORD=tu-password-del-certificado

# ── PDF / RIDE ────────────────────────────────────────────
PDF_OUTPUT_DIR=./storage/pdfs

# ── Bitrix24 ──────────────────────────────────────────────
BITRIX_WEBHOOK_URL=
BITRIX_DEAL_STAGE_FACTURADO=
BITRIX_DEAL_STAGE_ERROR=
```

3. Coloca tu certificado de firma electrónica en `certs/certificate.p12`.
   El directorio `certs/` está en `.gitignore` y nunca debe subirse al repositorio.

---

## Ejecución con Docker (recomendado)

El `docker-compose.yml` levanta cuatro servicios: `postgres`, `redis`, `api` y `worker`.

### Levantar todo el stack

```bash
# Construir imágenes y levantar en background
docker compose up --build -d

# Ver logs en tiempo real
docker compose logs -f

# Ver logs por servicio
docker compose logs -f api
docker compose logs -f worker
```

### Ejecutar migraciones (primera vez o tras cambios en el schema)

```bash
docker compose exec api npx prisma migrate deploy
```

### Detener el stack

```bash
docker compose down

# Detener y eliminar volúmenes (borra datos de BD y Redis)
docker compose down -v
```

### Descripción de servicios Docker

| Servicio | Imagen | Puerto | Descripción |
|---|---|---|---|
| `postgres` | postgres:16-alpine | 5432 | Base de datos principal |
| `redis` | redis:7-alpine | 6379 | Cola BullMQ y caché |
| `api` | build: Dockerfile (target: api) | `${PORT:-3000}` | Servidor HTTP NestJS |
| `worker` | build: Dockerfile (target: worker) | — | Procesador de trabajos BullMQ |

**Volúmenes montados:**
- `./storage` → `/app/storage` (PDFs generados)
- `./certs` → `/app/certs` (certificado de firma, solo lectura)

---

## Ejecución en local (desarrollo)

### 1. Instalar dependencias

```bash
npm install
```

### 2. Levantar infraestructura (solo BD y Redis)

```bash
# Solo postgres y redis, sin construir las imágenes de api/worker
docker compose up postgres redis -d
```

### 3. Generar cliente Prisma y ejecutar migraciones

```bash
npm run prisma:generate
npm run prisma:migrate:dev
```

### 4. Levantar API y Worker en terminales separadas

```bash
# Terminal 1 – API HTTP
npm run start:dev

# Terminal 2 – Worker BullMQ
npm run start:worker:dev
```

La API estará disponible en `http://localhost:4000/api/v1`.

---

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run build` | Compila TypeScript a `dist/` |
| `npm run start` | Inicia la API en producción |
| `npm run start:dev` | Inicia la API en modo watch |
| `npm run start:worker` | Inicia el worker en producción |
| `npm run start:worker:dev` | Inicia el worker en modo watch |
| `npm run prisma:generate` | Genera el cliente de Prisma |
| `npm run prisma:migrate:dev` | Crea y aplica migraciones (desarrollo) |
| `npm run prisma:studio` | Abre Prisma Studio en el navegador |
| `npm run lint` | Ejecuta ESLint |
| `npm run test` | Ejecuta tests unitarios |
| `npm run test:e2e` | Ejecuta tests de integración |

---

## Flujo de emisión

### Estados del comprobante

```
DRAFT → SIGNED → SENT → AUTHORIZED
                      └→ REJECTED
              └→ ERROR (cualquier etapa)
```

### Reintentos BullMQ

Los trabajos se reintentan automáticamente con backoff exponencial:

| Intento | Espera |
|---|---|
| 1 | inmediato |
| 2 | 5 segundos |
| 3 | 25 segundos |

Los trabajos completados se retienen **24 horas** (máx. 1000).
Los trabajos fallidos se retienen **7 días** (para auditoría).

### Clave de acceso SRI (49 dígitos)

```
ddMMaaaa(8) + tipoComp(2) + ruc(13) + ambiente(1) +
serie(6) + secuencial(9) + codigoNum(8) + tipoEmision(1) + digitoVerificador(1)
```

El dígito verificador se calcula con módulo 11 usando coeficientes 2-7 cíclicos de derecha a izquierda.

---

## API

### Autenticación

Todos los endpoints (excepto `/auth/login`) requieren un token JWT en el header:

```
Authorization: Bearer <token>
```

### Endpoints

#### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

#### Emitir factura desde Bitrix24

```http
POST /api/v1/bitrix/emit-invoice
Authorization: Bearer <token>
Content-Type: application/json

{
  "dealId": "12345"
}
```

Respuesta `202 Accepted`:

```json
{
  "invoiceId": "uuid",
  "status": "DRAFT",
  "message": "Invoice queued for processing"
}
```

La operación es **asíncrona**: el comprobante se encola y el worker lo procesa en background.

---

## Base de datos

### Modelos principales

- **Company** — datos del emisor (tenant único)
- **InvoiceSequence** — contador secuencial por ambiente (TEST/PROD)
- **Invoice** — comprobante electrónico con todos sus campos SRI
- **InvoiceItem** — líneas de detalle del comprobante
- **InvoiceAuditLog** — historial de transiciones de estado

### Prisma Studio (interfaz visual)

```bash
npm run prisma:studio
# Abre http://localhost:5555
```

---

## Estructura del proyecto

```
efact_btrix/
├── src/
│   ├── main.ts                    # Entry point API HTTP
│   ├── worker.ts                  # Entry point Worker BullMQ
│   ├── app.module.ts
│   ├── worker-app.module.ts
│   ├── auth/                      # JWT auth, guard, @Public()
│   ├── bitrix/                    # Controller POST /bitrix/emit-invoice
│   ├── common/
│   │   ├── config/                # Configuración centralizada
│   │   ├── exceptions/            # Excepciones de dominio
│   │   ├── filters/               # AllExceptionsFilter
│   │   ├── interceptors/          # LoggingInterceptor
│   │   └── logger/                # Winston logger
│   ├── invoice/
│   │   ├── invoice.service.ts     # Lógica de negocio
│   │   ├── invoice.repository.ts  # Acceso a datos (Prisma)
│   │   ├── utils/
│   │   │   └── clave-acceso.util.ts
│   │   └── xml/
│   │       └── invoice-xml.builder.ts
│   ├── sri/                       # Cliente SOAP SRI
│   ├── signing-provider/          # Firma XAdES-BES
│   ├── pdf/                       # Generador RIDE
│   ├── queues/
│   │   ├── queues.module.ts       # Producer (importado por API)
│   │   ├── worker-queues.module.ts # Processors (importado por Worker)
│   │   ├── producers/
│   │   └── processors/
│   └── prisma/                    # PrismaService (@Global)
├── prisma/
│   └── schema.prisma
├── certs/                         # Certificados (no se commitean)
├── storage/
│   └── pdfs/                      # RIDEs generados
├── Dockerfile                     # Multi-stage: base → build → api | worker
├── docker-compose.yml
└── .env.example
```

---

## Notas de producción

- **JWT_SECRET**: usar una cadena aleatoria larga (mín. 64 caracteres).
- **Certificado**: el archivo `.p12` va en `certs/` y se monta como volumen de solo lectura en Docker.
- **SRI_ENV**: cambiar a `PROD` solo cuando el certificado y la empresa estén habilitados en el SRI.
- **DATABASE_URL**: en producción con Docker, cambiar `localhost` por el nombre del servicio (`postgres`).
- **REDIS_HOST**: en producción con Docker, cambiar a `redis`.
