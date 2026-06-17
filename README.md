# BigQuery Release Notes Tracker

A sleek, premium web application built with Python Flask and plain vanilla HTML, CSS, and JavaScript. The application fetches the official Google Cloud BigQuery Release Notes XML feed, parses the entries, lists them dynamically, and offers a real-time X/Twitter Post Composer with a native Web Intent preview and character limits.

## Core Features

- **Dynamic XML Feed Parsing**: Fetches the GCP Atom XML feed dynamically on the backend (incorporating SSL bypasses for certificate errors typical on macOS environments) and flattens entries into distinct update cards.
- **Glassmorphism Design System**: Tailored colors using HSL variables, smooth transitions, and premium card layouts.
- **Dual Mode Theme**: Adapts to the user's system dark/light preferences automatically, with a manual toggle stored in `localStorage`.
- **Search & Filters**: Supports instant client-side keyword search, category badge filters (e.g. *Feature*, *Announcement*, *Fix*, *Deprecation*, *Issue*), and date sorting (Newest/Oldest).
- **Tweet Composer & Live Preview**:
  - Selecting any update card populates a detail view and draft composer.
  - Automatically calculates tweet character headroom (accounting for URL shortening, prefixes, tags) and truncates content safely.
  - Features a live progress ring indicator that turns amber/red as you approach and exceed the 280-character limit.
  - Renders a live "mock tweet card" that mirrors your composer changes in real-time.
  - Opens X/Twitter's native Web Intent composer with a single click (no API keys, login credentials, or backend tokens needed).
- **Responsive Layout**: Adapts gracefully to desktop (split column), tablet (overlay panel), and mobile (single column) screens.
- **Custom Scrollbars**: Custom thickness and colors implemented natively with legacy WebKit fallbacks.

## Project Structure

```
bq-releases-notes/
├── app.py                  # Flask backend app & feed parser
├── requirements.txt        # Backend dependencies
├── README.md               # Documentation
├── templates/
│   └── index.html          # Main HTML structure & inline SVGs
└── static/
    ├── css/
    │   └── style.css       # Premium custom stylesheets
    └── js/
        └── app.js          # Main frontend app controller
```

## Running the Application Locally

1. **Setup a virtual environment and install dependencies**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Run the Flask server**:
   ```bash
   python3 app.py
   ```

3. **Open in browser**:
   Navigate to [http://localhost:5001](http://localhost:5001) in your browser.

## Tech Details

- **Backend**: Python 3, Flask, standard libraries (`urllib.request`, `xml.etree.ElementTree`).
- **Frontend**: Vanilla HTML5, Vanilla JavaScript (ES6), Vanilla CSS3.
- **Iconography**: Clean inline SVG paths (no extra font files or dependencies to block page load).
- **Twitter Web Intent Integration**: Native intent URL generation `https://twitter.com/intent/tweet?text=...`.
