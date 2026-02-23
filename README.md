# Indian Income Tax Calculator FY 2024-25

A comprehensive Indian income tax calculator built with React, featuring tax planning suggestions, Form 16 parsing, PDF export, dark mode, and profile management.

## Features

- **Tax Calculator** — Full income tax computation for Old & New regimes with automatic recommendation
- **Export as PDF** — Generate a professional tax calculation report and print/save as PDF
- **Save & Load Profiles** — Save multiple tax profiles to localStorage and reload them anytime
- **Tax Planning Suggestions** — Smart, personalized suggestions to reduce your tax liability
- **Tax Saving Recommendations** — Section 80C investment options, NPS, health insurance, HRA tips
- **Form 16 Parser** — Paste or upload Form 16 text to auto-fill all fields
- **Dark Mode** — Toggle between light and dark themes, persisted across sessions

## Deploy on Vercel

### Option 1: CLI
```bash
npm install
npm run build
npx vercel --prod
```

### Option 2: Git
1. Push this folder to a GitHub/GitLab repo
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repo — Vercel auto-detects Create React App
4. Click **Deploy**

No environment variables or special configuration needed.

## Local Development

```bash
npm install
npm start
```

Opens at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
├── public/
│   └── index.html
├── src/
│   ├── index.js          # Entry point
│   ├── App.js            # Main React app with all UI components
│   ├── taxEngine.js      # Tax calculation, suggestions, Form 16 parser, PDF export
│   └── styles.css        # Full light + dark theme styles
├── package.json
└── README.md
```

## Tech Stack

- React 18 (Create React App)
- Pure CSS with CSS variables for theming
- No external UI libraries — lightweight and fast
- localStorage for profiles and theme persistence
