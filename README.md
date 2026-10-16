# Japanese Vocabulary Flashcards

A responsive, mobile-friendly Japanese vocabulary review website for Lessons 1–78.

## Features
- Select one lesson, multiple lessons, lesson ranges, or all available lessons.
- Review Japanese kana-only vocabulary with English meanings.
- Tap a card to reveal or hide the meaning.
- **Know** removes a card from the current session.
- **Don't know** returns a card to the end of the queue so it can be reviewed again.
- The session completes only after every selected card has been marked **Know**.
- Responsive layout for phones, tablets, and desktop.

## Run locally
Open `index.html` in a modern browser. The vocabulary data is loaded from `public/lesson-data-1-78-no-kanji.js`.

## Deploy on Vercel
Import this GitHub repository into Vercel and deploy it as a static site. The site entry point is the root `index.html`; no build command is required.

## Vocabulary source
The app uses the existing `public/lesson-data-1-78-no-kanji.js` data file. The source vocabulary has Japanese readings and English meanings only; this app does not modify that data.
