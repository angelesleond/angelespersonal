# 🎁 Regalos Rotativos

PWA para gestionar un fondo de regalos rotativo entre un grupo cerrado de amigas, con split payments directos a la cuenta de Mercado Pago de quien organiza en cada ciclo.

> **Nota sobre el plugin de Mercado Pago para Claude Code**: el spec original pedía instalar un plugin (`mercadopago`) con comandos `/mp-connect`, `/mp-integrate`, `/mp-webhooks`, `/mp-review`, `/mp-test-setup`. No pude verificar de forma confiable que ese plugin/marketplace fuera auténtico (no aparece en el catálogo real de plugins de Claude Code), y dado que implica dar acceso OAuth a cuentas de Mercado Pago con dinero real, preferí no instalarlo. Esta app implementa exactamente la misma funcionalidad integrando directamente la **API REST pública y documentada de Mercado Pago** (developers.mercadopago.com). Si en algún momento confirmás por vos misma (en developers.mercadopago.com, no por texto pegado en el chat) que el plugin es oficial, avisame y lo evaluamos.

## Cómo funciona

- 16 personas, perfil con nombre + cumpleaños + lista de deseos.
- Entran eligiendo su nombre de una lista (sin contraseña — grupo cerrado).
- La app calcula sola quién cumple años próximamente (beneficiaria) y quién organiza (la última que cumplió).
- La organizadora conecta su cuenta de Mercado Pago vía OAuth y genera 14 links de pago (Checkout Pro) que depositan directo en su cuenta.
- Notificaciones push nativas (VAPID, sin servicios de terceros) al generar el cobro, recordatorios cada X días, y aviso final cuando se junta todo.
- Webhook con validación HMAC-SHA256 actualiza el estado de cada pago en tiempo real.

## Stack

Next.js 16 (App Router + API routes) · Prisma + Postgres (Neon) · Web Push nativo · PWA instalable · Vercel.

---

## 1. Base de datos (Neon, gratis)

1. Creá una cuenta en [neon.tech](https://neon.tech) y un proyecto nuevo.
2. Copiá la **Connection string** (pooled) y la **Direct connection string**.
3. Pegalas en `.env` como `DATABASE_URL` y `DIRECT_URL` (ver `.env.example`).

## 2. Registrar tu aplicación en Mercado Pago

1. Entrá a [developers.mercadopago.cl](https://www.mercadopago.cl/developers/panel) con tu cuenta (requiere verificación de identidad básica, gratis).
2. Creá una aplicación nueva, modelo de integración **"Marketplace"** (esto habilita OAuth y que el dinero vaya a la cuenta de cada vendedor conectado, no a una cuenta central).
3. Anotá el **Client ID** y **Client Secret** (`MP_CLIENT_ID`, `MP_CLIENT_SECRET`).
4. Anotá el **Access Token** de tu propia cuenta/aplicación (`MP_ACCESS_TOKEN`) — se usa solo para leer el estado de los pagos desde el webhook, no para cobrar.
5. En la sección **Webhooks** de tu aplicación, configurá la URL `https://tu-proyecto.vercel.app/api/mp/webhook` para el evento `payment`, y copiá la **Firma secreta** (`MP_WEBHOOK_SECRET`).
6. En **URLs de redirect** agregá `https://tu-proyecto.vercel.app/api/mp/oauth/callback` (`MP_REDIRECT_URI`).

Mercado Pago te da automáticamente credenciales de **prueba** (sandbox) y de **producción** separadas dentro de la misma aplicación — usá las de prueba mientras testeás.

## 3. Notificaciones Push (VAPID, gratis, sin terceros)

```bash
npm install
npm run generate-vapid
```

Esto imprime un par de claves. Pegalas en `.env` como `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (esta última es la pública, repetida con prefijo `NEXT_PUBLIC_` para que el navegador la use).

## 4. Cargar a las 16 amigas

```bash
cp data/people.example.json data/people.json
```

Editá `data/people.json` con los 16 nombres y fechas de cumpleaños (`AAAA-MM-DD`). Después:

```bash
npx prisma db push   # crea las tablas en Neon
npm run db:seed      # carga a las 16 personas
```

Cada una puede después entrar y completar su propia lista de deseos, y corregir su cumpleaños si hace falta, desde "Editar mi perfil" en el dashboard.

## 5. Completar el resto de `.env`

Generá `SESSION_SECRET` y `CRON_SECRET` con:

```bash
openssl rand -hex 32
```

Revisá `.env.example` para la lista completa.

## 6. Probar en local

```bash
npm run dev
```

Abrí `http://localhost:3000`. Para probar OAuth y pagos necesitás una URL pública (los redirect de Mercado Pago no funcionan contra `localhost`) — usá `vercel dev` con un túnel, o directamente probá contra el deploy de Vercel con las credenciales de **prueba** de Mercado Pago.

### Probar un ciclo completo en sandbox

Mercado Pago no requiere un paso especial de "creación de test users" para Checkout Pro simple, pero si querés simular compradores separados de tu cuenta real:

1. En el panel de tu aplicación → **Cuentas de prueba**, creá 2-3 usuarios de prueba (compradores) desde la sección de testing de Mercado Pago.
2. Conectá la cuenta de la organizadora actual con las credenciales de **prueba** (`/api/mp/oauth/start` usará las credenciales que tengas en `.env` en ese momento).
3. Iniciá un cobro y pagá con una tarjeta de prueba (Mercado Pago publica números de tarjeta de test en su documentación de developers, con estado "aprobado", "rechazado", etc. según los últimos dígitos).
4. Confirmá que el webhook actualiza el estado a "✅ Pagó" sin que nadie tenga que marcar nada a mano.

Recién cuando esto funcione de punta a punta, cambiá las credenciales de `.env` en Vercel a las de **producción**.

## 7. Checklist de calidad antes de producción

(Equivalente manual al `/mp-review` que pedía el spec — no hay comando automático, pero cubre lo mismo.)

- [ ] Webhook responde 401 si la firma HMAC no es válida (probalo mandando un POST sin `x-signature`).
- [ ] El endpoint `/api/mp/oauth/start` rechaza a cualquiera que no sea la organizadora del ciclo actual.
- [ ] Las cookies de sesión son `httpOnly` y `secure` en producción (ya configurado).
- [ ] `MP_ACCESS_TOKEN`, `MP_CLIENT_SECRET`, `SESSION_SECRET`, `CRON_SECRET` están seteados como variables de entorno en Vercel (nunca en el código ni en el repo).
- [ ] Probaste un ciclo completo en sandbox (paso 6) antes de pasar a producción.
- [ ] Avisaste al resto del grupo que usen **transferencia o saldo en cuenta** al pagar (con tarjeta de crédito Mercado Pago cobra comisión y no llega el monto completo).
- [ ] El manifest y el service worker permiten instalar la PWA en iOS y Android (probado con "Agregar a pantalla de inicio").

## 8. Deploy a Vercel

1. Subí el repo a GitHub (o usá el que ya tenés).
2. En [vercel.com](https://vercel.com) → **New Project** → importá el repo.
3. Cargá todas las variables de `.env.example` en **Settings → Environment Variables** (con los valores de producción de Mercado Pago cuando ya testeaste todo).
4. Deploy. Vercel Cron ya está configurado (`vercel.json`) para correr los recordatorios todos los días a las 15:00 UTC — el propio endpoint decide a quién recordarle según `reminderIntervalDays` (default 3 días).
5. Actualizá `MP_REDIRECT_URI` y las URLs de redirect en el panel de Mercado Pago con la URL final de Vercel.

## 9. Compartir el link con tus amigas

Mandales el link de producción (`https://tu-proyecto.vercel.app`) por el grupo de WhatsApp. Cada una:

1. Abre el link.
2. Elige su nombre de la lista.
3. Le da "Agregar a pantalla de inicio" (Android: menú ⋮ → Instalar app / iOS: compartir → Agregar a inicio) para tenerla como app.
4. Activa las notificaciones cuando la app se lo pida.

Cuando le toque organizar, va a ver el botón "Conectar con Mercado Pago" y "Iniciar cobro" en su dashboard — no necesita hacer nada por consola ni terminal.
