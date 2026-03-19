import { useState, useRef, useEffect } from "react";

// ============================================================
// SUPABASE CONFIG
// ============================================================
const SUPABASE_URL = "https://kgsqqfvmxbcgvghdlsnz.supabase.co";
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ============================================================
// HELPERS
// ============================================================
async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function supabaseStorageUpload(bucket, filename, file) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}/${filename}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": file.type,
      },
      body: file,
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filename}`;
}

async function claudeChat(messages, system) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 2000,
      system,
      messages,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.content[0].text;
}

// ============================================================
// STYLES
// ============================================================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0a;
    --bg2: #111111;
    --bg3: #1a1a1a;
    --bg4: #222222;
    --border: rgba(255,255,255,0.08);
    --border-hover: rgba(255,255,255,0.16);
    --accent: #c8ff00;
    --accent2: #ff6b35;
    --text: #f0f0f0;
    --text2: #888888;
    --text3: #555555;
    --font-display: 'DM Serif Display', serif;
    --font-mono: 'DM Mono', monospace;
    --radius: 4px;
    --radius-lg: 8px;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.6;
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* PASSWORD GATE */
  .gate {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 32px;
    padding: 40px;
    background: var(--bg);
    position: relative;
    overflow: hidden;
  }
  .gate::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 60% 40% at 50% 50%, rgba(200,255,0,0.04) 0%, transparent 70%);
    pointer-events: none;
  }
  .gate-logo {
    font-family: var(--font-display);
    font-size: clamp(42px, 8vw, 72px);
    color: var(--text);
    letter-spacing: -2px;
    text-align: center;
    line-height: 1;
  }
  .gate-logo span { color: var(--accent); }
  .gate-tagline {
    color: var(--text2);
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    text-align: center;
  }
  .gate-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    max-width: 320px;
  }
  .gate-input {
    background: var(--bg3);
    border: 1px solid var(--border);
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 13px;
    padding: 14px 16px;
    border-radius: var(--radius);
    outline: none;
    transition: border-color 0.2s;
    text-align: center;
    letter-spacing: 3px;
  }
  .gate-input:focus { border-color: var(--accent); }
  .gate-input::placeholder { letter-spacing: 1px; color: var(--text3); }
  .gate-btn {
    background: var(--accent);
    color: #000;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 14px;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .gate-btn:hover { opacity: 0.85; }
  .gate-error { color: var(--accent2); font-size: 11px; text-align: center; }

  /* APP SHELL */
  .app {
    display: grid;
    grid-template-columns: 220px 1fr;
    grid-template-rows: 52px 1fr;
    min-height: 100vh;
    max-height: 100vh;
    overflow: hidden;
  }

  /* TOPBAR */
  .topbar {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    z-index: 10;
  }
  .topbar-logo {
    font-family: var(--font-display);
    font-size: 20px;
    letter-spacing: -0.5px;
  }
  .topbar-logo span { color: var(--accent); }
  .topbar-meta {
    display: flex;
    align-items: center;
    gap: 16px;
    color: var(--text2);
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .mode-pill {
    padding: 4px 10px;
    border-radius: 20px;
    border: 1px solid var(--border);
    font-size: 10px;
    letter-spacing: 1.5px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .mode-pill.active { background: var(--accent); color: #000; border-color: var(--accent); }

  /* SIDEBAR */
  .sidebar {
    border-right: 1px solid var(--border);
    background: var(--bg);
    overflow-y: auto;
    padding: 16px 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sidebar-section {
    padding: 8px 16px 4px;
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text3);
  }
  .sidebar-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 16px;
    cursor: pointer;
    color: var(--text2);
    font-size: 12px;
    transition: all 0.15s;
    border-left: 2px solid transparent;
  }
  .sidebar-item:hover { color: var(--text); background: var(--bg3); }
  .sidebar-item.active {
    color: var(--accent);
    border-left-color: var(--accent);
    background: rgba(200,255,0,0.04);
  }
  .sidebar-icon { font-size: 14px; width: 18px; text-align: center; }

  /* MAIN */
  .main {
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: var(--bg);
  }

  /* PANEL */
  .panel {
    flex: 1;
    overflow-y: auto;
    padding: 32px;
  }
  .panel-title {
    font-family: var(--font-display);
    font-size: 28px;
    letter-spacing: -0.5px;
    margin-bottom: 6px;
  }
  .panel-subtitle {
    color: var(--text2);
    font-size: 12px;
    margin-bottom: 32px;
  }

  /* CARDS */
  .card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
    margin-bottom: 16px;
    transition: border-color 0.2s;
  }
  .card:hover { border-color: var(--border-hover); }
  .card-title {
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text2);
    margin-bottom: 12px;
  }

  /* UPLOAD ZONE */
  .upload-zone {
    border: 1px dashed var(--border);
    border-radius: var(--radius-lg);
    padding: 40px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text2);
  }
  .upload-zone:hover, .upload-zone.drag { border-color: var(--accent); color: var(--text); background: rgba(200,255,0,0.02); }
  .upload-zone-icon { font-size: 32px; margin-bottom: 12px; }
  .upload-zone-text { font-size: 12px; margin-bottom: 4px; }
  .upload-zone-hint { font-size: 10px; color: var(--text3); }

  /* BUTTON */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-radius: var(--radius);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }
  .btn-primary { background: var(--accent); color: #000; }
  .btn-primary:hover { opacity: 0.85; }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-ghost { background: transparent; color: var(--text2); border: 1px solid var(--border); }
  .btn-ghost:hover { color: var(--text); border-color: var(--border-hover); }
  .btn-danger { background: transparent; color: var(--accent2); border: 1px solid rgba(255,107,53,0.3); }
  .btn-danger:hover { background: rgba(255,107,53,0.1); }

  /* INPUT */
  .input {
    background: var(--bg3);
    border: 1px solid var(--border);
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 12px;
    padding: 10px 14px;
    border-radius: var(--radius);
    outline: none;
    width: 100%;
    transition: border-color 0.2s;
  }
  .input:focus { border-color: var(--accent); }
  .input::placeholder { color: var(--text3); }

  /* SELECT */
  .select {
    background: var(--bg3);
    border: 1px solid var(--border);
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 12px;
    padding: 10px 14px;
    border-radius: var(--radius);
    outline: none;
    cursor: pointer;
    transition: border-color 0.2s;
  }
  .select:focus { border-color: var(--accent); }

  /* TAG */
  .tag {
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    border-radius: 20px;
    font-size: 10px;
    letter-spacing: 1px;
    border: 1px solid var(--border);
    color: var(--text2);
    background: var(--bg3);
    margin: 2px;
  }
  .tag.accent { border-color: rgba(200,255,0,0.3); color: var(--accent); background: rgba(200,255,0,0.06); }
  .tag.orange { border-color: rgba(255,107,53,0.3); color: var(--accent2); background: rgba(255,107,53,0.06); }

  /* CHAT */
  .chat-wrap {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  .chat-header {
    padding: 20px 28px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .chat-header-title {
    font-family: var(--font-display);
    font-size: 22px;
  }
  .chat-header-title span { color: var(--accent); }
  .chat-mode-toggle {
    display: flex;
    gap: 8px;
  }
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .msg {
    display: flex;
    gap: 14px;
    max-width: 85%;
    animation: fadeUp 0.25s ease;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .msg.user { flex-direction: row-reverse; align-self: flex-end; }
  .msg-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
    background: var(--bg3);
    border: 1px solid var(--border);
  }
  .msg.assistant .msg-avatar { background: rgba(200,255,0,0.1); border-color: rgba(200,255,0,0.2); }
  .msg-bubble {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 14px 16px;
    font-size: 13px;
    line-height: 1.7;
    white-space: pre-wrap;
  }
  .msg.user .msg-bubble { background: var(--bg3); }
  .msg.assistant .msg-bubble { border-color: rgba(200,255,0,0.12); }

  .chat-input-area {
    padding: 16px 28px 20px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .chat-input-row {
    display: flex;
    gap: 10px;
    align-items: flex-end;
  }
  .chat-textarea {
    flex: 1;
    background: var(--bg2);
    border: 1px solid var(--border);
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 13px;
    padding: 12px 16px;
    border-radius: var(--radius-lg);
    outline: none;
    resize: none;
    min-height: 48px;
    max-height: 160px;
    line-height: 1.6;
    transition: border-color 0.2s;
  }
  .chat-textarea:focus { border-color: var(--accent); }
  .chat-textarea::placeholder { color: var(--text3); }
  .chat-send-btn {
    background: var(--accent);
    color: #000;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-lg);
    border: none;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: opacity 0.2s;
  }
  .chat-send-btn:hover { opacity: 0.85; }
  .chat-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* TYPING INDICATOR */
  .typing {
    display: flex;
    gap: 4px;
    padding: 6px 0;
    align-items: center;
  }
  .typing span {
    width: 6px; height: 6px;
    background: var(--accent);
    border-radius: 50%;
    animation: bounce 1s infinite;
    opacity: 0.6;
  }
  .typing span:nth-child(2) { animation-delay: 0.15s; }
  .typing span:nth-child(3) { animation-delay: 0.3s; }
  @keyframes bounce {
    0%,60%,100% { transform: translateY(0); }
    30% { transform: translateY(-5px); }
  }

  /* KNOWLEDGE BASE */
  .kb-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }
  .kb-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 16px;
    transition: border-color 0.2s;
  }
  .kb-card:hover { border-color: var(--border-hover); }
  .kb-card-source {
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--text3);
    margin-bottom: 8px;
  }
  .kb-card-text {
    font-size: 12px;
    color: var(--text2);
    line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .kb-card-tags { margin-top: 10px; }

  /* IMAGE GRID */
  .img-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }
  .img-card {
    aspect-ratio: 1;
    border-radius: var(--radius-lg);
    overflow: hidden;
    position: relative;
    border: 1px solid var(--border);
    cursor: pointer;
    transition: border-color 0.2s;
  }
  .img-card:hover { border-color: var(--border-hover); }
  .img-card img { width: 100%; height: 100%; object-fit: cover; }
  .img-card-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.7);
    opacity: 0;
    transition: opacity 0.2s;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 12px;
    gap: 4px;
  }
  .img-card:hover .img-card-overlay { opacity: 1; }
  .img-card-tags-overlay { display: flex; flex-wrap: wrap; gap: 3px; }

  /* STATUS */
  .status-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%,100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* PROGRESS */
  .progress-bar {
    height: 2px;
    background: var(--bg3);
    border-radius: 2px;
    overflow: hidden;
    margin-top: 8px;
  }
  .progress-fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.3s;
  }

  /* SCROLLBAR */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--bg4); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--text3); }

  /* TOAST */
  .toast-wrap {
    position: fixed;
    bottom: 24px;
    right: 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 999;
  }
  .toast {
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 16px;
    font-size: 12px;
    animation: slideIn 0.2s ease;
    max-width: 280px;
  }
  .toast.success { border-color: rgba(200,255,0,0.3); color: var(--accent); }
  .toast.error { border-color: rgba(255,107,53,0.3); color: var(--accent2); }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  /* STATS ROW */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 28px;
  }
  .stat-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 16px;
  }
  .stat-value {
    font-family: var(--font-display);
    font-size: 32px;
    color: var(--accent);
    line-height: 1;
    margin-bottom: 4px;
  }
  .stat-label {
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text3);
  }

  /* DIVIDER */
  .divider {
    height: 1px;
    background: var(--border);
    margin: 24px 0;
  }

  /* EMPTY STATE */
  .empty {
    text-align: center;
    padding: 60px 20px;
    color: var(--text3);
  }
  .empty-icon { font-size: 40px; margin-bottom: 16px; }
  .empty-text { font-size: 13px; color: var(--text2); margin-bottom: 8px; }
  .empty-hint { font-size: 11px; }

  /* LABEL */
  .label {
    display: block;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text3);
    margin-bottom: 6px;
  }

  /* FLEX UTILS */
  .flex { display: flex; }
  .flex-col { flex-direction: column; }
  .gap-8 { gap: 8px; }
  .gap-12 { gap: 12px; }
  .gap-16 { gap: 16px; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .mt-8 { margin-top: 8px; }
  .mt-16 { margin-top: 16px; }
  .mt-24 { margin-top: 24px; }
  .mb-16 { margin-bottom: 16px; }
  .w-full { width: 100%; }
`;

// ============================================================
// TOAST HOOK
// ============================================================
function useToast() {
  const [toasts, setToasts] = useState([]);
  const toast = (msg, type = "success") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };
  return { toasts, toast };
}

// ============================================================
// PASSWORD GATE
// ============================================================
function PasswordGate({ onUnlock }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const handle = (e) => {
    e.preventDefault();
    if (pw === "deckbot2025") {
      onUnlock();
    } else {
      setError("Wrong password. Try again.");
      setPw("");
    }
  };

  return (
    <div className="gate">
      <div>
        <div className="gate-logo">
          DECK<span>DADDY</span>
        </div>
        <div className="gate-tagline" style={{ marginTop: 8 }}>
          Strategic Intelligence · The 25s
        </div>
      </div>
      <form className="gate-form" onSubmit={handle}>
        <input
          className="gate-input"
          type="password"
          placeholder="Enter password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoFocus
        />
        {error && <div className="gate-error">{error}</div>}
        <button className="gate-btn" type="submit">
          Enter →
        </button>
      </form>
    </div>
  );
}

// ============================================================
// CHAT PANEL
// ============================================================
function ChatPanel({ knowledgeChunks, mode, setMode }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hey. I'm Deck Daddy — your strategic intelligence co-pilot.\n\nI've got access to The 25s knowledge base and I'm here to help you build killer strategy.\n\nTell me about your brief — client, category, challenge, whatever you've got.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const buildSystemPrompt = () => {
    const knowledgeSummary =
      knowledgeChunks.length > 0
        ? `\n\nKNOWLEDGE BASE (${knowledgeChunks.length} chunks from The 25s past decks):\n${knowledgeChunks
            .slice(0, 15)
            .map((c) => `[${c.source || "Unknown"}] ${c.content}`)
            .join("\n\n")}`
        : "\n\nKNOWLEDGE BASE: Empty — no decks uploaded yet.";

    const modeContext =
      mode === "creative"
        ? "Focus on: territories, moodboards, visual directions, semiotics, brand worlds, tonality, color stories, imagery directions. Be evocative and inspiring."
        : "Focus on: consumer insights, market context, trend analysis, strategic setups, brand positioning, audience profiling. Be sharp and data-informed.";

    return `You are Deck Daddy — a strategic AI co-pilot for The 25s, a suit-led brand and packaging design agency in Shanghai. You help account leads (suits) build strategy decks.

Current mode: ${mode === "creative" ? "CREATIVE STRATEGY" : "UPFRONT STRATEGY"}
${modeContext}

Your personality: Sharp, direct, strategic, a little bit cocky but always right. You speak like a seasoned strategist — concise, punchy, no fluff.

When generating territories (Classic EFT template): create 3 distinct territories:
- Territory 1: Emotional (inspired by consumer truth)
- Territory 2: Functional (inspired by brand truth)  
- Territory 3: Revolutionary (inspired by relevant trend)

Each territory should have: a name, a 1-line concept, 3-4 keywords, and a visual direction description.

When generating Consumer Insight territories: structure as Insight → How brand solves it → Territory name.
${knowledgeSummary}

Draw from The 25s knowledge base when relevant. Cite sources when you do. Always be actionable.`;
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await claudeChat(history, buildSystemPrompt());
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Error: ${e.message}. Check your API key.`,
        },
      ]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="chat-wrap">
      <div className="chat-header">
        <div>
          <div className="chat-header-title">
            Deck <span>Daddy</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
            {knowledgeChunks.length} knowledge chunks loaded ·{" "}
            {mode === "creative" ? "Creative Strategy" : "Upfront Strategy"}{" "}
            mode
          </div>
        </div>
        <div className="chat-mode-toggle">
          <div
            className={`mode-pill ${mode === "upfront" ? "active" : ""}`}
            onClick={() => setMode("upfront")}
          >
            Upfront
          </div>
          <div
            className={`mode-pill ${mode === "creative" ? "active" : ""}`}
            onClick={() => setMode("creative")}
          >
            Creative
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`msg ${msg.role}`}>
            <div className="msg-avatar">
              {msg.role === "assistant" ? "🧠" : "👤"}
            </div>
            <div className="msg-bubble">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="msg assistant">
            <div className="msg-avatar">🧠</div>
            <div className="msg-bubble">
              <div className="typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        <div
          style={{
            fontSize: 10,
            color: "var(--text3)",
            letterSpacing: "1px",
            marginBottom: 8,
            textTransform: "uppercase",
          }}
        >
          {mode === "creative"
            ? "Try: Generate 3 territories for a premium skincare brand targeting Gen Z"
            : "Try: Build a consumer insight setup for a functional beverage launch in China"}
        </div>
        <div className="chat-input-row">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder="Tell me about your brief..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            style={{ height: "auto" }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
            }}
          />
          <button
            className="chat-send-btn"
            onClick={send}
            disabled={loading || !input.trim()}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// KNOWLEDGE BASE PANEL
// ============================================================
function KnowledgePanel({ chunks, setChunks, toast }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [drag, setDrag] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [client, setClient] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const fileRef = useRef(null);

  const clients = [...new Set(chunks.map((c) => c.client).filter(Boolean))];

  const extractTextFromPDF = async (file) => {
    // Simple extraction — reads file as text for now
    // In production, use a PDF parsing library or server-side extraction
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        // Basic text extraction from PDF binary
        const text = e.target.result;
        const cleaned = text
          .replace(/[^\x20-\x7E\n]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        resolve(cleaned.substring(0, 8000));
      };
      reader.readAsText(file);
    });
  };

  const processWithClaude = async (rawText, fileName) => {
    const prompt = `You are extracting strategic knowledge from a brand/packaging design deck for The 25s agency knowledge base.

Extract ALL strategic insights from this content and return them as a JSON array. Each item should be:
{
  "content": "the strategic insight, territory, keyword cluster, consumer truth, visual direction, or concept — written clearly",
  "type": "territory | insight | keyword | visual_direction | brand_truth | concept",
  "tags": ["tag1", "tag2", "tag3"]
}

Extract at least 5-15 chunks. Be thorough. Focus on: territories, consumer insights, brand truths, visual directions, keywords, strategic concepts.

CONTENT:
${rawText}

Return ONLY the JSON array, no other text.`;

    const res = await claudeChat(
      [{ role: "user", content: prompt }],
      "You are a strategic knowledge extractor for a design agency."
    );

    try {
      const clean = res.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    } catch {
      return [{ content: rawText.substring(0, 500), type: "concept", tags: [] }];
    }
  };

  const handleUpload = async (file) => {
    if (!file || file.type !== "application/pdf") {
      toast("Please upload a PDF file", "error");
      return;
    }
    if (!deckName.trim()) {
      toast("Please enter a deck name first", "error");
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      // Upload to Supabase storage
      const filename = `${Date.now()}_${file.name}`;
      setProgress(25);

      // Extract text
      const rawText = await extractTextFromPDF(file);
      setProgress(50);

      // Process with Claude
      toast("Deck Daddy is reading your deck...", "success");
      const extractedChunks = await processWithClaude(rawText, file.name);
      setProgress(80);

      // Save to Supabase
      const newChunks = extractedChunks.map((chunk) => ({
        ...chunk,
        source: deckName.trim(),
        client: client.trim() || "Unknown",
        created_at: new Date().toISOString(),
      }));

      for (const chunk of newChunks) {
        await supabaseFetch("/projects", {
          method: "POST",
          body: JSON.stringify(chunk),
        });
      }

      setProgress(100);
      setChunks((prev) => [...prev, ...newChunks]);
      toast(`Extracted ${newChunks.length} knowledge chunks from ${file.name}`, "success");
      setDeckName("");
      setClient("");
    } catch (e) {
      toast(`Upload failed: ${e.message}`, "error");
    }

    setUploading(false);
    setProgress(0);
  };

  const filtered = filterClient
    ? chunks.filter((c) => c.client === filterClient)
    : chunks;

  return (
    <div className="panel">
      <div className="panel-title">Knowledge Base</div>
      <div className="panel-subtitle">
        Upload past decks — Deck Daddy extracts and stores all strategic intelligence
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{chunks.length}</div>
          <div className="stat-label">Knowledge Chunks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{clients.length}</div>
          <div className="stat-label">Clients</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {[...new Set(chunks.map((c) => c.source).filter(Boolean))].length}
          </div>
          <div className="stat-label">Decks Uploaded</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Upload New Deck</div>
        <div className="flex gap-12 mb-16">
          <div style={{ flex: 1 }}>
            <label className="label">Deck Name</label>
            <input
              className="input"
              placeholder="e.g. Nestle Milo Pitch 2024"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Client</label>
            <input
              className="input"
              placeholder="e.g. Nestle"
              value={client}
              onChange={(e) => setClient(e.target.value)}
            />
          </div>
        </div>

        <div
          className={`upload-zone ${drag ? "drag" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            handleUpload(e.dataTransfer.files[0]);
          }}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            style={{ display: "none" }}
            onChange={(e) => handleUpload(e.target.files[0])}
          />
          <div className="upload-zone-icon">📄</div>
          <div className="upload-zone-text">
            {uploading ? "Processing..." : "Drop PDF here or click to upload"}
          </div>
          <div className="upload-zone-hint">PDF files only · Max 50MB</div>
          {uploading && (
            <div className="progress-bar" style={{ marginTop: 16, width: "100%" }}>
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </div>

      <div className="divider" />

      <div className="flex items-center justify-between mb-16">
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>
          Stored Knowledge
        </div>
        {clients.length > 0 && (
          <select
            className="select"
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
          >
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🧠</div>
          <div className="empty-text">No knowledge yet</div>
          <div className="empty-hint">Upload a deck to start building the brain</div>
        </div>
      ) : (
        <div className="kb-grid">
          {filtered.map((chunk, i) => (
            <div key={i} className="kb-card">
              <div className="kb-card-source">
                {chunk.source || "Unknown"} · {chunk.client || "—"}
              </div>
              <div className="kb-card-text">{chunk.content}</div>
              <div className="kb-card-tags">
                {chunk.type && <span className="tag accent">{chunk.type}</span>}
                {(chunk.tags || []).slice(0, 3).map((t, j) => (
                  <span key={j} className="tag">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// IMAGE REPOSITORY PANEL
// ============================================================
function ImagesPanel({ images, setImages, toast }) {
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [filterTag, setFilterTag] = useState("");
  const fileRef = useRef(null);

  const allTags = [...new Set(images.flatMap((img) => img.tags || []))];

  const autoTag = async (file, url) => {
    // Ask Claude to describe/tag the image based on filename + context
    const prompt = `You are tagging a reference image for a brand and packaging design agency called The 25s.

Image filename: ${file.name}

Generate 5-8 relevant tags for this image that would help strategists find it. Think about: visual style, mood, category, color palette, design direction, cultural context.

Return ONLY a JSON array of tags like: ["minimal", "luxury", "dark palette", "editorial", "fashion"]`;

    try {
      const res = await claudeChat(
        [{ role: "user", content: prompt }],
        "You are an image tagger for a design agency."
      );
      const clean = res.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    } catch {
      return ["reference", "moodboard"];
    }
  };

  const handleUpload = async (files) => {
    const imageFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (imageFiles.length === 0) {
      toast("Please upload image files (JPG, PNG, etc)", "error");
      return;
    }

    setUploading(true);
    let count = 0;

    for (const file of imageFiles) {
      try {
        // Upload to Supabase storage
        const filename = `${Date.now()}_${file.name}`;
        const url = await supabaseStorageUpload("images", filename, file);

        // Auto-tag with Claude
        const tags = await autoTag(file, url);

        // Save to DB
        const record = {
          filename,
          url,
          tags,
          original_name: file.name,
          created_at: new Date().toISOString(),
        };

        await supabaseFetch("/images", {
          method: "POST",
          body: JSON.stringify(record),
        });

        setImages((prev) => [...prev, record]);
        count++;
      } catch (e) {
        toast(`Failed to upload ${file.name}: ${e.message}`, "error");
      }
    }

    setUploading(false);
    if (count > 0) toast(`${count} image${count > 1 ? "s" : ""} uploaded & tagged`, "success");
  };

  const filtered = filterTag
    ? images.filter((img) => (img.tags || []).includes(filterTag))
    : images;

  return (
    <div className="panel">
      <div className="panel-title">Image Repository</div>
      <div className="panel-subtitle">
        Upload reference images — Deck Daddy auto-tags everything
      </div>

      <div className="card">
        <div className="card-title">Upload Reference Images</div>
        <div
          className={`upload-zone ${drag ? "drag" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            handleUpload(e.dataTransfer.files);
          }}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => handleUpload(e.target.files)}
          />
          <div className="upload-zone-icon">🖼️</div>
          <div className="upload-zone-text">
            {uploading ? "Uploading & tagging..." : "Drop images here or click to upload"}
          </div>
          <div className="upload-zone-hint">JPG, PNG, WEBP · Multiple files supported</div>
        </div>
      </div>

      <div className="divider" />

      <div className="flex items-center justify-between mb-16">
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>
          {images.length} Images
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxWidth: "60%", justifyContent: "flex-end" }}>
          <span
            className={`tag ${!filterTag ? "accent" : ""}`}
            style={{ cursor: "pointer" }}
            onClick={() => setFilterTag("")}
          >
            All
          </span>
          {allTags.slice(0, 8).map((t) => (
            <span
              key={t}
              className={`tag ${filterTag === t ? "accent" : ""}`}
              style={{ cursor: "pointer" }}
              onClick={() => setFilterTag(filterTag === t ? "" : t)}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🖼️</div>
          <div className="empty-text">No images yet</div>
          <div className="empty-hint">Upload moodboards, photography, or reference imagery</div>
        </div>
      ) : (
        <div className="img-grid">
          {filtered.map((img, i) => (
            <div key={i} className="img-card">
              <img src={img.url} alt={img.original_name} loading="lazy" />
              <div className="img-card-overlay">
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
                  {img.original_name}
                </div>
                <div className="img-card-tags-overlay">
                  {(img.tags || []).slice(0, 4).map((t, j) => (
                    <span key={j} className="tag" style={{ fontSize: 9 }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// OUTPUTS PANEL
// ============================================================
function OutputsPanel({ mode, setMode, knowledgeChunks, toast }) {
  const [template, setTemplate] = useState("eft");
  const [brief, setBrief] = useState("");
  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    if (!brief.trim()) { toast("Enter a brief first", "error"); return; }
    setGenerating(true);
    setOutput("");

    const knowledgeContext = knowledgeChunks.length > 0
      ? `\nRelevant knowledge from The 25s database:\n${knowledgeChunks.slice(0, 8).map(c => `- [${c.source}] ${c.content}`).join("\n")}`
      : "";

    let prompt = "";
    if (mode === "creative") {
      if (template === "eft") {
        prompt = `Generate a Classic EFT territory framework for this brief: ${brief}

Create 3 distinct territories:
TERRITORY 1 — EMOTIONAL (inspired by consumer truth)
TERRITORY 2 — FUNCTIONAL (inspired by brand truth)  
TERRITORY 3 — REVOLUTIONARY (inspired by relevant trend)

For each territory include:
- Territory Name (bold, memorable)
- Core Concept (1 punchy sentence)
- Consumer Truth or Brand Truth or Trend Insight
- 4-5 Keywords
- Visual Direction (describe mood, imagery, palette, typography style)
- Pack Design Direction (how this translates to packaging)
${knowledgeContext}`;
      } else {
        prompt = `Generate a Consumer Insight Driven territory framework for this brief: ${brief}

Create 3 territories, each structured as:
CONSUMER INSIGHT: [A real, specific consumer tension or belief]
HOW THE BRAND SOLVES IT: [The brand's answer]
TERRITORY NAME: [Bold concept name]
DIRECTION: [Visual and strategic direction]
KEYWORDS: [4-5 words]
${knowledgeContext}`;
      }
    } else {
      prompt = `Generate an Upfront Strategic Setup for this brief: ${brief}

Structure:
1. MARKET CONTEXT — Category landscape, key tensions, opportunities (2-3 paragraphs)
2. TARGET CONSUMER — Detailed consumer profile: who they are, what they value, their relationship with the category
3. BRAND POSITIONING OPPORTUNITY — The gap in the market, the white space
4. STRATEGIC RECOMMENDATION — Clear POV on what direction to take and why
5. KEY QUESTIONS FOR CREATIVE — 3-5 questions the creative team needs to answer
${knowledgeContext}

Be sharp, specific, and provocative. Avoid generic statements. Back up claims where possible.`;
    }

    try {
      const result = await claudeChat(
        [{ role: "user", content: prompt }],
        `You are Deck Daddy, strategic intelligence for The 25s design agency in Shanghai. You write strategy like a senior strategist — sharp, opinionated, and specific. Mode: ${mode === "creative" ? "Creative Strategy" : "Upfront Strategy"}.`
      );
      setOutput(result);
    } catch (e) {
      toast(`Generation failed: ${e.message}`, "error");
    }
    setGenerating(false);
  };

  const downloadText = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DeckDaddy_${mode}_${Date.now()}.txt`;
    a.click();
  };

  const downloadWord = () => {
    const html = `<html><body style="font-family: Arial; font-size: 12pt; line-height: 1.6; padding: 40px;">${output.replace(/\n/g, "<br/>")}</body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DeckDaddy_${mode}_${Date.now()}.doc`;
    a.click();
  };

  return (
    <div className="panel">
      <div className="panel-title">Generate Output</div>
      <div className="panel-subtitle">
        Build strategy documents ready for decks
      </div>

      <div className="card">
        <div className="flex gap-12 mb-16 items-center">
          <div>
            <label className="label">Mode</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["upfront", "creative"].map((m) => (
                <div
                  key={m}
                  className={`mode-pill ${mode === m ? "active" : ""}`}
                  onClick={() => setMode(m)}
                >
                  {m === "upfront" ? "Upfront Strategy" : "Creative Strategy"}
                </div>
              ))}
            </div>
          </div>
          {mode === "creative" && (
            <div>
              <label className="label">Template</label>
              <select className="select" value={template} onChange={(e) => setTemplate(e.target.value)}>
                <option value="eft">Classic EFT</option>
                <option value="insight">Consumer Insight</option>
              </select>
            </div>
          )}
        </div>

        <label className="label">Brief</label>
        <textarea
          className="input"
          style={{ minHeight: 100, resize: "vertical" }}
          placeholder={
            mode === "creative"
              ? "Describe the project: client, product, objective, target consumer, key challenge..."
              : "Describe the category, brand, and strategic question you need to answer..."
          }
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
        />

        <div className="flex gap-8 mt-16">
          <button
            className="btn btn-primary"
            onClick={generate}
            disabled={generating || !brief.trim()}
          >
            {generating ? "Generating..." : "→ Generate"}
          </button>
        </div>
      </div>

      {output && (
        <>
          <div className="divider" />
          <div className="card">
            <div className="flex items-center justify-between mb-16">
              <div className="card-title">Output</div>
              <div className="flex gap-8">
                <button className="btn btn-ghost" onClick={downloadText}>
                  ↓ TXT
                </button>
                <button className="btn btn-ghost" onClick={downloadWord}>
                  ↓ Word
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(output);
                    toast("Copied to clipboard", "success");
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
            <div
              style={{
                background: "var(--bg3)",
                borderRadius: "var(--radius)",
                padding: 20,
                fontSize: 13,
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
                color: "var(--text)",
                maxHeight: 600,
                overflowY: "auto",
              }}
            >
              {output}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function Deckbot() {
  const [unlocked, setUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [mode, setMode] = useState("creative");
  const [chunks, setChunks] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toasts, toast } = useToast();

  // Load data from Supabase on mount
  useEffect(() => {
    if (!unlocked) return;
    const load = async () => {
      setLoading(true);
      try {
        const [chunkData, imageData] = await Promise.all([
          supabaseFetch("/projects?select=*&limit=100"),
          supabaseFetch("/images?select=*&limit=200"),
        ]);
        if (chunkData) setChunks(chunkData);
        if (imageData) setImages(imageData);
      } catch (e) {
        // Supabase key not set yet — run with empty state
        console.warn("Supabase not configured:", e.message);
      }
      setLoading(false);
    };
    load();
  }, [unlocked]);

  if (!unlocked) return (
    <>
      <style>{styles}</style>
      <PasswordGate onUnlock={() => setUnlocked(true)} />
    </>
  );

  const nav = [
    { id: "chat", icon: "🧠", label: "Chat" },
    { id: "outputs", icon: "⚡", label: "Generate" },
    { id: "knowledge", icon: "📚", label: "Knowledge Base" },
    { id: "images", icon: "🖼️", label: "Image Repo" },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* TOPBAR */}
        <div className="topbar">
          <div className="topbar-logo">
            Deck<span>Daddy</span>
          </div>
          <div className="topbar-meta">
            <div className="status-dot" />
            <span>The 25s · Shanghai</span>
            <div
              className={`mode-pill ${mode === "upfront" ? "active" : ""}`}
              onClick={() => setMode("upfront")}
            >
              Upfront
            </div>
            <div
              className={`mode-pill ${mode === "creative" ? "active" : ""}`}
              onClick={() => setMode("creative")}
            >
              Creative
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="sidebar-section">Navigation</div>
          {nav.map((item) => (
            <div
              key={item.id}
              className={`sidebar-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.label}
            </div>
          ))}

          <div style={{ flex: 1 }} />

          <div className="sidebar-section">Status</div>
          <div style={{ padding: "8px 16px" }}>
            <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.8 }}>
              <div>{chunks.length} knowledge chunks</div>
              <div>{images.length} images</div>
              <div style={{ marginTop: 4, color: "var(--accent)", fontSize: 10 }}>
                {loading ? "Loading..." : "● Ready"}
              </div>
            </div>
          </div>
        </div>

        {/* MAIN */}
        <div className="main">
          {activeTab === "chat" && (
            <ChatPanel
              knowledgeChunks={chunks}
              mode={mode}
              setMode={setMode}
            />
          )}
          {activeTab === "outputs" && (
            <OutputsPanel
              mode={mode}
              setMode={setMode}
              knowledgeChunks={chunks}
              toast={toast}
            />
          )}
          {activeTab === "knowledge" && (
            <KnowledgePanel
              chunks={chunks}
              setChunks={setChunks}
              toast={toast}
            />
          )}
          {activeTab === "images" && (
            <ImagesPanel
              images={images}
              setImages={setImages}
              toast={toast}
            />
          )}
        </div>
      </div>

      {/* TOASTS */}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </>
  );
}