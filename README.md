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
