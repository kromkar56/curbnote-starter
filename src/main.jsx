import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AlertCircle, ArrowDownRight, Check, ChevronRight, Clipboard, FileText, Leaf, MapPin, Plus, Send, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import "./styles.css";

const STORAGE_KEY = "curbnote-drafts-v1";
const categories = ["Damaged pavement", "Blocked walkway", "Broken streetlight", "Overflowing bin", "Broken public fixture", "Other issue"];

function App() {
  const [category, setCategory] = useState(categories[0]);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [report, setReport] = useState("");
  const [mode, setMode] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [drafts, setDrafts] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  }, [drafts]);

  const ready = description.trim().length >= 8;
  const count = useMemo(() => description.length, [description]);

  function resetForm() {
    setCategory(categories[0]); setLocation(""); setDescription("");
    setReport(""); setMode(""); setNotice(""); setError(""); setCopied(false);
  }

  async function generateReport(event) {
    event.preventDefault();
    if (!ready) return;
    setBusy(true); setError(""); setNotice(""); setReport(""); setCopied(false);
    try {
      const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      const targetUrl = apiBase ? `${apiBase}/api/report` : "/api/report";
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, location, description })
      });

      const text = await response.text();
      let data = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          if (!response.ok) {
            throw new Error(`The backend server is not reachable (HTTP ${response.status}). Make sure the backend is running on port 8787.`);
          }
          throw new Error("The API returned an unexpected non-JSON response. Check that the backend is running and that VITE_API_URL is configured correctly.");
        }
      }

      if (!response.ok) throw new Error(data.error || "Could not generate the report.");
      setReport(data.report || "");
      setMode(data.mode || "unknown");
      setNotice(data.notice || "");
    } catch (e) {
      const msg = e.message || "An error occurred.";
      setError(msg.toLowerCase().includes("running") ? msg : `${msg} Check that the API server is running.`);
    } finally { setBusy(false); }
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard access was blocked. Select the report text and copy it manually.");
    }
  }

  function saveDraft() {
    if (!report.trim()) return;
    const draft = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      category, location, description, report, mode,
      savedAt: new Date().toISOString()
    };
    setDrafts(previous => [draft, ...previous].slice(0, 30));
    setNotice("Draft saved on this device.");
  }

  function openDraft(draft) {
    setCategory(draft.category); setLocation(draft.location); setDescription(draft.description);
    setReport(draft.report); setMode(draft.mode); setNotice("Saved draft loaded from this device.");
    setError(""); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function removeDraft(id) { setDrafts(previous => previous.filter(d => d.id !== id)); }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={e => { e.preventDefault(); resetForm(); }}>
          <span className="brand-mark"><Leaf size={20} strokeWidth={2.2}/></span>
          <span>curbnote<span className="brand-period">.</span></span>
        </a>
        <div className="top-note"><span className="live-dot"/> A small tool for a better shared world</div>
        <a className="top-link" href="#how-it-works">How it works <ChevronRight size={15}/></a>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow"><span className="eyebrow-line"/> NOTICE IT. MAKE IT ACTIONABLE.</div>
          <h1>Good places don't<br/>fix themselves<span className="headline-dot">.</span></h1>
          <p className="hero-copy">Spotted a broken walkway, overflowing bin, or damaged public fixture? Turn what you noticed into a clear report someone can act on.</p>
          <div className="hero-points">
            <span><ShieldCheck size={16}/> You stay in control</span>
            <span><FileText size={16}/> Editable report</span>
            <span><Leaf size={16}/> Built for the real world</span>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-sun"/><div className="art-hill hill-back"/><div className="art-hill hill-front"/>
            <div className="art-path"/><div className="art-pin"><MapPin size={22}/></div>
            <div className="art-note"><span className="note-check"><Check size={13}/></span><span><b>Observation captured</b><small>Ready to make a difference</small></span></div>
            <div className="art-label">SMALL ACTIONS ADD UP</div>
          </div>
        </section>

        <section className="workspace" aria-label="Create a report">
          <div className="section-heading">
            <div><span className="step-label">01 / YOUR OBSERVATION</span><h2>What did you notice?</h2></div>
            <span className="private-pill"><ShieldCheck size={14}/> Saved only on this device</span>
          </div>
          <div className="workspace-grid">
            <form className="input-panel" onSubmit={generateReport}>
              <label className="field-label" htmlFor="category">Type of issue</label>
              <div className="select-wrap">
                <select id="category" value={category} onChange={e => setCategory(e.target.value)}>
                  {categories.map(item => <option key={item}>{item}</option>)}
                </select>
                <ChevronRight className="select-chevron" size={17}/>
              </div>

              <label className="field-label location-label" htmlFor="location">Where is it? <span>Optional</span></label>
              <div className="input-with-icon"><MapPin size={17}/><input id="location" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. outside the north campus gate"/></div>

              <div className="label-row"><label className="field-label" htmlFor="description">Describe what you saw</label><span className="char-count">{count}/1200</span></div>
              <textarea id="description" maxLength={1200} value={description} onChange={e => setDescription(e.target.value)} placeholder="Be specific about what you observed. What is damaged, blocked, or overflowing? Stick to what you know." rows={5}/>
              <div className="form-hint"><AlertCircle size={14}/> No need to guess the cause. Just describe what you saw.</div>
              {error && <div className="error-message" role="alert">{error}</div>}
              <button className="primary-button" type="submit" disabled={!ready || busy}>
                {busy ? <><span className="spinner"/> Creating your draft…</> : <><Sparkles size={17}/> Create my report <ArrowDownRight size={17}/></>}
              </button>
              <p className="under-button">AI drafts the wording. You review it before sharing.</p>
            </form>

            <section className={`report-panel ${report ? "has-report" : ""}`} aria-live="polite">
              <div className="report-top"><span className="step-label">02 / YOUR REPORT</span><span className={`report-status ${report ? "status-ready" : ""}`}><span/>{report ? "Draft ready" : "Waiting for details"}</span></div>
              {!report ? (
                <div className="empty-report">
                  <div className="empty-icon"><FileText size={25}/></div>
                  <h3>Your report starts here</h3>
                  <p>Add a few details about what you observed. We'll turn them into a clear, neutral report you can review and use.</p>
                  <div className="preview-lines"><i/><i/><i/><i/></div>
                  <div className="empty-bottom"><Sparkles size={15}/> Clear. Factual. Ready to edit.</div>
                </div>
              ) : (
                <div className="generated-report">
                  <div className="report-meta"><span>{category}</span><span>{mode === "ai" ? "Open-weight AI" : "Template fallback"}</span></div>
                  <textarea className="report-editor" aria-label="Edit generated report" value={report} onChange={e => setReport(e.target.value)} rows={12}/>
                  {mode !== "ai" && <p className="mode-warning"><AlertCircle size={14}/> Template mode: hosted AI was not used for this draft.</p>}
                  {notice && <p className="notice-message">{notice}</p>}
                  <div className="report-actions">
                    <button className="primary-button copy-button" onClick={copyReport} type="button">{copied ? <Check size={16}/> : <Clipboard size={16}/>} {copied ? "Copied!" : "Copy report"}</button>
                    <button className="secondary-button" onClick={saveDraft} type="button"><Plus size={16}/> Save draft</button>
                  </div>
                  <p className="review-reminder"><ShieldCheck size={14}/> Review every detail before sending. Nothing is submitted automatically.</p>
                </div>
              )}
            </section>
          </div>
        </section>

        <section className="principles" id="how-it-works">
          <div className="principle-intro"><span className="step-label">DESIGNED WITH CARE</span><h2>Useful, not overcomplicated.</h2><p>The point isn't another feed to scroll. It's a little less friction between noticing a problem and doing something about it.</p></div>
          <div className="principle-card"><span className="principle-icon"><ShieldCheck size={20}/></span><h3>Facts over assumptions</h3><p>The report should never invent a cause, location, or claim that an issue has been verified.</p></div>
          <div className="principle-card"><span className="principle-icon"><Clipboard size={20}/></span><h3>You stay in control</h3><p>Review, edit, copy, or discard. CurbNote doesn't send anything on your behalf.</p></div>
          <div className="principle-card"><span className="principle-icon"><Leaf size={20}/></span><h3>Take it back outside</h3><p>Make the report, then put the screen away and get on with your day.</p></div>
        </section>

        {drafts.length > 0 && <section className="saved-section">
          <div className="section-heading saved-heading"><div><span className="step-label">YOUR DEVICE</span><h2>Saved drafts <span className="draft-count">{drafts.length}</span></h2></div><button className="text-button" onClick={() => { if (confirm("Delete all saved drafts from this device?")) setDrafts([]); }}><Trash2 size={14}/> Clear all</button></div>
          <div className="draft-list">{drafts.map(draft => <article className="draft-item" key={draft.id}><button className="draft-open" onClick={() => openDraft(draft)}><span className="draft-icon"><FileText size={17}/></span><span className="draft-info"><b>{draft.category}</b><small>{draft.location || "No location"} · {new Date(draft.savedAt).toLocaleDateString()}</small><span>{draft.description}</span></span><ChevronRight size={17}/></button><button className="delete-draft" aria-label="Delete draft" onClick={() => removeDraft(draft.id)}><Trash2 size={15}/></button></article>)}</div>
        </section>}
      </main>

      <footer><a className="brand footer-brand" href="#"><span className="brand-mark"><Leaf size={17}/></span><span>curbnote<span className="brand-period">.</span></span></a><p>Notice something. Make it actionable. Then go live your life.</p><span className="footer-note">A community-minded prototype · No automatic submissions</span></footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);