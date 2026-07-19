import crypto from "crypto";

const MP_API = "https://api.mercadopago.com";
const MP_AUTH = "https://auth.mercadopago.com";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name}`);
  return v;
}

export function getOAuthAuthorizationUrl(state: string) {
  const clientId = env("MP_CLIENT_ID");
  const redirectUri = env("MP_REDIRECT_URI");
  const url = new URL(`${MP_AUTH}/authorization`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", redirectUri);
  return url.toString();
}

interface MpTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
  public_key: string;
}

export async function exchangeCodeForToken(code: string): Promise<MpTokenResponse> {
  const res = await fetch(`${MP_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env("MP_CLIENT_ID"),
      client_secret: env("MP_CLIENT_SECRET"),
      grant_type: "authorization_code",
      code,
      redirect_uri: env("MP_REDIRECT_URI"),
    }),
  });
  if (!res.ok) {
    throw new Error(`Error intercambiando código OAuth de Mercado Pago: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<MpTokenResponse> {
  const res = await fetch(`${MP_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env("MP_CLIENT_ID"),
      client_secret: env("MP_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Error refrescando token de Mercado Pago: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

interface CreatePreferenceArgs {
  organizerAccessToken: string;
  title: string;
  amount: number;
  payerName: string;
  externalReference: string;
  notificationUrl: string;
  successUrl: string;
}

export async function createCheckoutPreference(args: CreatePreferenceArgs) {
  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.organizerAccessToken}`,
    },
    body: JSON.stringify({
      items: [
        {
          title: args.title,
          quantity: 1,
          unit_price: args.amount,
          currency_id: "CLP",
        },
      ],
      payer: { name: args.payerName },
      external_reference: args.externalReference,
      notification_url: args.notificationUrl,
      back_urls: {
        success: args.successUrl,
        pending: args.successUrl,
        failure: args.successUrl,
      },
      auto_return: "approved",
    }),
  });
  if (!res.ok) {
    throw new Error(`Error creando preferencia de pago: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<{ id: string; init_point: string; sandbox_init_point: string }>;
}

export async function getPayment(paymentId: string, accessToken: string) {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Error consultando pago ${paymentId}: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/**
 * Valida la firma HMAC-SHA256 de un webhook de Mercado Pago.
 * Formato documentado: header x-signature = "ts=...,v1=...".
 * Manifest firmado: "id:{dataId};request-id:{xRequestId};ts:{ts};"
 */
export function verifyWebhookSignature(params: {
  xSignature: string;
  xRequestId: string;
  dataId: string;
  secret: string;
}): boolean {
  const parts = Object.fromEntries(
    params.xSignature.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k.trim(), v?.trim()];
    })
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${params.dataId.toLowerCase()};request-id:${params.xRequestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", params.secret).update(manifest).digest("hex");

  const a = Buffer.from(v1);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
