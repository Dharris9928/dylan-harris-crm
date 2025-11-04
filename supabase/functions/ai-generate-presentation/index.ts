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
- two-column: Title + left/right content blocks (leftContent and rightContent as STRINGS, not arrays)
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

TWO-COLUMN FORMAT:
- leftContent and rightContent MUST be strings, NOT arrays
- Join multiple points with newlines if needed

CRITICAL OUTPUT FORMAT:
Return ONLY raw JSON. DO NOT wrap in markdown code blocks. DO NOT use \`\`\`json. 
Return the JSON object directly.

Format:
{
  "slides": [
    { "id": 1, "type": "title", "title": "Main Title", "subtitle": "Subtitle Text", "background": "#4285F4" },
    { "id": 2, "type": "content", "title": "Slide Title", "bullets": ["Point 1", "Point 2", "Point 3"], "accent": "#34A853" },
    { "id": 3, "type": "two-column", "title": "Title", "leftContent": "Left text here", "rightContent": "Right text here", "accent": "#4285F4" }
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

    // Parse JSON from AI response - handle markdown code blocks
    let slides;
    try {
      let jsonStr = aiContent;
      
      // Remove markdown code blocks if present
      if (jsonStr.includes('```')) {
        const codeBlockMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
          jsonStr = codeBlockMatch[1];
        } else {
          // Try to extract JSON without code blocks
          const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
          jsonStr = jsonMatch ? jsonMatch[0] : jsonStr;
        }
      }
      
      const parsed = JSON.parse(jsonStr);
      slides = parsed.slides || [];
      
      // Normalize slide data
      slides = slides.map((slide: any) => {
        // Fix two-column format: convert arrays to strings
        if (slide.type === 'two-column') {
          if (Array.isArray(slide.left_content)) {
            slide.leftContent = slide.left_content.join('\n');
            delete slide.left_content;
          }
          if (Array.isArray(slide.right_content)) {
            slide.rightContent = slide.right_content.join('\n');
            delete slide.right_content;
          }
          // Remove titles if they exist
          delete slide.left_title;
          delete slide.right_title;
        }
        return slide;
      });
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', details: errorMessage }),
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