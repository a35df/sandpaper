# draft_sandpaper

**AI-powered paragraph-level writing assistant for webnovel authors**

---

## 🌟 Purpose
`draft_sandpaper` helps authors turn rough paragraph drafts into vivid, realistic, and well-researched prose. It encourages uninterrupted writing by separating "writing" and "editing" phases. All AI interactions (reference lookup, rewriting) are disabled until the writer finishes an episode and explicitly saves it.

---

## ✏️ Core Features

### ✔️ Paragraph Block Editor
- TipTap-based editor
- Each paragraph is a draggable, reorderable block
- Paragraphs are read-only during drafting phase

### ✔️ Episode-Based Workflow
- Writers enter an episode title and begin writing blocks
- All interactions (editing, AI assistance) are locked until the episode is saved
- After saving:
  - Paragraphs become editable
  - Gemini 2.5 Pro can rewrite paragraphs
  - AI-generated reference cards can be applied

### ✔️ AI Reference System (post-save only)
- Drag paragraph to the right edge → AI generates 6 reference cards based on full episode context
- 4 cards are shown at the top center
- Cards can be dragged to paragraph to apply
- Applied cards trigger Gemini-powered paragraph rewriting
- Unused cards are moved to the right panel for reuse

### ✔️ Reference and Episode Card Panels
- Left side: Episode cards (title + summary)
- Right side: Reference cards (title + summary)
- Cards are stacked with only titles visible; on hover, nearby cards expand

  예시: StackedCardView에서 카드 hover 시 스타일 변화 주기
  ```tsx
  <StackedCardView
    items={cards}
    renderItem={(item, hovered) => (
      <div className={`rounded-lg p-4 bg-white transition-all duration-200
        ${hovered ? 'shadow-2xl scale-105 border-2 border-blue-400 z-50' : 'shadow-md'}
      `}>
        {item.title}
      </div>
    )}
  />
  ```
- Panels appear on hover at screen edges
- Cards can be pinned (always prioritized in context)
- Cards can be grouped (category system)
- Cards can be dragged in/out of “Hold” zones to include/exclude them from AI context

### ✔️ Episode Saving & Contextual Summarization
- Saving an episode stores all paragraphs and auto-generates a summary
- Writers can review and edit the summary
- Summary is stored alongside original content in database

---

## 📄 Technologies
- Next.js (TypeScript)
- TipTap
- Tailwind CSS
- Framer Motion
- @google/generative-ai (Gemini 2.5 Pro)
- Supabase (database)

---

## ⚡ How to Develop This Project Using GitHub Copilot Workspace

1. **Create a GitHub repo** named `draft_sandpaper`
2. Add this README.md to the root of the repo
3. Go to [https://github.com/copilot/workspace](https://github.com/copilot/workspace)
4. Select “Create workspace from repo” and choose `draft_sandpaper`
5. Add tasks one by one, e.g.:
   - `Implement TipTap block editor with draggable paragraphs`
   - `Disable editing until episode is saved`
   - `Show episode list as cards on left hover panel`
   - `Implement right-drag reference card system`
   - `Use Gemini API to rewrite paragraph with card + context`
   - `Build card stacking and hover expansion logic`
   - `Add Hold zone to exclude cards from AI context`
6. Review generated PRs, leave feedback in natural language
7. Merge when satisfied

---

## 🌈 Roadmap Suggestions
- Version 0.1.0: Core editor + episode save + AI assist
- Version 0.2.0: Card hold system + pinning + card reuse logic
- Version 0.3.0: Episode preview mode + visual version history (optional)

---

## ✨ Vision
**draft_sandpaper** is more than a writing assistant. It's a controlled environment that helps writers keep moving forward, while still having powerful tools to enhance and polish their work — when they're ready.

