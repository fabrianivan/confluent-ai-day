import { NextRequest, NextResponse } from 'next/server';

let currentProvider = 'gemini';

export async function GET() {
  const candidateBases = [
    process.env.INTERNAL_BACKEND_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.NEXT_PUBLIC_API_BASE,
    'http://localhost:8080',
    'http://localhost:8081',
  ].filter(Boolean) as string[];

  for (const base of candidateBases) {
    try {
      const res = await fetch(`${base}/api/ai/provider`, {
        signal: AbortSignal.timeout(1500),
        cache: 'no-store',
      });
      if (res.ok) {
        return NextResponse.json(await res.json());
      }
    } catch {
      // try next
    }
  }

  const model =
    currentProvider === 'bedrock'
      ? 'Anthropic Claude 3.5 Sonnet (AWS Bedrock)'
      : 'Google Gemini 2.5 Flash';

  return NextResponse.json({
    active: currentProvider,
    model,
    available: ['gemini', 'bedrock'],
  });
}

export async function POST(req: NextRequest) {
  let body = { provider: 'gemini' };
  try {
    body = await req.json();
  } catch {
    // ignore
  }

  if (body.provider === 'bedrock' || body.provider === 'gemini') {
    currentProvider = body.provider;
  }

  const model =
    currentProvider === 'bedrock'
      ? 'Anthropic Claude 3.5 Sonnet (AWS Bedrock)'
      : 'Google Gemini 2.5 Flash';

  return NextResponse.json({
    status: 'ok',
    active: currentProvider,
    model,
  });
}
