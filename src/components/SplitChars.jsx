import { useEffect, useState } from 'react';

/**
 * Splits text into per-character spans that rise into place, matching the
 * homepage hero title's entrance. Pass a `key` that changes with the text
 * (e.g. `${lang}-${text}`) at the call site to replay it on updates.
 */
export default function SplitChars({ text, className = '', as: Tag = 'span', baseDelay = 0.05, step = 0.026 }) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setInView(true), RM ? 0 : 30);
    return () => clearTimeout(t);
  }, []);

  let idx = 0;
  return (
    <Tag className={`split-chars${inView ? ' in' : ''} ${className}`}>
      {[...text].map((c, i) => c === ' '
        ? <span className="sp" key={i}> </span>
        : <span className="ch" style={{ transitionDelay: (baseDelay + (idx++) * step).toFixed(3) + 's' }} key={i}>{c}</span>
      )}
    </Tag>
  );
}
