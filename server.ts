import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

let geminiClient: GoogleGenAI | null = null;

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

  app.post('/api/health-tip', async (req, res) => {
    try {
      const body = (req.body ?? {}) as {
        dateKey?: string;
        previousTip?: string;
        focus?: string;
      };

      const payload = await generateDailyHealthTip({
        dateKey: typeof body.dateKey === 'string' ? body.dateKey : undefined,
        previousTip: typeof body.previousTip === 'string' ? body.previousTip : undefined,
        focus: typeof body.focus === 'string' ? body.focus : undefined,
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
