# Competitor Apps Research

*Researched: 2026-02-10*

## PDF Annotation App Landscape (2025)

### Adobe Acrobat Pro DC
- **The standard** — enterprise dominance
- **Platforms:** All (desktop, mobile, web)
- **Pricing:** $13-20/month
- **Strengths:** Full-featured, industry standard, collaboration
- **Weaknesses:** Heavy, expensive, subscription fatigue

### PDF Expert (Readdle)
- **Platforms:** Mac, iPad, iPhone
- **Pricing:** Subscription (~$80/year) or one-time purchase
- **Strengths:** Fast, clean UI, good Apple integration
- **Weaknesses:** Apple-only, no Windows
- **AI Features:**
  - *PDF Copilot* — chat with PDF, ask questions, generate summaries, extract key points, create keywords/hashtags
  - *Enhance* — AI-powered scan cleanup (fix distortions, remove shadows, improve contrast)
  - *Smart OCR* — high-precision text recognition on scans

### Foxit PDF Reader
- **Positioning:** Adobe alternative
- **Platforms:** All
- **Strengths:** Lighter than Adobe, free tier
- **Weaknesses:** Less polished, feature creep

### GoodNotes 5
- **Focus:** Note-taking first, PDF annotation second
- **Platforms:** iPad, Mac, iPhone
- **Strengths:** Beautiful handwriting, notebook feel
- **Weaknesses:** Not built for proofreading/markup workflows

### Notability
- **Focus:** Note-taking with PDF support
- **Platforms:** iPad, Mac, iPhone
- **Strengths:** Audio recording + notes, student favorite
- **Weaknesses:** Annotation tools basic for professional use

### LiquidText
- **Focus:** Research/study — spatial document layout
- **Platforms:** iPad, Mac, Windows
- **Strengths:** Unique spatial interface, connect ideas across pages
- **Weaknesses:** Learning curve, niche use case

### MarginNote 3
- **Focus:** Deep research, mind mapping
- **Platforms:** iPad, Mac
- **Strengths:** Powerful for academics
- **Weaknesses:** Complex, steep learning curve

### Xodo
- **Focus:** Cross-platform free option
- **Platforms:** All (including web)
- **Strengths:** Free, works everywhere
- **Weaknesses:** Ad-supported, basic features

### Kami
- **Focus:** Education/classroom
- **Platforms:** Web-based, Chromebook-friendly
- **Strengths:** Google Classroom integration, school adoption
- **Weaknesses:** Web-only, education-focused

## Feature Comparison

| Feature | Common? | Stampede |
|---------|---------|----------|
| Highlights/underlines | ✅ All | ✅ |
| Text comments | ✅ All | ✅ |
| Stamps/marks | ✅ Most | ✅ (Text-to-Stamp!) |
| Drawing/pencil | ✅ Most | ? |
| Apple Pencil support | ✅ iPad apps | ✅ |
| Cross-platform sync | Some | ? |
| Collaboration | Enterprise | ? |
| Proofreading-specific tools | ❌ Rare | ✅ (USP!) |

## Where Competitors Fall Short

**Adobe Acrobat**
- Bloated, slow to launch — you just want to mark up a PDF, not load an OS
- Subscription-only ($150+/year) — hostile to indie users
- Enterprise-focused UI — overwhelming for simple proofreading tasks

**PDF Expert**
- Good but generic — no proofreading-specific tools
- Subscription creep — was one-time purchase, now pushing subscriptions
- No Windows — limits team collaboration

**GoodNotes / Notability**
- Note-taking apps forced into PDF duty — wrong mental model
- Designed for handwriting notes, not professional markup
- No stamp libraries or proofreading marks

**LiquidText / MarginNote**
- Powerful but complex — massive learning curve
- Overkill for "just mark this PDF and send it back"
- Research-focused, not production-focused

**Xodo / Free options**
- Ad-supported, clunky UX
- Basic annotation tools, no professional workflow
- "You get what you pay for"

**The common thread:** None of them were built by someone who actually proofreads for a living. They guess at workflows instead of knowing them.

## Stampede's Positioning

**The gap:** Most PDF annotators are either:
- General-purpose (Adobe, PDF Expert) — powerful but not specialized
- Note-taking focused (GoodNotes, Notability) — wrong workflow for markup
- Research-focused (LiquidText, MarginNote) — too complex for simple proofreading

**Stampede's angle:**
- Built by a proofreader, for proofreaders (and editors, reviewers)
- Text-to-Stamp = unique feature for common corrections
- Professional markup without the bloat
- iPad-first with Apple Pencil optimization

---

## AI & The Future of Proofreading

**The concern:** Will AI replace proofreading entirely?

**The nuance:** AI changes proofreading but doesn't eliminate the markup workflow.

- **Finding errors** — AI is already very good (Grammarly, Claude, GPT). Will only improve.
- **Communicating feedback** — Still needs humans marking up PDFs, adding context, approving/rejecting.

Even if AI spots every typo, someone still has to:
- Review the AI's suggestions
- Add contextual feedback ("this paragraph is unclear")
- Handle visual/layout issues AI can't catch
- Sign off with human accountability (legal, academic)

**How competitors use AI (and where they miss):**

PDF Expert and others use AI for:
- *Understanding* documents (summaries, Q&A, key points)
- *Cleaning* documents (scan enhancement, OCR)

What they DON'T do:
- Suggest proofreading marks
- Spot errors and offer to place the correction stamp
- Automate the annotation workflow itself

**Stampede's AI opportunity — a different angle entirely:**
- AI that *suggests marks*, not just summarizes content
- "Found 3 spelling errors — tap to place correction stamps"
- AI as proofreading assistant, human as approver
- The markup workflow stays human, but AI accelerates it

This is unexplored territory. Competitors are doing "chat with your PDF" — Stampede could do "AI that proofreads with you."

**Opportunity for Stampede:**
- AI finds issues → human uses Stampede to mark them up and communicate
- Position as the tool for *reviewing* AI suggestions, not competing with AI
- "AI-assisted proofreading" as a potential feature
- Competitors like PDF Expert already adding AI — don't ignore the trend

**Timeline:** High-stakes domains (legal, academic) may require human proofreaders for 5-20 more years. That's a window. Tools that *work with* AI survive longer than tools that ignore it.

---

## AI Implementation Notes (Cost Management)

**How do apps afford AI features without massive bills?**

1. **Volume deals / committed spend**
   - Big players negotiate enterprise rates with OpenAI/Anthropic
   - Committed annual spend = significant discounts
   - Not available to indie devs initially

2. **Bake into subscription price**
   - PDF Expert ~$80/year — AI costs ~$0.50-2/user/month at volume
   - Premium tier subsidizes AI usage

3. **Usage caps**
   - "50 AI queries/month" limits exposure
   - Power users hit the wall, casual users never notice

4. **Cheaper models for simple tasks**
   - GPT-4o-mini, Claude Haiku, Gemini Flash = 10-50x cheaper than flagship
   - Summarization doesn't need GPT-4
   - Route simple → cheap, complex → expensive

5. **On-device / local models**
   - OCR and scan enhancement don't need cloud LLMs
   - Specialized ML models run locally, zero API cost

6. **BYOK (Bring Your Own Key)**
   - High friction for consumer apps
   - Works for dev tools (Cursor, some Obsidian plugins), not mass market

**Stampede approach:**
Start with usage-capped AI on a cheap model (Haiku/Gemini Flash). If it takes off, negotiate volume deals. Don't over-engineer billing before you have users.

---

*Sources:*
- https://www.drawboard.com/blog/top-pdf-annotation-apps
- https://bugsmash.io/blog/pdf-annotation-app/
- https://zapier.com/blog/best-pdf-editor-apps/
- https://www.jopdf.com/annotate-pdf/best-pdf-annotator/
