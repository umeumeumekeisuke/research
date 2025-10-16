import React from 'react';
import { Message } from '../types';
import { Bot, User, Mic, Camera } from 'lucide-react';
import { LinkPills } from './LinkPills';
import { ChartCard } from './ChartCard';

interface ChatMessageProps {
  message: Message;
}

// 本文からURLを拾うための最低限の正規表現
const urlRegex =
  /\b((?:https?:\/\/)(?:[\w.-]+)(?:\.[a-z]{2,})(?:[\/\w\-._~:?#[\]@!$&'()*+,;=%]*)?)\b/gi;

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isBot = message.sender === 'bot';

  const getMessageIcon = () => {
    if (isBot) return <Bot size={18} />;
    switch (message.type) {
      case 'voice':
        return <Mic size={18} />;
      case 'image':
        return <Camera size={18} />;
      default:
        return <User size={18} />;
    }
  };

  // 本文に混じるURLを抽出してリンクピルにも流用
  const linksFromText =
    (message.content.match(urlRegex)?.map((u) => ({ kind: 'link', url: u })) as any[]) ?? [];

  // 添付のリンク/チャート
  const linksFromAttachments = (message.attachments ?? []).filter(
    (a) => a.kind === 'link'
  ) as any[];

  const charts = (message.attachments ?? []).filter(
    (a) => a.kind === 'chart'
  ) as any[];

  // レスポンシブ: バブルの最大幅（端末サイズで最適化）
  const bubbleWidth = 'max-w-[82%] md:max-w-[68%] lg:max-w-[60%] xl:max-w-[50%]';

  // 本文のURLをクリック可能に変換（最低限）
  const renderContent = (text: string) => {
    const parts = text.split(urlRegex);
    return parts.map((part, idx) => {
      if (/^https?:\/\//i.test(part)) {
        try {
          const u = new URL(part);
          return (
            <a
              key={`${part}-${idx}`}
              href={u.toString()}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline ${isBot ? 'text-blue-700' : 'text-white'} break-words`}
            >
              {u.toString()}
            </a>
          );
        } catch {
          return <span key={idx}>{part}</span>;
        }
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // 種別バッジ（ユーザーの音声/画像のときだけ表示）
  const renderBadge = () => {
    if (isBot || message.type === 'text') return null;
    const isVoice = message.type === 'voice';
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white mb-2 ${
          isVoice ? 'bg-green-500' : 'bg-orange-500'
        }`}
      >
        {isVoice ? <Mic size={12} /> : <Camera size={12} />}
        {isVoice ? '音声' : '画像'}
      </div>
    );
  };

  return (
    <div className={`flex items-start gap-3 ${isBot ? '' : 'flex-row-reverse'}`}>
      {/* 左の丸アイコン */}
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
          isBot
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
            : message.type === 'voice'
            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
            : message.type === 'image'
            ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
            : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white'
        }`}
      >
        {getMessageIcon()}
      </div>

      {/* 吹き出し */}
      <div className={`${bubbleWidth} ${isBot ? '' : 'text-right'}`}>
        {renderBadge()}

        <div
          className={`px-4 py-3 rounded-2xl shadow-sm ${
            isBot
              ? 'bg-white border border-gray-200 text-gray-800'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {renderContent(message.content)}
          </p>
          <p className={`text-xs mt-2 ${isBot ? 'text-gray-500' : 'text-blue-100'}`}>
            {new Date(message.timestamp).toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })}
          </p>
        </div>

        {/* リンクのピル（添付 + 本文抽出） */}
        <LinkPills
          links={[...linksFromAttachments, ...linksFromText] as any}
          align={isBot ? 'left' : 'right'}
        />

        {/* チャート（複数でもOK） */}
        {charts.map((c, i) => (
          <ChartCard key={i} chart={c as any} align={isBot ? 'left' : 'right'} />
        ))}
      </div>
    </div>
  );
};

export default ChatMessage;