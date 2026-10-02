# 🕵️ SPECTER // Autonomous Instagram OSINT & Psychographic Profiler

[![Next.js](https://img.shields.io/badge/Next.js-14.2%2B-black?logo=next.js)](https://nextjs.org/)
[![Groq AI](https://img.shields.io/badge/Groq-GPT--OSS--120B%20%7C%20Llama3-orange?logo=groq)](https://groq.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Vercel Ready](https://img.shields.io/badge/Vercel-Deploy--Ready-000000?logo=vercel)](https://vercel.com/)

> **SPECTER** is an open-source, full-stack **Autonomous Social Media Intelligence & Behavioral Profiling Engine** built with Next.js, Groq AI, and high-fidelity OpenGraph forensic crawlers. It analyzes public Instagram profiles to extract behavioral patterns, psychological archetypes, likes/dislikes, hobbies, commercial footprints, and visual forensics across posts, reels, and story highlights.

---

## ⚡ Key Intelligence Capabilities

- 💬 **AI OSINT Copilot Chatbot**: Interactive forensic Q&A assistant to query any aspect of the target profile—such as their profession, business model, estimated demographic age, following network, hobbies, and product catalog.
- 🧠 **Psychometric Spectrum (Big Five)**: Quantifies Openness, Conscientiousness, Extraversion, Agreeableness, and Emotional Stability.
- 🎯 **Behavioral Archetypes**: Synthesizes persona definitions (e.g. *Tech Innovator & Adventurer*, *E-Commerce Merchant*, *Anime Apparel Creator*).
- 🎬 **Reels & Media Forensics**: Extracts view metrics, audio tracks, duration, engagement ratios, and caption semantics.
- 🌟 **Story Highlights Archive**: Dissects categorized story highlight collections and post themes.
- 💼 **Commercial Footprint**: Detects storefronts (Shopify, Printify), affiliate signals, monetization models, and brand partnerships.
- 📑 **1-Click Forensic Dossier**: Export structured OSINT intelligence reports in Markdown (`.md`), Copy to Clipboard, or Print to PDF.
- 🧪 **Interactive Demo Sandbox**: Pre-loaded with realistic target datasets for instant previews without API rate limits.

---

## 🚀 Quickstart: Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file (or `.env.local`):
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
APIFY_API_KEY=your_optional_apify_key
```
*(Get a free Groq API key at [console.groq.com](https://console.groq.com))*

### 3. Launch the Application
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🌐 Deploy to Vercel (Step-by-Step)

### Option A: 1-Click Git Push to Vercel (Recommended)

1. **Initialize Git & Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit for SPECTER Instagram OSINT web platform"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **Import into Vercel**:
   - Go to [vercel.com](https://vercel.com) and log in with GitHub.
   - Click **"Add New..."** → **"Project"**.
   - Select your repository (`<your-repo-name>`).
   - In **Environment Variables**, add:
     - `GROQ_API_KEY`: your free Groq API key.
     - *(Optional)* `APIFY_API_KEY`: your Apify token if using live proxy scraping.
   - Click **Deploy**!
   - Your live website will be live in ~60 seconds with a free `https://<your-project>.vercel.app` domain!

---

## 🐍 CLI Alternative

You can also run the terminal-based Python OSINT agent:
```bash
# Demo Simulation Mode (Works offline / without Instagram rate limits)
python instagram_agent_free.py --demo

# Live Public Instagram Profile Scan
python instagram_agent_free.py --username <target_username>
```

---

## ⚖️ Legal & Privacy Disclaimer
*This software is intended strictly for authorized security assessments, OSINT research, and educational purposes analyzing public social media metadata. Respect platform terms of service and personal privacy rights.*
