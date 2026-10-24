"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Sparkles, Send, MapPin, X, LoaderCircle } from "lucide-react";
import { api, useApp } from "./provider";
import { JobCard, PageHeading, useData } from "./ui";
import { aiErrorKey, type AiChatResult } from "@/lib/ai-contract";
import { matchReasons } from "@/lib/domain";

type Turn = {
  role: "user" | "assistant";
  content: string;
  result?: AiChatResult;
};
export function Assistant() {
  const {
    t,
    locale,
    profile,
    authLoading,
    location,
    locating,
    enableLocation,
    clearLocation,
  } = useApp();
  const status = useData<{ configured: boolean; status: string }>(
    "/api/ai/status",
  );
  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function send(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text || busy) return;
    const history = turns
      .slice(-6)
      .map(({ role, content }) => ({ role, content: content.slice(0, 2000) }));
    setBusy(true);
    setError(null);
    try {
      const result = await api<AiChatResult>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, history, locale, location }),
      });
      setTurns((previous) => [
        ...previous,
        { role: "user", content: text },
        { role: "assistant", content: result.message, result },
      ]);
      setMessage("");
      status.reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : "AI_UNAVAILABLE");
      status.reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page assistant-page">
      <PageHeading
        eyebrow={t("assistant")}
        title={t("aiHeading")}
        body={t("aiIntro")}
      />
      <div className="assistant-toolbar">
        <span className="chip">
          <Sparkles size={14} />
          {error === "AI_QUOTA_EXCEEDED" ||
          status.data?.status === "ai_quota_exceeded"
            ? t("aiNeedsCredits")
            : status.loading
              ? t("loading")
              : status.data?.configured
                ? t(status.data.status === "ready" ? "aiReady" : "aiConfigured")
                : t("aiOff")}
        </span>
        <Link className="text-link" href="/jobs">
          {t("browse")} →
        </Link>
      </div>
      <p className="muted small-text">{t("aiPrivacy")}</p>
      {!authLoading && !profile ? (
        <section className="panel">
          <p>{t("aiSignIn")}</p>
          <Link className="button" href="/login?next=/assistant">
            {t("login")}
          </Link>
        </section>
      ) : (
        <>
          <div
            className="assistant-conversation"
            aria-live="polite"
            aria-relevant="additions"
            aria-busy={busy}
          >
            {turns.length === 0 && (
              <section className="panel assistant-welcome">
                <Sparkles size={28} />
                <h2>{t("aiWelcome")}</h2>
                <p>{t("aiExample")}</p>
              </section>
            )}
            {turns.map((turn, index) => (
              <section className={`assistant-turn ${turn.role}`} key={index}>
                <strong>
                  {t(turn.role === "user" ? "aiYou" : "assistant")}
                </strong>
                <p className="assistant-message">{turn.content}</p>
                {turn.result && turn.result.jobs.length > 0 && (
                  <div className="assistant-jobs">
                    {turn.result.jobs.map((job) => {
                      const matched = matchReasons(job, turn.result!.skills);
                      return (
                        <div key={job.id}>
                          <JobCard job={job} />
                          {matched.length > 0 && (
                            <p className="small-text muted">
                              {t("aiMatchingSkills")}: {matched.join(", ")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
            {busy && (
              <p role="status" className="assistant-thinking">
                <LoaderCircle size={18} className="spin" />
                {t("aiThinking")}
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="assistant-error">
              {t(
                error === "SIGN_IN_REQUIRED"
                  ? "signInRequired"
                  : aiErrorKey(error),
              )}
            </p>
          )}
          <form className="panel assistant-composer" onSubmit={send}>
            <label htmlFor="ai-message">{t("aiAsk")}</label>
            <textarea
              id="ai-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={3}
              maxLength={2000}
              required
              disabled={busy || authLoading}
              placeholder={t("aiExample")}
            />
            <div className="assistant-actions">
              <button
                type="button"
                className="button secondary"
                onClick={location ? clearLocation : enableLocation}
                disabled={busy || locating}
              >
                {location ? <X size={16} /> : <MapPin size={16} />}
                {t(location ? "clearLocation" : "enable")}
              </button>
              <button
                className="button"
                disabled={busy || authLoading || !message.trim()}
              >
                {t(busy ? "loading" : "aiSend")}
                <Send size={16} />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export function SkillExtractor({
  text,
  onSkills,
}: {
  text: string;
  onSkills: (skills: string[]) => void;
}) {
  const { t } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[] | null>(null);
  async function extract() {
    setBusy(true);
    setError(null);
    setSkills(null);
    try {
      const result = await api<{ skills: string[] }>("/api/ai/extract-skills", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setSkills(result.skills);
      if (result.skills.length) onSkills(result.skills);
    } catch (error) {
      setError(error instanceof Error ? error.message : "AI_UNAVAILABLE");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ai-skill-extractor full-row">
      <button
        type="button"
        className="button secondary"
        disabled={busy || text.trim().length < 3}
        onClick={extract}
      >
        <Sparkles size={16} />
        {t(busy ? "loading" : "aiExtract")}
      </button>
      <p className="muted small-text">{t("aiSkillNotice")}</p>
      <div aria-live="polite">
        {skills && (
          <p>
            {skills.length
              ? `${t("aiSkillsAdded")}: ${skills.join(", ")}`
              : t("aiNoSkills")}
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="assistant-error">
          {t(aiErrorKey(error))}
        </p>
      )}
    </div>
  );
}
