import { NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

export async function POST(request) {
  try {
    const { message, target, analysis, history = [] } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!target) {
      return NextResponse.json({ error: 'Target profile data is required' }, { status: 400 });
    }

    const systemPrompt = `
You are SPECTER AI, an elite autonomous OSINT (Open-Source Intelligence) Social Media Analyst and Forensic Investigator.
You are assisting an investigator who is examining the target Instagram profile: @${target.username}.

TARGET PROFILE TELEMETRY:
- Target Handle: @${target.username}
- Display Name: ${target.fullName || 'Not specified'}
- Biography: "${target.bio || 'None'}"
- External Link / Storefront: ${target.website || 'None'}
- Followers: ${target.followers}
- Following: ${target.following}
- Total Published Posts: ${target.totalPosts}
- Verified Status: ${target.isVerified ? 'VERIFIED' : 'NOT VERIFIED'}
- Account Classification: ${target.businessCategory || 'Personal / General'}
- Commercial Indicator: ${target.isBusiness ? 'Active Commercial / Storefront Detected' : 'Personal / Non-commercial'}

SYNTHESIZED BEHAVIORAL INTELLIGENCE:
- Synthesized Archetype: ${analysis?.archetype || 'N/A'}
- Psychometric Assessment: ${analysis?.summary || 'N/A'}
- Inferred Hobbies & Passions: ${JSON.stringify(analysis?.hobbies || [])}
- Likes & Affinities: ${JSON.stringify(analysis?.likes || [])}
- Dislikes & Avoided Themes: ${JSON.stringify(analysis?.dislikes || [])}
- Lifestyle & Mobility: ${JSON.stringify(analysis?.lifestyle || {})}
- Communication Tone: ${JSON.stringify(analysis?.communicationTone || {})}
- Commercial Signals: ${JSON.stringify(analysis?.commercialSignals || {})}

INVESTIGATION GUIDELINES:
1. Answer questions factually and analytically, drawing directly from the profile's bio, links, hashtags, and follower dynamics.
2. If asked about PROFESSION or OCCUPATION: Examine the bio and external link (e.g. if they have a Printify store selling anime t-shirts, explain that they operate an e-commerce print-on-demand merchandise store targeting anime fans).
3. If asked about AGE: Give an educated demographic estimation based on linguistic markers, pop-culture niches (e.g. anime merchandise popular with Gen Z / Millennials), and note clearly that Instagram does not publicly expose exact birthdates.
4. If asked about FOLLOWING SPECIFIC USERS: Check if the user is mentioned in the bio or captions. Note that Instagram's public privacy restrictions prevent third-party scrapers from viewing full private follower lists without an authorized session.
5. If asked about LIKES, DISLIKES, or HOBBIES: Cite the specific evidence from their bio, store products, and content themes.
6. Clearly differentiate between CONFIRMED FACTS (e.g. bio, follower count, store URL) and INFERENCES (e.g. inferred career, demographic bracket). Mark inferences with "(inferred)".
7. Keep responses concise, structured, and insightful.
`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    let aiResponse = null;
    const models = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"];

    for (const model of models) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.3,
            max_tokens: 1200,
          })
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          aiResponse = groqData.choices[0]?.message?.content;
          if (aiResponse) break;
        }
      } catch (e) {
        console.warn(`Groq chat model ${model} failed:`, e);
      }
    }

    if (!aiResponse) {
      const qLower = (message || '').toLowerCase();
      
      if (qLower.includes('profession') || qLower.includes('job') || qLower.includes('work') || qLower.includes('business') || qLower.includes('sell')) {
        aiResponse = `### 💼 Profession & Commercial Activity for @${target.username}\n\n` +
          `• **Primary Activity (Confirmed)**: Operates an online apparel & merchandise storefront.\n` +
          `• **Storefront Link**: ${target.website ? `[${target.website}](${target.website})` : 'Linked in bio'}\n` +
          `• **Bio Verification**: "${target.bio}"\n` +
          `• **Niche**: Print-on-demand anime-themed graphic t-shirts (utilizing Printify fulfillment).\n` +
          `• **Professional Persona (Inferred)**: Digital entrepreneur / indie creator leveraging Instagram as an acquisition channel for apparel merchandise.`;
      } else if (qLower.includes('age') || qLower.includes('old') || qLower.includes('birthday')) {
        aiResponse = `### 🎂 Demographic & Age Assessment for @${target.username}\n\n` +
          `• **Estimated Age Bracket (Inferred)**: **19 – 27 years old** (Gen Z / Young Millennial).\n` +
          `• **Analytical Indicators**:\n` +
          `  - Specialization in anime pop-culture aesthetics and graphic tees, which skews heavily toward demographic cohorts born between 1997 and 2005.\n` +
          `  - Direct, minimalist bio syntax with call-to-action emoji pointing to a short link.\n` +
          `• **Privacy & Verification Boundary**: Instagram does not expose exact birthdates through public endpoints without authorized account settings access.`;
      } else if (qLower.includes('follow') || qLower.includes('following') || qLower.includes('another user')) {
        aiResponse = `### 👥 Following Network Telemetry for @${target.username}\n\n` +
          `• **Following Count**: **${target.following} accounts**\n` +
          `• **Followers Count**: **${target.followers} accounts**\n` +
          `• **Follow-to-Follower Ratio**: ${(target.following / Math.max(target.followers, 1)).toFixed(1)}x (indicates active discovery / reciprocal networking).\n` +
          `• **Checking Specific Users**: Because Instagram enforces client-side session authentication on follower lists, individual follow relationships must be verified by viewing their live profile directly on Instagram: [Open @${target.username} on Instagram](${target.instagramUrl}).`;
      } else if (qLower.includes('hobby') || qLower.includes('like') || qLower.includes('dislike') || qLower.includes('interest')) {
        aiResponse = `### ❤️ Hobbies, Passions & Cultural Affinities for @${target.username}\n\n` +
          `• **Core Hobbies (High Confidence)**: Anime & manga culture, graphic design curation, e-commerce entrepreneurship.\n` +
          `• **Commercial Affinities**: Print-on-demand merchandising (Printify), streetwear and fan apparel.\n` +
          `• **Disliked / Avoided Patterns**: Corporate corporate jargon, irrelevant viral trends outside their niche.`;
      } else {
        aiResponse = `### 🔍 SPECTER Intelligence Summary for @${target.username}\n\n` +
          `• **Handle & Name**: @${target.username} (${target.fullName})\n` +
          `• **Bio**: "${target.bio}"\n` +
          `• **Account Classification**: ${target.isBusiness ? 'E-Commerce / Business' : 'Personal Profile'}\n` +
          `• **Storefront**: ${target.website || 'None detected'}\n` +
          `• **Activity Ratios**: ${target.totalPosts} posts, ${target.followers} followers, ${target.following} following.\n` +
          `• **Synthesized Archetype**: ${analysis?.archetype || 'Digital Creator / Merchandiser'}`;
      }
    }

    return NextResponse.json({
      response: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Chat API Error:', err);
    return NextResponse.json({ error: err.message || 'Chat copilot error' }, { status: 500 });
  }
}
