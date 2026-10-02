"""
Instagram OSINT Agent
---------------------
Uses Apify to scrape a public Instagram profile, then Claude AI
to analyze the data and generate an intelligent profile report.

Requirements:
    pip install apify-client anthropic

Usage:
    python instagram_agent.py --username <instagram_username>

Environment variables:
    APIFY_API_KEY     - Your Apify API token (https://console.apify.com/account/integrations)
    ANTHROPIC_API_KEY - Your Anthropic API key (https://console.anthropic.com/)
"""

import os
import sys
import json
import argparse
import time
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

from apify_client import ApifyClient
import anthropic

# ── Configuration ─────────────────────────────────────────────────────────────

load_dotenv()
APIFY_API_KEY     = os.getenv("APIFY_API_KEY", "").strip()
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()

# Apify actor IDs for Instagram
ACTOR_PROFILE  = "apify/instagram-profile-scraper"   # profile info + recent posts
ACTOR_COMMENTS = "apify/instagram-comment-scraper"   # comments on posts


# ── Step 1: Fetch Instagram profile + posts via Apify ─────────────────────────

def fetch_profile(username: str) -> dict:
    """Scrape public profile info and up to 30 recent posts."""
    print(f"\n[1/3] Fetching Instagram profile for @{username} ...")

    client = ApifyClient(APIFY_API_KEY)

    run = client.actor(ACTOR_PROFILE).call(run_input={
        "usernames": [username],
        "resultsLimit": 30,          # number of posts to retrieve
    })

    items = list(client.dataset(run["defaultDatasetId"]).iterate_items())

    if not items:
        raise ValueError(f"No data returned for @{username}. "
                         "The profile may be private or the username is wrong.")

    profile = items[0]
    print(f"    ✓ Found profile: {profile.get('fullName', username)}")
    print(f"    ✓ Posts fetched: {len(profile.get('latestPosts', []))}")
    return profile


# ── Step 2: (Optional) Fetch comments made by the user ────────────────────────

def fetch_user_comments(username: str, post_urls: list[str], max_posts: int = 10) -> list[dict]:
    """
    Scrape comments from the user's own posts and look for replies,
    then filter down to comments authored by the target user.

    NOTE: Instagram doesn't expose 'comments made by user X on other profiles'.
          We can only retrieve comments left ON their own posts (by others + themselves).
          For deeper comment history, a specialised data provider is needed.
    """
    if not post_urls:
        return []

    print(f"\n[2/3] Fetching comments from @{username}'s posts (up to {max_posts} posts) ...")
    client = ApifyClient(APIFY_API_KEY)

    run = client.actor(ACTOR_COMMENTS).call(run_input={
        "directUrls": post_urls[:max_posts],
        "resultsLimit": 50,
    })

    all_comments = list(client.dataset(run["defaultDatasetId"]).iterate_items())

    # Filter to comments left by the target user themselves (self-replies etc.)
    user_comments = [c for c in all_comments if c.get("ownerUsername", "").lower() == username.lower()]

    print(f"    ✓ Total comments scraped : {len(all_comments)}")
    print(f"    ✓ Comments by @{username}: {len(user_comments)}")
    return user_comments


# ── Step 3: Analyse with Claude ───────────────────────────────────────────────

def analyse_with_claude(profile: dict, user_comments: list[dict]) -> str:
    """Send all scraped data to Claude and get a structured intelligence report."""
    print("\n[3/3] Analysing data with Claude AI ...")

    # ── Build a concise data packet for the prompt ──
    posts_summary = []
    for p in profile.get("latestPosts", [])[:30]:
        posts_summary.append({
            "caption"   : p.get("caption", "")[:300],
            "hashtags"  : p.get("hashtags", []),
            "location"  : p.get("locationName"),
            "likes"     : p.get("likesCount"),
            "timestamp" : p.get("timestamp"),
            "type"      : p.get("type"),
        })

    data_packet = {
        "username"        : profile.get("username"),
        "full_name"       : profile.get("fullName"),
        "bio"             : profile.get("biography"),
        "website"         : profile.get("externalUrl"),
        "followers"       : profile.get("followersCount"),
        "following"       : profile.get("followingCount"),
        "is_verified"     : profile.get("verified"),
        "is_business"     : profile.get("isBusinessAccount"),
        "business_category": profile.get("businessCategoryName"),
        "total_posts"     : profile.get("postsCount"),
        "recent_posts"    : posts_summary,
        "self_comments"   : [c.get("text", "") for c in user_comments[:20]],
    }

    prompt = f"""
You are an expert social media intelligence analyst. You have been given scraped public 
data from an Instagram profile. Analyse this data carefully and produce a comprehensive 
profile report.

SCRAPED DATA:
{json.dumps(data_packet, indent=2, default=str)}

Produce a detailed report with the following sections:

1. **IDENTITY OVERVIEW**
   - Full name, username, verification status
   - Account type (personal / business / creator)
   - Bio analysis — what it reveals about them

2. **PROFESSIONAL LIFE**
   - Likely occupation or industry (infer from posts, hashtags, bio, business category)
   - Employer or business name if inferable
   - Professional skills or expertise evident from content

3. **HOBBIES & INTERESTS**
   - List hobbies inferred from post captions and hashtags
   - Recurring themes or topics they post about
   - Sports, arts, travel, food, fitness, etc.

4. **LIFESTYLE & PERSONALITY**
   - Lifestyle indicators (luxury, minimalist, adventurous, homebody, etc.)
   - Personality traits evident from writing style and content choices
   - Values or beliefs they seem to hold

5. **LOCATION & TRAVEL PATTERNS**
   - Primary location / home city (if inferable)
   - Places visited or mentioned in posts
   - Travel frequency and destinations

6. **SOCIAL BEHAVIOUR**
   - Posting frequency and consistency
   - Engagement level (likes relative to followers)
   - Community involvement based on hashtags used
   - Self-comments analysis (if available)

7. **KEY INSIGHTS SUMMARY**
   - Top 5 most interesting intelligence findings
   - Confidence level for major inferences (High / Medium / Low)

8. **DATA GAPS & LIMITATIONS**
   - What could not be determined from available data
   - Suggestions for further research

Be factual, analytical, and note when you are making inferences vs stating confirmed facts.
Mark inferences clearly with (inferred).
"""

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    message = client.messages.create(
        model="claude-3-7-sonnet-20250219",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    return message.content[0].text


# ── Output ─────────────────────────────────────────────────────────────────────

def save_report(username: str, report: str, profile: dict):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename  = f"instagram_report_{username}_{timestamp}.txt"

    output = f"""
================================================================================
  INSTAGRAM INTELLIGENCE REPORT
  Target   : @{username}
  Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
  Tool     : Apify + Claude AI
================================================================================

{report}

================================================================================
  RAW PROFILE SNAPSHOT
================================================================================
Username   : {profile.get('username')}
Full Name  : {profile.get('fullName')}
Followers  : {profile.get('followersCount'):,}
Following  : {profile.get('followingCount'):,}
Total Posts: {profile.get('postsCount'):,}
Verified   : {profile.get('verified')}
Business   : {profile.get('isBusinessAccount')}
Website    : {profile.get('externalUrl', 'N/A')}
================================================================================
"""

    with open(filename, "w", encoding="utf-8") as f:
        f.write(output)

    print(f"\n✅ Report saved to: {filename}")
    print("\n" + "="*80)
    print(report)
    print("="*80)


# ── Main ───────────────────────────────────────────────────────────────────────

def run_agent(username: str, skip_comments: bool = False):
    print(f"\n{'='*60}")
    print(f"  Instagram OSINT Agent — @{username}")
    print(f"{'='*60}")

    # 1. Scrape profile
    profile = fetch_profile(username)

    # 2. Scrape comments (optional, uses extra Apify credits)
    user_comments = []
    if not skip_comments:
        post_urls = [p.get("url") for p in profile.get("latestPosts", []) if p.get("url")]
        try:
            user_comments = fetch_user_comments(username, post_urls, max_posts=10)
        except Exception as e:
            print(f"    ⚠ Could not fetch comments: {e}")

    # 3. AI analysis
    report = analyse_with_claude(profile, user_comments)

    # 4. Save & display
    save_report(username, report, profile)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Instagram OSINT Agent")
    parser.add_argument("--username",       required=True, help="Instagram username to analyse")
    parser.add_argument("--skip-comments",  action="store_true", help="Skip comment scraping (saves Apify credits)")
    args = parser.parse_args()

    run_agent(args.username, skip_comments=args.skip_comments)
