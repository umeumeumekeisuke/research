import React from 'react';
import { ExternalLink } from 'lucide-react';
import type { Attachment } from '../types';

type LinkPillsProps = {
  links: Extract<Attachment, { kind: 'link' }>[];
  align?: 'left' | 'right';
};

export const LinkPills: React.FC<LinkPillsProps> = ({ links, align = 'left' }) => {
  if (!links?.length) return null;

  // 重複URLを簡易的に除去
  const deduped = Array.from(new Map(links.map(l => [l.url, l])).values());

  return (
    <div className={`mt-2 flex flex-wrap gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
      {deduped.map((l, i) => {
        let label = l.title;
        try {
          if (!label) {
            const u = new URL(l.url);
            label = u.hostname.replace(/^www\./, '');
          }
        } catch {
          label = l.title ?? l.url;
        }

        return (
          <a
            key={`${l.url}-${i}`}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm
                       bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700
                       border-blue-200 hover:from-blue-100 hover:to-purple-100 hover:border-blue-300
                       transition-all duration-200 shadow-sm hover:shadow-md"
            title={l.url}
            aria-label={`リンクを開く: ${label}`}
          >
            <span role="img" aria-label="link">🔗</span>
            {label}
            <ExternalLink size={14} className="opacity-80" />
          </a>
        );
      })}
    </div>
  );
};
