import type { FaqItem } from '@/types';

/** Native <details> accordion — accessible and works without JavaScript. */
export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((q) => (
        <details key={q.id} className="group" id={`q-${q.id}`}>
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 [&::-webkit-details-marker]:hidden">
            <h3 className="text-[1.375rem] leading-snug sm:text-[1.625rem]">{q.question}</h3>
            <span aria-hidden="true" className="relative mt-2 h-4 w-4 shrink-0">
              <span className="absolute left-0 top-1/2 h-px w-4 bg-ink" />
              <span className="absolute left-1/2 top-0 h-4 w-px bg-ink transition-transform duration-300 group-open:rotate-90 group-open:scale-0" />
            </span>
          </summary>
          <p className="max-w-3xl pb-7 text-[1rem] leading-relaxed text-muted">{q.answer}</p>
        </details>
      ))}
    </div>
  );
}
