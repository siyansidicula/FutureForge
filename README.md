# FutureForge AI 🚀

> **AI-powered career roadmap advisor** built with Python Flask and IBM watsonx.ai (Granite 3 8B Instruct). Students describe their interests, skill level, and goals in a natural chat conversation — the AI generates a personalised learning roadmap, course recommendations, project ideas, certifications, and a weekly study plan.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🤖 IBM Granite AI | `ibm/granite-3-8b-instruct` via watsonx.ai |
| 💬 Conversational UX | Multi-turn chat with session memory |
| 🗺️ Personalised Roadmap | Phases, milestones, weekly plans |
| 📚 Course Recommendations | Free-first (freeCodeCamp, fast.ai, CS50…) |
| 🛠️ Project Ideas | 3 projects ordered by complexity |
| 🏆 Certifications | Industry-aligned certs per career goal |
| 🎨 Dark / Light mode | Persisted in `localStorage` |
| 📱 Mobile responsive | Bootstrap 5.3, fluid layout |
| 📤 Export | Download conversation as Markdown |
| ⚙️ AGENT_INSTRUCTIONS | One-block customisation — no code changes needed |

---

## 🗂️ Project Structure

```
FutureForge/
├── app.py                  # Flask backend + AGENT_INSTRUCTIONS
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variable template
├── .env                    # Your secrets (git-ignored)
├── templates/
│   └── index.html          # Single-page application shell
└── static/
    ├── css/
    │   └── style.css       # Custom styles + animations
    └── js/
        └── app.js          # Vanilla JS chat engine
```

---

## ⚡ Quick Start (Local)

### 1 — Prerequisites

- Python 3.11+
- An **IBM Cloud** account → [cloud.ibm.com](https://cloud.ibm.com)
- A **watsonx.ai** project → [dataplatform.cloud.ibm.com](https://dataplatform.cloud.ibm.com)

### 2 — Clone / download

```bash
git clone https://github.com/your-org/futureforge-ai.git
cd futureforge-ai
```

### 3 — Create a virtual environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 4 — Install dependencies

```bash
pip install -r requirements.txt
```

### 5 — Configure credentials

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```dotenv
IBM_API_KEY=your_ibm_cloud_api_key_here
WATSONX_PROJECT_ID=your_watsonx_project_id_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
FLASK_SECRET_KEY=some-long-random-string
FLASK_ENV=development
```

**Where to find these values:**

| Variable | Where to get it |
|---|---|
| `IBM_API_KEY` | IBM Cloud → Manage → Access → API keys → **Create** |
| `WATSONX_PROJECT_ID` | watsonx.ai → your project → **Manage** tab → Project ID |
| `WATSONX_URL` | Region endpoint — default is `us-south.ml.cloud.ibm.com` |

### 6 — Run

```bash
python app.py
```

Visit **http://localhost:5000** in your browser.

---

## 🎛️ Customising the AI (AGENT_INSTRUCTIONS)

All AI behaviour is controlled by a single constant at the top of [`app.py`](app.py):

```python
AGENT_INSTRUCTIONS = """
## Identity
You are FutureForge AI...

## Coaching Style
...

## Information Gathering (Phase 1)
...

## Roadmap Format (Phase 2)
...

## Recommendation Strategy
...

## Safety & Boundaries
...
"""
```

**Examples of easy customisations:**

- **Change the persona name** → edit the `## Identity` section.
- **Add a domain focus** → e.g. "Always prioritise cloud-native skills".
- **Change language** → add "Always respond in Spanish" to `## Coaching Style`.
- **Restrict topics** → add items to `## Safety & Boundaries`.
- **Adjust roadmap length** → change "3–6 month" in `## Roadmap Format`.

---

## 🚀 Deployment

### Option A — IBM Code Engine (recommended)

```bash
# 1. Build image
docker build -t futureforge-ai .

# 2. Push to IBM Container Registry
ibmcloud cr push us.icr.io/<namespace>/futureforge-ai:latest

# 3. Deploy to Code Engine
ibmcloud ce application create \
  --name futureforge-ai \
  --image us.icr.io/<namespace>/futureforge-ai:latest \
  --env IBM_API_KEY=<key> \
  --env WATSONX_PROJECT_ID=<id> \
  --env FLASK_SECRET_KEY=<secret>
```

### Option B — Docker (any cloud / VPS)

Create a `Dockerfile`:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]
```

```bash
docker build -t futureforge-ai .
docker run -p 5000:5000 --env-file .env futureforge-ai
```

### Option C — Heroku / Railway / Render

1. Add a `Procfile`:
   ```
   web: gunicorn app:app
   ```
2. Set environment variables in the platform dashboard.
3. Push your code.

### Option D — IBM Cloud Foundry

```bash
ibmcloud cf push futureforge-ai \
  --buildpack python_buildpack \
  -m 512M \
  --no-start

ibmcloud cf set-env futureforge-ai IBM_API_KEY "<your-key>"
ibmcloud cf set-env futureforge-ai WATSONX_PROJECT_ID "<your-id>"
ibmcloud cf set-env futureforge-ai FLASK_SECRET_KEY "<random>"
ibmcloud cf start futureforge-ai
```

---

## 🔒 Security Notes

- Never commit `.env` to git — it is listed in `.gitignore` below.
- Rotate your IBM API key regularly.
- In production set `FLASK_ENV=production` to disable debug mode.
- For multi-user production deployments replace the default Flask session with a Redis-backed session store (e.g. `flask-session`).

### Recommended `.gitignore`

```gitignore
.env
__pycache__/
*.pyc
venv/
.venv/
*.egg-info/
dist/
.DS_Store
```

---

## 🧪 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Serve the SPA |
| `/api/chat` | POST | Send `{"message":"…"}`, get `{"reply":"…","conversation":[…]}` |
| `/api/reset` | POST | Clear session history |
| `/api/status` | GET | Health-check & credential validation |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, Flask 3.0, Flask-CORS |
| AI | IBM watsonx.ai, Granite 3 8B Instruct |
| Frontend | Bootstrap 5.3, Bootstrap Icons, Marked.js |
| Deployment | Gunicorn, Docker, IBM Code Engine |

---

## 📄 License

MIT — see [LICENSE](LICENSE).
