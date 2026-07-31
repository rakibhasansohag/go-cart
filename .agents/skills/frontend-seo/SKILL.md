---
name: frontend-seo
description: Apply Next.js frontend SEO, semantic HTML5, metadata, structured content, and accessibility best practices. Use for pages, layouts, navigation, headings, landmarks, metadata, canonical URLs, social previews, indexability, and customer-facing content.
---

# Frontend SEO

- Preserve one descriptive page-level `h1` and a logical heading hierarchy.
- Use semantic landmarks (`main`, `nav`, `header`, `footer`) and labelled sections.
- Prefer native interactive elements; ensure keyboard access, focus visibility, labels, alt text, and meaningful link text.
- Use Next.js Metadata APIs for titles, descriptions, canonical URLs, robots directives, and Open Graph/Twitter data.
- Keep server-rendered customer-facing content crawlable; do not hide essential content behind client-only effects.
- Avoid duplicate landmarks, skipped heading levels, keyword stuffing, and inaccessible visual-only labels.
- Reuse theme tokens rather than hardcoded colors, and verify light/dark contrast.
- After changes, run TypeScript, lint the touched files, and inspect the rendered heading/landmark structure.
