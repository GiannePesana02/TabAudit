# TabAudit

For people with 50+ tabs open and zero intention of closing them.

TabAudit is a browser extension built for tab hoarders, research rabbit holes, and "I'll come back to this later" moments. Instead of forcing you into another workspace, dashboard, or weird sidebar system, it works with the browser you already use.

No replacing your workflow. No giant productivity system. Just help cleaning up the chaos.

---

## Why this exists

We all know how it starts:

- Open one tab
- Open another
- "This might be useful later"
- Suddenly there are 73 tabs and your laptop sounds like it's preparing for takeoff

Too many tabs creates two problems:

**Your brain suffers**
- Tab titles shrink into tiny unreadable rectangles
- Projects get mixed together
- You forget why half the tabs even exist

**Your computer suffers**
- Background tabs quietly eat RAM
- Laptop battery disappears
- Everything starts feeling slower

TabAudit exists to fix that without making you relearn how browsers work.

---

## How it works

Instead of replacing your browser experience, TabAudit acts more like an assistant sitting quietly in the toolbar.

You still use:

- normal tabs
- native tab groups
- right-click menus
- your existing habits

When you want help, TabAudit looks at your messy, unorganized tabs and cleans things up.

Only when *you* ask.

---

## Features

### Smart Tab Grouping

Hit organize and TabAudit scans your current tabs.

Already-grouped tabs are left alone. Loose tabs get analyzed and grouped by context and topic.

Research tabs stay together.

Random one-off tabs don't get shoved somewhere they don't belong.

Because not everything with the same website automatically belongs together.

---

### Session Archive

Finished with a project for now?

Archive it.

TabAudit saves the titles and URLs locally, closes the active tabs, and gives your browser room to breathe.

Need them later?

Restore the whole session with one click.

---

### Standby Saver

For extreme tab goblins.

Tabs sitting untouched for long periods can be unloaded from memory while staying visible in your tab bar.

They disappear from RAM, not from existence.

Click them again and they wake back up.

---

### Local-First Privacy

No accounts.

No cloud sync.

No servers storing your browsing data.

Everything stays inside your browser:

- saved sessions
- settings
- metadata
- API keys

Your tabs stay your business.

---

## Installation

Install dependencies:

```bash
npm install
```

Build the extension:

```bash
npm run build
```

---

## Load into your browser

1. Open:

```
chrome://extensions
```

or

```
brave://extensions
```

2. Enable **Developer Mode**
3. Click **Load unpacked**
4. Select the generated `dist` folder
5. Pin TabAudit to your toolbar

Done.

---

## API Key Setup

TabAudit connects directly from your browser using your own API key.

To set it up:

1. Generate a key from Google AI Studio
2. Open the extension popup
3. Click the settings icon
4. Paste your key

The key stays stored locally in your browser.

---

## License

MIT

Built by Gianne Pesaña
