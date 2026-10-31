"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase";

type ModelAnswer = {
  model: string;
  label: string;
  text?: string;
  error?: string;
};

type ComparisonResult = {
  question: string;
  responses: ModelAnswer[];
  synthesis?: string;
  synthesisError?: string;
};

export default function Dashboard() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ComparisonResult | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function checkUser() {
      try {
        const {
          data: { user: currentUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !currentUser) {
          setUser(null);
          setCheckingAuth(false);
          router.replace("/");
          return;
        }

        setUser(currentUser);
        setCheckingAuth(false);
      } catch {
        if (active) {
          setCheckingAuth(false);
          router.replace("/");
        }
      }
    }

    void checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (session?.user) {
        setUser(session.user);
        setCheckingAuth(false);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setCheckingAuth(false);
        router.replace("/");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleCompare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const question = prompt.trim();

    if (question.length < 3) {
      setError("Please enter a question with at least 3 characters.");
      return;
    }

    setComparing(true);
    setError("");
    setResult(null);

    try {
      const supabase = createClient();

      // Get the current authenticated session.
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session?.access_token) {
        router.replace("/");
        throw new Error("Your session has expired. Please sign in again.");
      }

      // Send the question and session token to the server.
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ prompt: question }),
      });

      const data = (await response.json()) as
        | (ComparisonResult & { error?: string })
        | null;

      if (!response.ok) {
        throw new Error(
          data?.error || `The AI request failed (${response.status}).`
        );
      }

      if (!data || !Array.isArray(data.responses)) {
        throw new Error("The server returned an unexpected response.");
      }

      setResult(data);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setComparing(false);
    }
  }

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);

    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setSigningOut(false);
      alert("Unable to sign out. Please try again.");
    }
  }

  if (checkingAuth) {
    return (
      <main className="dashboard-loading">
        <div className="loading-symbol">T</div>
        <p>Preparing your workspace...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <a href="/dashboard" className="dashboard-brand">
          <span className="brand-symbol">T</span>
          <span className="brand-name">
            TATTVA <span className="brand-ai">AI</span>
          </span>
        </a>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <a
            href="/chat"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "10px",
              background: "#171717",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: "600",
              textDecoration: "none",
            }}
          >
            <span>✨</span> Open AI Chat & Image Studio
          </a>

          <button
            type="button"
            className="signout-button"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </header>

      <section className="dashboard-content">
        <a
          href="/chat"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            marginBottom: "24px",
            borderRadius: "16px",
            border: "1px solid #0000001a",
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
            color: "#000000",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "18px" }}>✦</span>
            <span>
              <strong>TATTVA AI Chat & Studio</strong> — Multilingual Assistant + Complex Prompt Image Diffusion.
            </span>
          </span>
          <span style={{ fontWeight: "700" }}>Open Studio →</span>
        </a>

        <div className="dashboard-eyebrow">
          <span className="tagline-dot" />
          YOUR INTELLIGENCE WORKSPACE
        </div>

        <h1>
          Think deeper.
          <br />
          <span>See the whole picture.</span>
        </h1>

        <p className="dashboard-description">
          Ask one question. Compare AI perspectives. Discover one clearer
          answer.
        </p>

        <section className="workspace-panel">
          <div className="workspace-kicker">THE COMPARISON ENGINE</div>

          <h2 className="workspace-title">
            What do you want to understand?
          </h2>

          <p className="workspace-helper">
            TATTVA AI will gather responses from multiple AI models and
            synthesize their most useful insights.
          </p>

          <form className="workspace-form" onSubmit={handleCompare}>
            <label htmlFor="workspace-question">Your question</label>

            <textarea
              id="workspace-question"
              className="workspace-textarea"
              placeholder="Example: Explain linked lists in Java with a simple example."
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              maxLength={6000}
              required
              disabled={comparing}
            />

            <div className="workspace-actions">
              <span className="workspace-counter">
                {prompt.length}/6000 characters
              </span>

              <button
                className="workspace-submit"
                type="submit"
                disabled={comparing || prompt.trim().length < 3}
              >
                {comparing ? "Comparing responses..." : "Compare answers"}
                {!comparing && <span aria-hidden="true"> →</span>}
              </button>
            </div>
          </form>

          {comparing && (
            <div className="workspace-loading" role="status">
              <span className="workspace-spinner" />
              <span>
                Gathering AI responses and preparing your unified answer...
              </span>
            </div>
          )}

          {error && (
            <div className="workspace-error" role="alert">
              {error}
            </div>
          )}
        </section>

        {result && (
          <section className="comparison-results" aria-live="polite">
            <div className="results-heading">
              <div>
                <div className="workspace-kicker">YOUR RESULTS</div>
                <h2>Different perspectives. Clearer thinking.</h2>
              </div>

              <button
                type="button"
                className="workspace-clear"
                onClick={() => {
                  setResult(null);
                  setError("");
                  setPrompt("");
                }}
              >
                New question
              </button>
            </div>

            <div className="synthesis-card">
              <div className="synthesis-label">
                <span className="synthesis-symbol">✳</span>
                TATTVA UNIFIED ANSWER
              </div>

              {result.synthesis ? (
                <div className="answer-text">{result.synthesis}</div>
              ) : (
                <div className="workspace-error">
                  We received the model responses but could not create the
                  unified answer.
                  {result.synthesisError
                    ? ` Details: ${result.synthesisError}`
                    : ""}
                </div>
              )}
            </div>

            <div className="model-results-heading">
              <h2>Individual model responses</h2>
              <p>Compare the approaches taken by each model.</p>
            </div>

            <div className="model-results-grid">
              {result.responses.map((answer) => (
                <article className="model-result-card" key={answer.model}>
                  <div className="model-result-header">
                    <span className="model-dot" />
                    <h3>{answer.label}</h3>
                  </div>

                  {answer.text ? (
                    <div className="answer-text">{answer.text}</div>
                  ) : (
                    <div className="model-error">
                      This model could not respond.
                      {answer.error ? ` Details: ${answer.error}` : ""}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="welcome-card workspace-welcome">
          <div className="welcome-icon">✳</div>

          <div>
            <h2>Your workspace is ready</h2>
            <p>
              Signed in as{" "}
              <strong>{user.email ?? "Email unavailable"}</strong>
            </p>
            <p>
              Your AI comparison engine is ready to explore questions from
              multiple perspectives.
            </p>
          </div>
        </div>
      </section>

      <footer className="dashboard-footer">
        © {new Date().getFullYear()} TATTVA AI · Many answers. One clearer truth.
      </footer>
    </main>
  );
}