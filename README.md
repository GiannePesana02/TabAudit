# TabAudit — Intelligent Sugestion-Driven Tab Manager

TabAudit is a background-first, suggestion-driven tab manager that works silently, thinks ahead, and only surfaces when the user opens the popup. The AI does the heavy cognitive work of organizing and identifying stale clutter—you make the final call with one click.

---

## 🚀 Key Features

1. **Popup-Open AI Audit**: Analysis runs immediately when you open the popup (with a 2-minute cache rule to prevent API spamming). It suggests context groups and identifies stale browser tabs.
2. **Single-Click Grouping & Merging**: Accepts AI suggestions instantly with a single click.
3. **Passive Stale Score System**: Ranks each tab from `0–100` dynamically using duration inactive + tab position index.
4. **Reversible Group Freezing**: Serializes full sets of links, shuts down active tabs to free up RAM, and keeps them safe inside your local frozen session shelf. If you change your mind, a **10-second interactive Undo Toast** is displayed to instantly restore everything.
5. **No Background Interruptions**: No periodic background trackers, no system notifications, no badges, and no RAM leaks while browsing.

---

## ⚙️ How to Get a Gemini API Key

TabAudit's recommendation intelligence operates securely via the fast `gemini-3.5-flash` model.

1. **Get an API Key**: Visit the Google AI Studio [API Key Portal](https://aistudio.google.com/) and click **Create API Key**.
2. **Setup inside AI Studio Preview**: Open your **Settings** panel (⚙️ icon in the header) and enter your key.
3. **Setup as Local Environment Variable**: You can also save it inside your `.env` as:
   ```env
   GEMINI_API_KEY="your-gemini-key"
   ```
   
---

## 📦 Manual Installation in Chrome (Unpacked Extension)

To deploy TabAudit inside your personal Chrome/Chromium browser workspace (e.g., Brave, Edge, Opera, Chrome):

1. **Build the Assets**: Build the production bundle containing compiled extension code and static assets:
   ```bash
   npm run build
   ```
2. **Locate the Build Target**: Once finished, a standard `dist/` directory will be produced carrying:
   - `manifest.json`
   - `background.js` (the silent tab lifecycle manager)
   - `index.html` (the standalone React popup bundle)
3. **Load Unpacked in Chromium**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Toggle the **Developer mode** switch (top-right corner).
   - Click the **Load unpacked** button (top-left corner).
   - Select the built `dist/` directory.
4. **Interactive Action**: Your TabAudit icon will appear in Chrome's extension pin rail. Open it anytime to manager your tabs.

---

## 🛠️ How to Build from Source

Install dependencies of full-stack client-server environment and run live or test:

```bash
# Install NPM modules
npm install

# Run Vite dev server + Express proxy backend
npm run dev

# Run standard linter for typing validation
npm run lint

# Compile production-ready builds
npm run build
```
