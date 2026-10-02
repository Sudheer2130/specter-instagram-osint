"""
Instagram OSINT Agent (FREE VERSION)
-------------------------------------
Uses Instaloader + Direct OpenGraph Crawler to fetch public Instagram profile
data, and Groq API (LLaMA / GPT-OSS) to analyse and generate an OSINT report.

Requirements:
    pip install instaloader groq python-dotenv

Usage:
    python files/instagram_agent_free.py --username <instagram_username>
    python files/instagram_agent_free.py --demo   # Test immediately with simulated data

Environment variables (in .env file):
    GROQ_API_KEY - Your free Groq API key (https://console.groq.com)
    INSTA_USER   - (Optional) Instagram username for authenticated requests
    INSTA_PASS   - (Optional) Instagram password
"""

import os
import sys
import json
import argparse
import time
import random
import re
import html
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Ensure console supports UTF-8 on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import instaloader
from groq import Groq

# ── Load .env from script dir or current working dir ───────────────────────────
script_dir = Path(__file__).resolve().parent
load_dotenv(script_dir / ".env")
load_dotenv(Path.cwd() / ".env")

GROQ_API_KEY  = os.getenv("GROQ_API_KEY", "").strip()
INSTA_USER    = os.getenv("INSTA_USER", "").strip()
INSTA_PASS    = os.getenv("INSTA_PASS", "").strip()

# Supported high-performance Groq models
GROQ_MODELS = [
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b"
]


# ── Direct OpenGraph Public Crawler (Bypasses GraphQL / Session Blocks) ───────

def scrape_public_crawler(username: str) -> dict:
    """Scrapes public metadata directly using crawler user-agent."""
    print(f"    [*] Attempting direct public metadata extraction for @{username} ...")
    url = f"https://www.instagram.com/{username}/"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0"}
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            content = resp.read().decode("utf-8", errors="ignore")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise ValueError(f"Profile @{username} does not exist on Instagram (404 Not Found). Please verify the handle spelling.")
        print(f"    [!] Direct crawler request failed: {e}")
        return None
    except Exception as e:
        print(f"    [!] Direct crawler request failed: {e}")
        return None

    # Check if Instagram returned a 404 error page inside SPA HTML
    if "show_lox_redesigned_404_page" in content or "PolarisErrorRoot" in content:
        raise ValueError(f"Profile @{username} does not exist on Instagram (404 Not Found). Please verify the handle spelling.")

    og_title_m = re.search(r'<meta property="og:title" content="(.*?)"', content)
    og_desc_m = re.search(r'<meta property="og:description" content="(.*?)"', content)
    og_img_m = re.search(r'<meta property="og:image" content="(.*?)"', content)

    desc_match = re.search(r'<meta [^>]*name="description"[^>]*>', content)
    full_desc = ""
    if desc_match:
        tag_str = desc_match.group(0)
        c_m = re.search(r'content="(.*)" name="description"', tag_str, re.DOTALL)
        if c_m:
            full_desc = html.unescape(c_m.group(1))

    og_desc = html.unescape(og_desc_m.group(1)) if og_desc_m else ""
    og_title = html.unescape(og_title_m.group(1)) if og_title_m else ""

    text_to_parse = full_desc or og_desc
    if not text_to_parse:
        return None

    followers = "0"
    following = "0"
    posts = "0"

    counts_match = re.search(r'([\d,\.kKmM]+)\s+Followers,\s*([\d,\.kKmM]+)\s+Following,\s*([\d,\.kKmM]+)\s+Posts', text_to_parse)
    if counts_match:
        followers = counts_match.group(1)
        following = counts_match.group(2)
        posts = counts_match.group(3)

    bio = ""
    bio_match = re.search(r'on Instagram:\s*"(.*?)"', text_to_parse, re.DOTALL)
    if bio_match:
        bio = bio_match.group(1).strip()

    full_name = username
    name_match = re.search(r'^(.*?)\s*\(@' + re.escape(username) + r'\)', og_title)
    if name_match:
        full_name = name_match.group(1).strip()

    ext_url_match = re.search(r'https?://[^\s"]+', bio)
    ext_url = ext_url_match.group(0) if ext_url_match else None

    profile_data = {
        "username": username,
        "full_name": full_name,
        "biography": bio,
        "external_url": ext_url,
        "followers": followers,
        "following": following,
        "total_posts": posts,
        "is_verified": False,
        "is_business": bool(ext_url or "shop" in bio.lower() or "products" in bio.lower() or "printify" in bio.lower()),
        "is_private": False,
        "profile_pic_url": og_img_m.group(1) if og_img_m else None,
        "recent_posts": [
            {
                "caption": f"Profile Bio / Content: {bio}",
                "hashtags": [w.strip("#") for w in bio.split() if w.startswith("#")] or (["ecommerce", "merchandise", "online_store"] if ext_url else []),
                "mentions": [w.strip("@") for w in bio.split() if w.startswith("@")],
                "location": None,
                "likes": "N/A",
                "comments": "N/A",
                "timestamp": "Recent",
                "is_video": False,
                "url": f"https://www.instagram.com/{username}/"
            }
        ]
    }
    return profile_data


# ── Step 1: Scrape Instagram profile with Instaloader (with Auto-Fallback) ────

def fetch_profile(username: str) -> dict:
    """Scrape public profile info and recent posts using Instaloader or direct crawler."""
    print(f"\n[1/3] Fetching Instagram profile for @{username} ...")

    L = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        quiet=True,
    )

    # 1. Attempt to load an existing saved session file first
    session_loaded = False
    if INSTA_USER:
        try:
            L.load_session_from_file(INSTA_USER)
            print(f"    [+] Loaded saved session for @{INSTA_USER}")
            session_loaded = True
        except Exception:
            session_loaded = False

    # 2. Attempt login if credentials are provided and session was not loaded
    if not session_loaded and INSTA_USER and INSTA_PASS:
        try:
            L.login(INSTA_USER, INSTA_PASS)
            print(f"    [+] Logged in as @{INSTA_USER}")
            try:
                L.save_session_to_file()
            except Exception:
                pass
        except Exception as e:
            print(f"    [!] Login attempt encountered an issue: {e}")
            print("        Attempting public retrieval...")
    elif not session_loaded:
        print("    [*] Running in unauthenticated mode (public profiles only).")

    profile = None
    try:
        profile = instaloader.Profile.from_username(L.context, username)
    except instaloader.exceptions.PrivateProfileNotFollowedException:
        raise ValueError(f"Profile @{username} is private. This agent only works on public profiles.")
    except Exception as e:
        print(f"    [!] Instaloader query encountered: {e}")
        print(f"    [*] Engaging direct public crawler fallback...")
        try:
            crawler_data = scrape_public_crawler(username)
        except ValueError as ve:
            raise ve
        except Exception as ce:
            crawler_data = None

        if crawler_data:
            print(f"    [+] Successfully extracted live profile data via crawler!")
            print(f"    [+] Found   : {crawler_data.get('full_name')} (@{username})")
            print(f"    [+] Followers: {crawler_data.get('followers')} | Posts: {crawler_data.get('total_posts')}")
            return crawler_data
        else:
            raise ValueError(
                f"Could not retrieve profile @{username} (Instagram anti-scraping / rate-limit triggered or profile not found).\n"
                f"-> You can test the agent anytime with simulated demo telemetry:\n"
                f"   python instagram_agent_free.py --demo\n"
            )

    print(f"    [+] Found   : {profile.full_name or profile.username}")
    print(f"    [+] Followers: {profile.followers:,}")

    # ── Collect recent posts (up to 30) ──
    posts_data = []
    print(f"    [+] Collecting posts ", end="", flush=True)

    try:
        for i, post in enumerate(profile.get_posts()):
            if i >= 30:
                break

            posts_data.append({
                "caption"   : post.caption[:300] if post.caption else "",
                "hashtags"  : list(post.caption_hashtags) if post.caption_hashtags else [],
                "mentions"  : list(post.caption_mentions) if post.caption_mentions else [],
                "location"  : post.location.name if post.location else None,
                "likes"     : post.likes,
                "comments"  : post.comments,
                "timestamp" : str(post.date_local),
                "is_video"  : post.is_video,
                "url"       : f"https://www.instagram.com/p/{post.shortcode}/",
            })

            print(".", end="", flush=True)
            time.sleep(random.uniform(1.2, 2.5))
    except Exception as e:
        print(f"\n    [!] Could not retrieve all posts ({e}). Proceeding with {len(posts_data)} posts.")

    print(f" {len(posts_data)} posts collected")

    profile_data = {
        "username"       : profile.username,
        "full_name"      : profile.full_name,
        "biography"      : profile.biography,
        "external_url"   : profile.external_url,
        "followers"      : profile.followers,
        "following"      : profile.followees,
        "total_posts"    : profile.mediacount,
        "is_verified"    : profile.is_verified,
        "is_business"    : profile.is_business_account,
        "is_private"     : profile.is_private,
        "profile_pic_url": profile.profile_pic_url,
        "recent_posts"   : posts_data,
    }

    return profile_data


# ── Demo / Fallback Data Generator ─────────────────────────────────────────────

def get_demo_profile(username: str = "alex_tech_creator") -> dict:
    """Returns realistic mock profile telemetry for offline / demo testing."""
    print(f"\n[1/3] Loading simulation profile telemetry for @{username} ...")
    return {
        "username": username,
        "full_name": "Alex Mercer | AI & Cloud Architect",
        "biography": "Tech founder & Cloud Security consultant. Building autonomous agents. Photography & trail running on weekends. SF / Tokyo. ✈️",
        "external_url": "https://alexmercer.tech",
        "followers": 14200,
        "following": 420,
        "total_posts": 88,
        "is_verified": False,
        "is_business": True,
        "is_private": False,
        "profile_pic_url": "https://instagram.com/profile.jpg",
        "recent_posts": [
            {
                "caption": "Just wrapped up our keynote at Tokyo Tech Summit 2026! Autonomous AI agents are transforming enterprise operations.",
                "hashtags": ["AI", "TechSummit", "Tokyo", "CyberSecurity", "Cloud"],
                "mentions": ["tokyotechsummit"],
                "location": "Tokyo Big Sight, Japan",
                "likes": 1240,
                "comments": 45,
                "timestamp": "2026-09-28 14:30:00",
                "is_video": False,
                "url": "https://www.instagram.com/p/DemoPost1/"
            },
            {
                "caption": "Morning trail 15k run across Mount Tamalpais before diving into debugging distributed workflows. Clear head, fresh code.",
                "hashtags": ["TrailRunning", "Ultrarunning", "BayArea", "Fitness", "Nature"],
                "mentions": [],
                "location": "Mount Tamalpais State Park, California",
                "likes": 890,
                "comments": 22,
                "timestamp": "2026-09-22 08:15:00",
                "is_video": False,
                "url": "https://www.instagram.com/p/DemoPost2/"
            },
            {
                "caption": "Weekend coffee exploration in Shibuya. Pour-over Ethiopian beans and deep reading on LLM reasoning architectures.",
                "hashtags": ["SpecialtyCoffee", "Shibuya", "Reading", "DeepLearning"],
                "mentions": ["fuglencoffee"],
                "location": "Shibuya, Tokyo",
                "likes": 750,
                "comments": 18,
                "timestamp": "2026-09-15 11:20:00",
                "is_video": False,
                "url": "https://www.instagram.com/p/DemoPost3/"
            }
        ]
    }


# ── Step 2: Analyse with Groq ─────────────────────────────────────────────────

def analyse_with_groq(profile: dict) -> str:
    """Send scraped data to Groq's high-speed AI models and get an intelligence report."""
    if not GROQ_API_KEY or GROQ_API_KEY == "YOUR_GROQ_API_KEY":
        raise ValueError(
            "GROQ_API_KEY is not configured!\n"
            "Please add your free Groq API key to .env file:\n"
            "GROQ_API_KEY=gsk_your_key_here\n"
            "Get one free at https://console.groq.com"
        )

    print("\n[2/3] Analysing profile telemetry with Groq AI ...")

    data_packet = {
        "username"     : profile.get("username"),
        "full_name"    : profile.get("full_name"),
        "bio"          : profile.get("biography"),
        "website"      : profile.get("external_url"),
        "followers"    : profile.get("followers"),
        "following"    : profile.get("following"),
        "total_posts"  : profile.get("total_posts"),
        "is_verified"  : profile.get("is_verified"),
        "is_business"  : profile.get("is_business"),
        "recent_posts" : profile.get("recent_posts", []),
    }

    prompt = f"""
You are an expert social media OSINT (Open Source Intelligence) analyst. You have been given scraped 
public data from an Instagram profile. Analyse this data systematically and produce an intelligence report.

SCRAPED DATA:
{json.dumps(data_packet, indent=2, default=str)}

Produce a detailed report with the following sections:

1. IDENTITY OVERVIEW
   - Full name, username, verification status
   - Account type (personal / business / creator)
   - Bio analysis — what it reveals about them

2. PROFESSIONAL LIFE
   - Likely occupation or industry (infer from posts, hashtags, bio, external URLs)
   - Employer or business name if inferable (e.g. print-on-demand stores, brands)
   - Commercial offerings or professional skills evident from content

3. HOBBIES & INTERESTS
   - List hobbies inferred from post captions, bio, and hashtags
   - Recurring themes or topics (e.g. anime, gaming, design, tech)

4. LIFESTYLE & PERSONALITY
   - Lifestyle indicators
   - Personality traits evident from writing style and presentation
   - Values or interests they highlight

5. LOCATION & TRAVEL PATTERNS
   - Primary location / language / currency indicators (if inferable)
   - Places visited or mentioned

6. SOCIAL BEHAVIOUR
   - Audience engagement potential (follower/following ratio)
   - Promotion and merchandising activity

7. KEY INSIGHTS SUMMARY
   - Top 5 most interesting intelligence findings
   - Confidence level for major inferences (High / Medium / Low)

8. DATA GAPS & LIMITATIONS
   - What could not be determined from available data
   - Suggestions for further research

Be factual, analytical, and note when you are making inferences vs stating confirmed facts.
Mark inferences clearly with (inferred).
"""

    client = Groq(api_key=GROQ_API_KEY)

    response = None
    last_error = None

    for model_name in GROQ_MODELS:
        for attempt in range(2):
            try:
                print(f"    [*] Querying Groq model: {model_name} ...")
                chat_completion = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3,
                    max_tokens=2500,
                )
                response = chat_completion.choices[0].message.content
                print(f"    [+] Analysis completed successfully with {model_name}!")
                break
            except Exception as e:
                last_error = e
                print(f"    [!] Groq query error ({e}). Retrying...")
                time.sleep(2)
        if response:
            break

    if not response:
        raise RuntimeError(f"All Groq models failed. Last error: {last_error}")

    return response


# ── Step 3: Save report ────────────────────────────────────────────────────────

def save_report(username: str, report: str, profile: dict):
    """Save the report to both .txt and .md files and print it."""
    print("\n[3/3] Saving intelligence report ...")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    txt_filename = f"instagram_report_{username}_{timestamp}.txt"
    md_filename  = f"instagram_report_{username}_{timestamp}.md"

    output = f"""================================================================================
  INSTAGRAM OSINT INTELLIGENCE REPORT
  Target   : @{username}
  Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
  Tool     : Instaloader + Groq AI (FREE)
================================================================================

{report}

================================================================================
  RAW PROFILE SNAPSHOT
================================================================================
Username   : {profile.get('username')}
Full Name  : {profile.get('full_name')}
Followers  : {profile.get('followers')}
Following  : {profile.get('following')}
Total Posts: {profile.get('total_posts')}
Verified   : {profile.get('is_verified')}
Business   : {profile.get('is_business')}
Website    : {profile.get('external_url') or 'N/A'}
================================================================================
"""

    # Save TXT
    with open(txt_filename, "w", encoding="utf-8") as f:
        f.write(output)

    # Save Markdown
    with open(md_filename, "w", encoding="utf-8") as f:
        f.write(f"# Instagram OSINT Intelligence Report: @{username}\n\n" + output)

    print(f"\n[+] Report successfully saved to: {txt_filename} and {md_filename}")
    print("\n" + "=" * 80)
    print(report)
    print("=" * 80)


# ── Main ───────────────────────────────────────────────────────────────────────

def run_agent(username: str = None, is_demo: bool = False):
    target = username or "alex_tech_creator"
    print(f"\n{'=' * 60}")
    print(f"  Instagram OSINT Agent (FREE) - @{target}")
    if is_demo:
        print("  [DEMO / TEST MODE ACTIVATED]")
    print(f"{'=' * 60}")

    # 1. Fetch Profile
    try:
        if is_demo:
            profile = get_demo_profile(target)
        else:
            profile = fetch_profile(target)
    except (ValueError, RuntimeError) as e:
        print(f"\n[!] Error: {e}")
        return

    # 2. AI analysis
    try:
        report = analyse_with_groq(profile)
    except Exception as e:
        print(f"\n[!] AI Analysis Error: {e}")
        return

    # 3. Save & Output
    save_report(target, report, profile)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Instagram OSINT Agent (Free Version)")
    parser.add_argument("--username", "-u", required=False, help="Instagram username to analyse")
    parser.add_argument("--demo", action="store_true", help="Run with simulated demo profile telemetry (bypasses Instagram rate limits)")
    args = parser.parse_args()

    if not args.username and not args.demo:
        print("\n[!] Missing required arguments.")
        print("Usage:")
        print("  python files/instagram_agent_free.py --username <username>")
        print("  python files/instagram_agent_free.py --demo")
        sys.exit(1)

    run_agent(username=args.username, is_demo=args.demo)