import React from 'react';
import type { Attachment } from '../types';
import { BarChart2, ExternalLink } from 'lucide-react';

type ChartCardProps = {
  chart: Extract<Attachment, { kind: 'chart' }>;
  align?: 'left' | 'right';
};

export const ChartCard: React.FC<ChartCardProps> = ({ chart, align = 'left' }) => {
  if (!chart?.url) return null;

  const height = chart.height ?? 280;
  const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(chart.url);

  return (
    <div className={`mt-3 ${align === 'right' ? 'text-right' : ''}`}>
      <div className="inline-block max-w-full rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
              <BarChart2 size={16} />
            </div>
            <div className="text-sm font-semibold text-gray-700 truncate">
              {chart.title ?? 'Chart'}
            </div>
          </div>
          <a
            href={chart.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline flex-shrink-0"
            aria-label="チャートの元URLを新規タブで開く"
            title="新規タブで開く"
          >
            オープン
            <ExternalLink size={14} />
          </a>
        </div>

        {/* 本体 */}
        <div className="p-3">
          {isImage ? (
            <img
              src={chart.url}
              alt={chart.title ?? 'chart'}
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          ) : (
            <iframe
              src={chart.url}
              title={chart.title ?? 'chart'}
              style={{ width: '100%', height, border: 0, borderRadius: 12 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}
          {chart.description && (
            <p className="mt-2 text-xs text-gray-500">{chart.description}</p>
          )}
        </div>
      </div>
    </div>
  );
};
