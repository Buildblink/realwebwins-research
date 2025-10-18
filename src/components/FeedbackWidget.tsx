"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type FeedbackState = "idle" | "submitting" | "success" | "error";

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number | null>(5);
  const [status, setStatus] = useState<FeedbackState>("idle");
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setMessage("");
    setRating(5);
    setStatus("idle");
    setError(null);
  };

  const closeModal = () => {
    setIsOpen(false);
    if (status === "success") {
      resetForm();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) {
      setError("Please share a short message before submitting feedback.");
      return;
    }

    setStatus("submitting");
    setError(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          message: message.trim(),
          rating,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? "Unable to send feedback right now.");
      }

      setStatus("success");
    } catch (caughtError) {
      const messageText =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong while sending feedback.";
      setStatus("error");
      setError(messageText);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="fixed bottom-6 right-6 z-40 shadow-lg shadow-primary/20"
        onClick={() => setIsOpen(true)}
        data-testid="feedback-trigger"
      >
        💬 Feedback
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
            onClick={closeModal}
          />
          <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[90vw] rounded-2xl border border-foreground/10 bg-white/95 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading text-lg text-slate-900">
                  Share quick feedback
                </h3>
                <p className="text-xs text-slate-500">
                  We read every note to improve the research workflow.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close feedback form"
              >
                ✕
              </button>
            </div>

            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Name <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-foreground/10 bg-white px-3 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Your name or team"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="feedback-message"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Message
                </label>
                <Textarea
                  id="feedback-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={4}
                  required
                  className="min-h-[120px]"
                  placeholder="What should we improve or build next?"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Rating
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition ${
                        rating === value
                          ? "border-primary bg-primary text-white"
                          : "border-foreground/20 bg-white text-slate-500 hover:border-primary/50 hover:text-primary"
                      }`}
                      aria-label={`Set rating ${value}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <p>We use Supabase to store feedback securely.</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={closeModal}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={status === "submitting"}
                    data-testid="feedback-submit"
                  >
                    {status === "submitting" ? "Sending..." : "Submit"}
                  </Button>
                </div>
              </div>

              {status === "success" && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  Thank you! Your feedback was sent.
                </div>
              )}
            </form>
          </div>
        </>
      )}
    </>
  );
}

