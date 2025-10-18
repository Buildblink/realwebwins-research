import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { ideaDescription?: string };
    const ideaDescription = body?.ideaDescription?.trim();

    if (!ideaDescription) {
      return NextResponse.json(
        { error: 'ideaDescription is required.' },
        { status: 400 }
      );
    }

    const mockResponse = {
      ideaDescription,
      summary: `Mock summary insights for: ${ideaDescription}`,
      nextSteps: [
        'Validate target market size.',
        'Identify key competitors.',
        'Prototype core value proposition.',
      ],
      confidenceScore: 0.72,
      generatedAt: new Date().toISOString(),
    };

    const { data: insertedRecord, error: insertError } = await supabase
      .from('research_reports')
      .insert({
        ideaDescription,
        summary: mockResponse.summary,
        nextSteps: JSON.stringify(mockResponse.nextSteps),
        confidence: mockResponse.confidenceScore,
        created_at: mockResponse.generatedAt,
      })
      .select()
      .single();

    if (insertError || !insertedRecord) {
      return NextResponse.json(
        { error: 'Research could not be saved. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ...mockResponse, id: (insertedRecord as { id?: string })?.id },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to process the research request.',
      },
      { status: 500 }
    );
  }
}
