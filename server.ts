import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_SECRET_KEY = (process.env.SUPABASE_SECRET_KEY || '').trim();
const SUPABASE_JWKS_URL = (
  process.env.SUPABASE_JWKS_URL ||
  (SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json` : '')
).trim();

let geminiClient: GoogleGenAI | null = null;
let supabaseAdminClient: SupabaseClient | null = null;
let cachedJwks: { keys: Array<JsonWebKey & { kid?: string; alg?: string }>; fetchedAt: number } | null = null;

function getSupabaseAdmin(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) return null;
  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseAdminClient;
}

async function getJwksKeys() {
  if (!SUPABASE_JWKS_URL) {
    throw new Error('SUPABASE_JWKS_URL is not configured on the server.');
  }
  const now = Date.now();
  if (cachedJwks && now - cachedJwks.fetchedAt < 5 * 60 * 1000) {
    return cachedJwks.keys;
  }
  const resp = await fetch(SUPABASE_JWKS_URL);
  if (!resp.ok) {
    throw new Error(`Failed to fetch JWKS (${resp.status}).`);
  }
  const body = (await resp.json()) as { keys?: Array<JsonWebKey & { kid?: string; alg?: string }> };
  const keys = Array.isArray(body.keys) ? body.keys : [];
  cachedJwks = { keys, fetchedAt: now };
  return keys;
}

function decodeBase64Url(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  return Buffer.from(padded, 'base64');
}

async function verifySupabaseJwt(token: string): Promise<Record<string, unknown>> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT.');
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(decodeBase64Url(headerB64).toString('utf8')) as {
    kid?: string;
    alg?: string;
  };
  const payload = JSON.parse(decodeBase64Url(payloadB64).toString('utf8')) as Record<string, unknown>;

  const keys = await getJwksKeys();
  const jwk = keys.find((k) => (!header.kid || k.kid === header.kid));
  if (!jwk) {
    throw new Error('Matching signing key not found in JWKS.');
  }

  const publicKey = crypto.createPublicKey({ key: jwk as crypto.JsonWebKey, format: 'jwk' });
  const signingInput = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');
  const signature = decodeBase64Url(signatureB64);

  const alg = header.alg || jwk.alg || 'ES256';
  const valid =
    alg === 'ES256'
      ? crypto.verify('sha256', signingInput, { key: publicKey, dsaEncoding: 'ieee-p1363' }, signature)
      : alg === 'RS256'
        ? crypto.verify('RSA-SHA256', signingInput, publicKey, signature)
        : false;

  if (!valid) {
    throw new Error('Invalid JWT signature.');
  }

  const exp = typeof payload.exp === 'number' ? payload.exp : 0;
  if (exp && Math.floor(Date.now() / 1000) >= exp) {
    throw new Error('JWT has expired.');
  }

  return payload;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

interface HealthTipPayload {
  tip: string;
  category: string;
  actionStep: string;
  attribution: string;
}

function getStatusFromError(error: unknown): { status: number; message: string } {
  const rawMessage = error instanceof Error ? error.message : 'Unable to generate daily health tip.';

  if (rawMessage.includes('GEMINI_API_KEY')) {
    return {
      status: 500,
      message: 'Server Gemini API key is not configured. Check Settings > Secrets.',
    };
  }
  if (rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Health tip service is temporarily busy. Please try again in a moment.',
    };
  }
  if (rawMessage.includes('403') || rawMessage.includes('PERMISSION_DENIED') || rawMessage.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'Gemini API authentication failed. Please verify the key in Settings > Secrets.',
    };
  }

  return {
    status: 502,
    message: 'Could not reach the wellness tip service right now. Please try again.',
  };
}

async function generateDailyHealthTip(options: {
  dateKey?: string;
  previousTip?: string;
  focus?: string;
}): Promise<HealthTipPayload> {
  const ai = getGeminiClient();

  const focusHint = options.focus?.trim()
    ? `Focus specifically on: ${options.focus.trim()}.`
    : 'Pick a practical aspect of student campus wellness (hydration, sleep hygiene, screen/eye breaks, posture during study, balanced hostel nutrition, stress regulation, or light movement).';

  const avoidHint = options.previousTip?.trim()
    ? `Do NOT repeat or closely paraphrase this previous tip: "${options.previousTip.trim()}".`
    : '';

  const prompt = [
    `Generate one concise, uplifting, evidence-informed daily health tip or wellness quote for university students and campus staff on ${options.dateKey || 'today'}.`,
    focusHint,
    avoidHint,
    'Keep the tip under 32 words, warm, practical, and non-clinical. Include a short 2-3 word category label, one tiny actionable step under 12 words, and a short attribution (either the author name if using a well-known quote, or "Campus Wellness Guidance").',
  ]
    .filter(Boolean)
    .join(' ');

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'You are a campus health educator writing brief daily wellness reminders for university students. Return valid JSON matching the requested schema without markdown fences.',
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW,
      },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tip: {
            type: Type.STRING,
            description: 'A practical health tip or concise wellness quote under 32 words.',
          },
          category: {
            type: Type.STRING,
            description: 'A 2 to 3 word wellness category such as Sleep & Recovery or Eye Care.',
          },
          actionStep: {
            type: Type.STRING,
            description: 'One small actionable micro-habit for today under 12 words.',
          },
          attribution: {
            type: Type.STRING,
            description: 'Quote author if applicable, otherwise Campus Wellness Guidance.',
          },
        },
        required: ['tip', 'category', 'actionStep', 'attribution'],
      },
    },
  });

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('Empty response from Gemini API.');
  }

  const parsed = JSON.parse(rawText) as Partial<HealthTipPayload>;
  if (!parsed.tip || !parsed.category || !parsed.actionStep) {
    throw new Error('Incomplete health tip payload returned.');
  }

  return {
    tip: parsed.tip.trim(),
    category: parsed.category.trim(),
    actionStep: parsed.actionStep.trim(),
    attribution: (parsed.attribution || 'Campus Wellness Guidance').trim(),
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const handleHealthTipRequest = async (
    params: { dateKey?: unknown; previousTip?: unknown; focus?: unknown },
    res: express.Response
  ) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const payload = await generateDailyHealthTip({
        dateKey: typeof params.dateKey === 'string' ? params.dateKey : undefined,
        previousTip: typeof params.previousTip === 'string' ? params.previousTip : undefined,
        focus: typeof params.focus === 'string' ? params.focus : undefined,
      });

      res.json({
        ...payload,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Gemini health-tip error:', error);
      const { status, message } = getStatusFromError(error);
      res.status(status).json({ error: message });
    }
  };

  app.post('/api/health-tip', async (req, res) => {
    const body = (req.body ?? {}) as {
      dateKey?: unknown;
      previousTip?: unknown;
      focus?: unknown;
    };
    await handleHealthTipRequest(body, res);
  });

  app.get('/api/health-tip', async (req, res) => {
    await handleHealthTipRequest(
      {
        dateKey: req.query.dateKey,
        previousTip: req.query.previousTip,
        focus: req.query.focus,
      },
      res
    );
  });

  app.get('/api/auth/verify', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      res.status(401).json({ error: 'Missing Bearer token.' });
      return;
    }

    try {
      const claims = await verifySupabaseJwt(token);
      res.json({
        verified: true,
        uid: typeof claims.sub === 'string' ? claims.sub : '',
        email: typeof claims.email === 'string' ? claims.email : '',
      });
    } catch (jwksError) {
      const admin = getSupabaseAdmin();
      if (admin) {
        const { data, error } = await admin.auth.getUser(token);
        if (!error && data.user) {
          res.json({
            verified: true,
            uid: data.user.id,
            email: data.user.email || '',
          });
          return;
        }
      }
      res.status(401).json({
        error: jwksError instanceof Error ? jwksError.message : 'Invalid Supabase token.',
      });
    }
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
