import { corsHeaders } from '../_shared/cors.ts';
import { verifyUser } from '../_shared/authorization.ts';

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, supabase } = await verifyUser(req);

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { outline } = await req.json();

    if (!outline) {
      return new Response(
        JSON.stringify({ error: 'Outline text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a presentation designer. Convert outlines into Google-branded slide decks.

SLIDE TYPES:
- title: Main title + subtitle (Google Blue #4285F4 background)
- section: Section divider with large text (Google Green #34A853)
- content: Title + 3-5 bullet points (white background, colored accents)
- two-column: Title + left/right content blocks
- cta: Call-to-action with button text (Google Red #EA4335)
- segment-grid: Two-column grid with segment data

CRITICAL RULES FOR ALL SLIDES:
- ALWAYS include at least 2-3 bullet points for content slides - NEVER create slides without bullets
- ALWAYS specify colors for background/accent - NEVER leave slides without proper colors
- Use Google colors: Blue #4285F4, Red #EA4335, Yellow #FBBC04, Green #34A853
- Keep text concise and actionable
- Font: Google Sans
- Always start with a title slide
- End with a CTA slide if appropriate

REQUIRED COLORS:
- title slides: background must be "#4285F4", "#EA4335", or "#34A853"
- content slides: accent must be "#4285F4", "#EA4335", "#34A853", or "#FBBC04"
- section slides: accent must be specified

Return ONLY valid JSON in this exact format:
{
  "slides": [
    { "id": 1, "type": "title", "title": "Main Title", "subtitle": "Subtitle Text", "background": "#4285F4" },
    { "id": 2, "type": "content", "title": "Slide Title", "bullets": ["Point 1", "Point 2", "Point 3"], "accent": "#34A853" }
  ]
}`;

    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: outline }
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded', message: 'Too many AI requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: 'Payment required', message: 'AI service requires payment setup.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices[0].message.content;

    // Parse JSON from AI response
    let slides;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiContent;
      const parsed = JSON.parse(jsonStr);
      slides = parsed.slides || [];
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', details: aiContent }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store conversation history
    const conversation = [
      { role: 'user', content: outline },
      { role: 'assistant', content: aiContent }
    ];

    return new Response(
      JSON.stringify({ slides, conversation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in ai-generate-presentation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});