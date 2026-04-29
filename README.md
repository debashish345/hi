# 📚 Interview Resources

A curated, community-driven interview prep hub — hosted on GitHub Pages. Filter by topic, bookmark resources, track your reading progress, join discussions, and practice interview questions. All content is driven by a single JSON file, making contributions easy via Pull Requests.

**🌐 Live Site:** `https://<your-username>.github.io/<repo-name>/`

---

## ✨ Features

| Feature | Description |
|---|---|
| **📊 Excel-Driven Data** | All resources live in `data/resources.json` — edit it like a spreadsheet |
| **↩ Last Read** | Automatically remembers the last resource you opened |
| **🔖 Bookmarks** | Save resources for later; persisted in browser localStorage |
| **✨ New Tag** | Resources marked `"isNew": true` and added within the last 30 days show a **New** badge |
| **🔥 Hot Tag** | Resources marked `"isHot": true` show a **Hot** badge |
| **💬 Discussion** | Per-resource comment threads (repo entries via JSON, personal via localStorage) |
| **❓ Interview Q&A** | Curated interview questions per resource (JSON) + personal notes (localStorage) |
| **✅ Read Tracking** | Mark resources as read; progress bar shows completion % |
| **📥 Export / Import** | Download your full progress as JSON; re-import on any device |
| **🔍 Search & Filter** | Instant search + category filter chips |

---

## 🗂️ Folder Structure

```
interview-resources/
│
├── index.html                  # Main page (references CSS + JS)
├── css/
│   └── styles.css              # All styles — separated from HTML
├── js/
│   └── app.js                  # All logic — fetches JSON, renders UI
├── data/
│   └── resources.json          # ⭐ THE DATA FILE — edit this to add content
│
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions → auto-deploys to Pages on push
│
└── README.md                   # This file
```

---

## 🚀 Hosting on GitHub Pages

### Step 1 — Create the repo

```bash
# Clone or create your repo
git init interview-resources
cd interview-resources
# Copy all files here
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

### Step 2 — Enable GitHub Pages

1. Go to your repo on GitHub
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Source**, select **GitHub Actions**
4. Push any change to `main` — the workflow will deploy automatically

### Step 3 — Access your site

Your site will be live at:
```
https://<your-username>.github.io/<repo-name>/
```

> **Note:** First deploy takes ~1–2 minutes. Check the **Actions** tab for progress.

---

## ✏️ Adding / Editing Resources (Data File)

All content is in **`data/resources.json`**. The structure is:

```json
{
  "categories": [
    {
      "id": "dsa",
      "label": "DSA / Algorithms",
      "icon": "🧮",
      "iconBg": "#f0fdf4",
      "tagBg": "#f0fdf4",
      "tagColor": "#166534",
      "resources": [
        {
          "id": "dsa-007",           // Unique ID — never reuse
          "name": "Backtracking Guide",
          "desc": "N-Queens, Sudoku, permutations — patterns and templates.",
          "href": "dsa/backtracking.md",  // relative path or full URL
          "type": "md",              // file extension shown on card
          "isNew": true,             // shows ✨ New badge (auto-expires after 30 days)
          "isHot": false,            // shows 🔥 Hot badge
          "addedDate": "2025-07-01", // YYYY-MM-DD — used for New badge expiry
          "discussions": [           // Repo-level discussions (everyone sees these)
            {
              "id": "d1",
              "author": "alice",
              "text": "Great resource for recursion practice!",
              "date": "2025-07-05"
            }
          ],
          "interviewQuestions": [    // Questions shown in the ❓ Q&A panel
            "Explain the backtracking template.",
            "How does backtracking differ from brute force?"
          ]
        }
      ]
    }
  ]
}
```

### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | ✅ | Unique identifier, e.g. `dsa-007`. Never reuse. |
| `name` | string | ✅ | Card title |
| `desc` | string | ✅ | Short description shown on card |
| `href` | string | ✅ | Link — relative path or full `https://` URL |
| `type` | string | ✅ | File extension shown in footer (e.g. `md`, `pdf`, `html`) |
| `isNew` | boolean | ✅ | `true` = show ✨ New badge (only if within 30 days of `addedDate`) |
| `isHot` | boolean | ✅ | `true` = show 🔥 Hot badge permanently |
| `addedDate` | string | ✅ | `YYYY-MM-DD` — used to auto-expire the New badge |
| `discussions` | array | ✅ | Pre-seeded discussion comments (empty `[]` is fine) |
| `interviewQuestions` | array | ✅ | List of question strings (empty `[]` is fine) |

---

## 🤝 Contributing via Pull Request

All content changes go through PRs so the community can review.

### Adding a New Resource

1. **Fork** the repository
2. Edit `data/resources.json` — add your entry in the correct category
3. Use a new unique `id` (pattern: `<category-prefix>-<3-digit-number>`, e.g. `dsa-007`)
4. Set `"isNew": true` and `"addedDate"` to today's date
5. Commit and open a **Pull Request** with title: `feat: add <resource name>`

### Adding a Discussion (permanent)

In your PR, add a comment object to the `discussions` array of the resource:

```json
{
  "id": "d2",
  "author": "your-github-handle",
  "text": "Your comment here.",
  "date": "2025-07-10"
}
```

> 💡 **Local-only comments** can be added directly in the UI — they're saved to your browser's localStorage and won't appear for others.

### Adding Interview Questions (permanent)

In your PR, add your question to the `interviewQuestions` array:

```json
"interviewQuestions": [
  "Existing question here.",
  "Your new question here."
]
```

### PR Title Conventions

| Type | Format |
|---|---|
| New resource | `feat: add <resource name>` |
| New discussion | `discussion: <resource name> — <short description>` |
| New interview question | `iq: <resource name> — add question` |
| Bug fix | `fix: <brief description>` |
| Category update | `chore: update <category> metadata` |

---

## 💾 Progress Storage

| Storage Type | What's Stored | Where |
|---|---|---|
| **localStorage** (browser) | Bookmarks, read status, last read, local comments | Your browser only |
| **JSON export** | Full copy of above | File you download |
| **JSON import** | Restores from exported file | Any browser/device |
| **`data/resources.json`** | Repo discussions + interview questions | GitHub — visible to everyone |

### Export your progress

Click the **Export** button in the header → saves `interview-resources-progress.json`

### Import on another device

Click **Import** → select your exported file → all bookmarks, read status, and local comments are restored.

---

## 🏷️ Badge Reference

| Badge | JSON Field | Behaviour |
|---|---|---|
| ✨ **New** | `"isNew": true` | Shown only if `addedDate` is within the last 30 days |
| 🔥 **Hot** | `"isHot": true` | Always shown while set to `true` |
| 🔖 **Bookmarked** | User action | Gold card border; stored in localStorage |
| ✅ **Read** | User action | Tracked in localStorage; counted in progress bar |

---

## 🛠️ Local Development

No build step needed — it's plain HTML/CSS/JS.

```bash
# Option 1: Python
python3 -m http.server 8080

# Option 2: Node.js
npx serve .

# Option 3: VS Code
# Install "Live Server" extension → right-click index.html → Open with Live Server
```

Then open `http://localhost:8080` in your browser.

> ⚠️ **Must use a local server** — `fetch('data/resources.json')` won't work with `file://` protocol.

---

## 📄 License

MIT — fork it, adapt it, share it. Contributions welcome!
