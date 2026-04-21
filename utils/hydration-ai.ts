type HydrationVerificationStatus = 'confirmed' | 'not_confirmed';

export type HydrationVerificationResult = {
  status: HydrationVerificationStatus;
  confidence: number;
  reason: string;
};

const DEFAULT_NOT_CONFIRMED_REASON =
  "Oops! That doesn't look like water to me. Are you sure you're drinking your hydration? 💧";

const GEMINI_PROMPT =
  "Analyze the image. Is it a glass of water, a bottle of water, or someone drinking water? Return 'true' if it is, 'false' otherwise.";
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1';
const PREFERRED_FLASH_MODELS = ['gemini-1.5-flash-001', 'gemini-1.5-flash'];

type GeminiModelDescriptor = {
  name?: string;
  supportedGenerationMethods?: string[];
};

function normalizeBooleanResponse(rawText: string): HydrationVerificationResult {
  const normalized = rawText.trim().toLowerCase();
  const firstToken = normalized.split(/[\s.,!?;:()[\]{}"']+/).filter(Boolean)[0] ?? '';

  if (firstToken === 'true') {
    return {
      status: 'confirmed',
      confidence: 1,
      reason: 'Hydration image confirmed by Gemini.',
    };
  }

  return {
    status: 'not_confirmed',
    confidence: 0,
    reason: DEFAULT_NOT_CONFIRMED_REASON,
  };
}

async function resolveGeminiFlashModel(apiKey: string) {
  const listUrl = `${GEMINI_BASE_URL}/models?key=${apiKey}`;
  const listResponse = await fetch(listUrl);

  if (!listResponse.ok) {
    const body = await listResponse.text().catch(() => '');
    console.error('Gemini list models failed', { status: listResponse.status, body });
    return 'gemini-1.5-flash';
  }

  const payload = (await listResponse.json()) as { models?: GeminiModelDescriptor[] };
  const models = payload.models ?? [];
  const candidates = models
    .filter(
      (model) =>
        typeof model.name === 'string' &&
        model.name.includes('flash') &&
        !model.name.includes('pro') &&
        (model.supportedGenerationMethods ?? []).includes('generateContent')
    )
    .map((model) => (model.name as string).replace(/^models\//, ''));

  for (const preferred of PREFERRED_FLASH_MODELS) {
    if (candidates.includes(preferred)) {
      return preferred;
    }
  }

  return candidates[0] ?? 'gemini-1.5-flash';
}

export async function verifyHydrationPhoto(base64Image: string): Promise<HydrationVerificationResult> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
  console.info('Gemini API key loaded:', !!apiKey);

  if (!apiKey) {
    console.warn('API Key missing, defaulting to not_confirmed.');
    return {
      status: 'not_confirmed',
      confidence: 0,
      reason: DEFAULT_NOT_CONFIRMED_REASON,
    };
  }

  if (!base64Image) {
    console.warn('Hydration image missing, defaulting to not_confirmed.');
    return {
      status: 'not_confirmed',
      confidence: 0,
      reason: DEFAULT_NOT_CONFIRMED_REASON,
    };
  }

  try {
    const resolvedModel = await resolveGeminiFlashModel(apiKey);
    const response = await fetch(
      `${GEMINI_BASE_URL}/models/${resolvedModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: GEMINI_PROMPT },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Image,
                  },
                },
              ],
            },
          ],
        }),
      }
    );
    console.info('Gemini model used:', resolvedModel);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Gemini analysis failed: non-OK response', {
        status: response.status,
        body: errorText,
      });
      return {
        status: 'not_confirmed',
        confidence: 0,
        reason: DEFAULT_NOT_CONFIRMED_REASON,
      };
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
      }>;
    };
    const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!rawText) {
      console.error('Gemini analysis failed: empty response');
      return {
        status: 'not_confirmed',
        confidence: 0,
        reason: DEFAULT_NOT_CONFIRMED_REASON,
      };
    }

    return normalizeBooleanResponse(rawText);
  } catch (error) {
    console.error('Gemini analysis failed (full error object):', error);
    return {
      status: 'not_confirmed',
      confidence: 0,
      reason: DEFAULT_NOT_CONFIRMED_REASON,
    };
  }
}
