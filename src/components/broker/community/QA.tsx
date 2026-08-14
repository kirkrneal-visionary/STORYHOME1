"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, Check, MessagesSquare, Plus } from "lucide-react";
import {
  COMMUNITY_CATEGORIES,
  isBroker,
  type Member,
  type Question,
} from "@/lib/community";
import {
  useCommunity,
  addAnswer,
  addQuestion,
  acceptAnswer,
} from "@/components/broker/communityStore";
import {
  formatDate,
  GuardrailComposer,
} from "@/components/broker/community/shared";
import { cn } from "@/lib/utils";

export function CommunityQA({ member }: { member: Member }) {
  const state = useCommunity();
  const [category, setCategory] = useState<string>("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [title, setTitle] = useState("");
  const [askCat, setAskCat] = useState<string>(COMMUNITY_CATEGORIES[0]);
  const [tags, setTags] = useState("");

  const questions = useMemo(() => {
    const list =
      category === "All"
        ? state.questions
        : state.questions.filter((q) => q.category === category);
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [state.questions, category]);

  const open = openId
    ? state.questions.find((q) => q.id === openId) ?? null
    : null;

  if (open) {
    return (
      <QuestionDetail
        question={open}
        member={member}
        onBack={() => setOpenId(null)}
      />
    );
  }

  async function ask(body: string) {
    if (!title.trim()) return;
    const id = await addQuestion({
      category: askCat,
      title: title.trim(),
      body,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      author: member,
    });
    setTitle("");
    setTags("");
    setAsking(false);
    setOpenId(id);
  }

  return (
    <div>
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h3 className="font-serif text-xl font-bold text-ink">Pro Q&amp;A</h3>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            Ask credentialed pros across brokerages — finance, inspection,
            appraisal, market, and more.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAsking((v) => !v)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--accent-contrast)]"
        >
          <Plus className="h-4 w-4" /> Ask a question
        </button>
      </div>

      {asking && (
        <div className="mb-4 space-y-3 story-surface p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Your question, in one line"
            className="field-input"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={askCat}
              onChange={(e) => setAskCat(e.target.value)}
              className="field-input"
            >
              {COMMUNITY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tags, comma, separated"
              className="field-input"
            />
          </div>
          <GuardrailComposer
            placeholder="Add detail so the right experts can help…"
            submitLabel="Post question"
            onSubmit={ask}
          />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {["All", ...COMMUNITY_CATEGORIES].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "h-8 shrink-0 rounded-full px-3 font-mono text-[11px] font-semibold uppercase transition-colors",
              category === c
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "border border-hairline text-[var(--muted)] hover:text-ink",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {questions.map((q) => {
          const answerCount = state.answers.filter(
            (a) => a.questionId === q.id,
          ).length;
          return (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => setOpenId(q.id)}
                className="flex w-full items-center justify-between gap-3 story-surface p-4 text-left hover:border-gold/40"
              >
                <div className="min-w-0">
                  <span className="block truncate font-semibold text-ink">
                    {q.title}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--muted)]">
                    {q.category} · {q.authorName} · {formatDate(q.createdAt)}
                  </span>
                </div>
                <span className="flex shrink-0 items-center gap-3">
                  {q.acceptedAnswerId && (
                    <Check className="h-4 w-4 text-teal-soft" />
                  )}
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-[var(--muted)]">
                    <MessagesSquare className="h-3.5 w-3.5" /> {answerCount}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function QuestionDetail({
  question,
  member,
  onBack,
}: {
  question: Question;
  member: Member;
  onBack: () => void;
}) {
  const state = useCommunity();
  const answers = useMemo(
    () =>
      state.answers
        .filter((a) => a.questionId === question.id)
        .sort((a, b) => {
          if (question.acceptedAnswerId === a.id) return -1;
          if (question.acceptedAnswerId === b.id) return 1;
          return a.createdAt - b.createdAt;
        }),
    [state.answers, question.id, question.acceptedAnswerId],
  );

  const canAccept = member.id === question.authorId || isBroker(member);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Q&amp;A
      </button>

      <div className="mt-3 story-surface p-5">
        <p className="font-mono text-[11px] text-[var(--muted)] uppercase">
          {question.category}
          {question.tags.length > 0 && ` · ${question.tags.join(", ")}`}
        </p>
        <h3 className="mt-1 font-serif text-2xl font-bold text-ink">
          {question.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink">{question.body}</p>
        <p className="mt-3 flex items-center gap-1.5 font-mono text-[11px] text-[var(--muted)]">
          <BadgeCheck className="h-3.5 w-3.5 text-teal-soft" />
          {question.authorName} · {question.authorCredential}
        </p>
      </div>

      <h4 className="mt-6 mb-2 font-mono text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">
        {answers.length} answer(s)
      </h4>
      <ul className="space-y-3">
        {answers.map((a) => {
          const accepted = question.acceptedAnswerId === a.id;
          return (
            <li
              key={a.id}
              className={cn(
                "rounded-xl border p-4",
                accepted
                  ? "border-teal-soft/50 bg-teal-soft/10"
                  : "story-surface",
              )}
            >
              <p className="text-sm leading-relaxed text-ink">{a.body}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--muted)]">
                  <BadgeCheck className="h-3.5 w-3.5 text-teal-soft" />
                  {a.authorName} · {a.authorCredential}
                </span>
                {accepted ? (
                  <span className="inline-flex items-center gap-1 rounded bg-teal-soft px-2 py-0.5 font-mono text-[10px] font-bold text-paper uppercase">
                    <Check className="h-3 w-3" /> Accepted
                  </span>
                ) : (
                  canAccept && (
                    <button
                      type="button"
                      onClick={() => acceptAnswer(question.id, a.id)}
                      className="rounded-md border border-hairline px-2.5 py-1 text-xs font-semibold text-ink"
                    >
                      Accept answer
                    </button>
                  )
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 story-surface p-4">
        <GuardrailComposer
          placeholder="Share your expertise…"
          submitLabel="Post answer"
          onSubmit={(body) =>
            addAnswer({ questionId: question.id, body, author: member })
          }
        />
      </div>
    </div>
  );
}
