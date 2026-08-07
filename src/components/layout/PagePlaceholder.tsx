type PagePlaceholderProps = {
  title: string;
  description: string;
};

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section className="animate-fade-up">
      <p className="mb-2 font-ui text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Story Home
      </p>
      <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--muted)]">
        {description}
      </p>
      <div className="mt-8 h-px w-full bg-hairline" />
      <p className="mt-6 text-sm text-[var(--muted)]">
        Shell ready — data-driven views come next.
      </p>
    </section>
  );
}
