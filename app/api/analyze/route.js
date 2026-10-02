import { NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// Live public OpenGraph scraper
async function scrapePublicLive(username) {
  try {
    const url = `https://www.instagram.com/${username}/`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      if (res.status === 404) return { is404: true };
      return null;
    }

    const html = await res.text();

    if (html.includes('show_lox_redesigned_404_page') || !html.includes('property="og:title"')) {
      return { is404: true };
    }

    const metaTags = html.match(/<meta\s+[^>]+>/gi) || [];
    let bio = '';
    let followers = '0';
    let following = '0';
    let posts = '0';
    let fullName = username;
    let profilePic = '';

    for (const tag of metaTags) {
      if (tag.includes('name="description"') || tag.includes("name='description'")) {
        const contentMatch = tag.match(/content="([\s\S]*?)"\s+name="description"/i) || 
                             tag.match(/content='([\s\S]*?)'\s+name='description'/i) || 
                             tag.match(/name="description"\s+content="([\s\S]*?)"/i);
        if (contentMatch) {
          const raw = contentMatch[1]
            .replace(/&quot;/g, '"')
            .replace(/&#x1f517;/g, '🔗')
            .replace(/&#064;/g, '@')
            .replace(/&amp;/g, '&');
          
          const bioMatch = raw.match(/on Instagram:\s*"([\s\S]*?)"/);
          if (bioMatch) {
            bio = bioMatch[1].trim();
          }
          const counts = raw.match(/([\d,\.kKmM]+)\s+Followers,\s*([\d,\.kKmM]+)\s+Following,\s*([\d,\.kKmM]+)\s+Posts/i);
          if (counts) {
            followers = counts[1];
            following = counts[2];
            posts = counts[3];
          }
        }
      }
      if (tag.includes('property="og:title"')) {
        const m = tag.match(/content="([^"]*)"/);
        if (m) {
          const rawTitle = m[1].replace(/&#064;/g, '@').replace(/&#2022;/g, '•');
          const nameM = rawTitle.match(/^(.*?)\s*\(@/);
          if (nameM) fullName = nameM[1].trim();
        }
      }
      if (tag.includes('property="og:image"')) {
        const m = tag.match(/content="([^"]*)"/);
        if (m) profilePic = m[1].replace(/&amp;/g, '&');
      }
    }

    const urlMatch = bio.match(/https?:\/\/[^\s"]+/);
    const website = urlMatch ? urlMatch[0] : null;

    const isBusiness = Boolean(
      website || 
      bio.toLowerCase().includes('shop') || 
      bio.toLowerCase().includes('products') || 
      bio.toLowerCase().includes('t-shirt') || 
      bio.toLowerCase().includes('merch') ||
      bio.toLowerCase().includes('brand') ||
      bio.toLowerCase().includes('store')
    );

    return {
      username,
      fullName: fullName || username,
      bio: bio || 'No public bio provided.',
      website,
      followers,
      following,
      totalPosts: posts,
      profilePic: profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || username)}&background=6366f1&color=fff&size=200`,
      isVerified: false,
      isBusiness,
      businessCategory: isBusiness ? 'E-Commerce / Merchandise' : 'Personal Profile',
      instagramUrl: `https://www.instagram.com/${username}/`
    };
  } catch (err) {
    console.error('Scrape error:', err);
    return null;
  }
}

export async function POST(request) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json({ error: 'Instagram username is required' }, { status: 400 });
    }

    const cleanUsername = username.trim().replace(/^@/, '').toLowerCase();

    // 1. Always execute live crawl for the target username
    const liveData = await scrapePublicLive(cleanUsername);

    if (liveData?.is404) {
      return NextResponse.json({ 
        error: `Profile @${cleanUsername} does not exist on Instagram (404 Not Found). Please verify spelling or handle.` 
      }, { status: 404 });
    }

    if (!liveData) {
      return NextResponse.json({ 
        error: `Could not retrieve @${cleanUsername}. Instagram anti-bot challenge active. Please try again in a few moments.` 
      }, { status: 503 });
    }

    const targetData = liveData;

    // 2. Query Groq for Psychological & Behavioral Analysis
    const prompt = `
You are an expert social media OSINT (Open-Source Intelligence) analyst.
Analyze the following REAL verified Instagram profile telemetry for @${targetData.username} and output a STRICT JSON object without any backticks, markdown code blocks, or extra text.

VERIFIED PROFILE TELEMETRY:
- Username: @${targetData.username}
- Full Name: ${targetData.fullName}
- Bio Content: "${targetData.bio}"
- External Link: ${targetData.website || "None"}
- Followers Count: ${targetData.followers}
- Following Count: ${targetData.following}
- Total Published Posts: ${targetData.totalPosts}
- Commercial Indicator: ${targetData.isBusiness ? "Active Commercial / Storefront" : "Personal / General"}

OUTPUT THIS EXACT JSON STRUCTURE (do NOT invent fictional careers like astronaut or trail runner if not in the bio):
{
  "archetype": "string (e.g. 'Anime Apparel & Print-on-Demand E-Commerce Entrepreneur' or 'Personal Content Creator')",
  "summary": "string (2-3 sentences analytical assessment grounded strictly in the bio and metrics)",
  "personalityScores": {
    "openness": 75,
    "conscientiousness": 80,
    "extraversion": 60,
    "agreeableness": 70,
    "emotionalStability": 82
  },
  "likes": ["string", "string", "string", "string"],
  "dislikes": ["string", "string", "string"],
  "hobbies": [
    { "name": "string", "confidence": "High | Medium | Low", "evidence": "string" },
    { "name": "string", "confidence": "High | Medium | Low", "evidence": "string" }
  ],
  "lifestyle": {
    "category": "string (e.g. 'E-Commerce Side-Hustle' or 'Casual Personal')",
    "mobilityScore": "Moderate | Local | High",
    "primaryIndicators": ["string", "string", "string"]
  },
  "communicationTone": {
    "primary": "string (e.g. Transactional & Direct, Expressive, Casual)",
    "style": "string (e.g. Short Call-to-Action, Conversational)",
    "emojiDensity": "Low | Moderate | High"
  },
  "commercialSignals": {
    "isMonetized": ${targetData.isBusiness},
    "monetizationModel": "string (e.g. Printify / Print-on-Demand, None, Shopify)",
    "affiliateOrShop": "${targetData.website || 'None'}",
    "intentVerdict": "${targetData.isBusiness ? 'Commercial' : 'Personal'}"
  },
  "dossierMarkdown": "Full formatted markdown intelligence report analyzing Identity, Professional Life, Niche Focus, and Follower Dynamics."
}
`;

    let aiResult = null;
    const models = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];

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
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            max_tokens: 2800,
            response_format: { type: "json_object" }
          })
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const content = groqData.choices[0]?.message?.content;
          aiResult = JSON.parse(content);
          break;
        }
      } catch (e) {
        console.warn(`Model ${model} failed:`, e);
      }
    }

    // Default synthesis if Groq call failed
    if (!aiResult) {
      aiResult = {
        archetype: targetData.isBusiness ? "E-Commerce & Digital Merchandiser" : "Independent Public User",
        summary: `Target @${targetData.username} exhibits a ${targetData.isBusiness ? 'commercial e-commerce orientation' : 'personal profile'}. Profile contains ${targetData.followers} followers and ${targetData.totalPosts} posts.`,
        personalityScores: {
          openness: 72,
          conscientiousness: 78,
          extraversion: 55,
          agreeableness: 68,
          emotionalStability: 75
        },
        likes: targetData.isBusiness ? ["Online Commerce", "Apparel & Merchandising", "Audience Growth"] : ["Social Networking", "Content Sharing"],
        dislikes: ["Account Restrictions", "Low Engagement"],
        hobbies: [
          { 
            name: targetData.isBusiness ? "E-Commerce Promotion" : "Social Media", 
            confidence: "High", 
            evidence: targetData.bio 
          }
        ],
        lifestyle: {
          category: targetData.isBusiness ? "Digital Entrepreneur / Side-Hustle" : "General Personal",
          mobilityScore: "Moderate",
          primaryIndicators: [targetData.website ? "Active Online Store" : "Standard Feed"]
        },
        communicationTone: {
          primary: targetData.isBusiness ? "Transactional & Promotional" : "Casual",
          style: "Concise",
          emojiDensity: "Moderate"
        },
        commercialSignals: {
          isMonetized: targetData.isBusiness,
          monetizationModel: targetData.website ? "Print-on-Demand / E-Commerce" : "None",
          affiliateOrShop: targetData.website || "None",
          intentVerdict: targetData.isBusiness ? "Commercial" : "Personal"
        },
        dossierMarkdown: `## OSINT Intelligence Dossier: @${targetData.username}\n\n- **Target Name**: ${targetData.fullName}\n- **Followers**: ${targetData.followers}\n- **Following**: ${targetData.following}\n- **Total Posts**: ${targetData.totalPosts}\n- **Bio**: ${targetData.bio}\n- **Store / Website**: ${targetData.website || 'N/A'}`
      };
    }

    return NextResponse.json({
      target: targetData,
      analysis: aiResult,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('API Handler Error:', err);
    return NextResponse.json({ error: err.message || 'Internal investigation error' }, { status: 500 });
  }
}
