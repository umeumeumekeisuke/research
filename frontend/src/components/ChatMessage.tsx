import React from 'react';
import { Message } from '../types';
import { Bot, User, Mic, Camera } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

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

  const getMessageBadge = () => {
    if (isBot || message.type === 'text') return null;
    
    const badges = {
      voice: { icon: <Mic size={12} />, text: '音声', color: 'bg-green-500' },
      image: { icon: <Camera size={12} />, text: '画像', color: 'bg-orange-500' }
    };
    
    const badge = badges[message.type as keyof typeof badges];
    if (!badge) return null;
    
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white ${badge.color} mb-2`}>
        {badge.icon}
        {badge.text}
      </div>
    );
  };
  
  return (
    <div className={`flex items-start gap-3 ${isBot ? '' : 'flex-row-reverse'}`}>
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
        isBot 
          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
          : message.type === 'voice'
            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
            : message.type === 'image'
            ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
            : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white'
      }`}>
        {getMessageIcon()}
      </div>
      
      <div className={`max-w-xs lg:max-w-md ${isBot ? '' : 'text-right'}`}>
        {getMessageBadge()}
        <div className={`px-4 py-3 rounded-2xl shadow-sm ${
          isBot 
            ? 'bg-white border border-gray-200 text-gray-800' 
            : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
        }`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <p className={`text-xs mt-2 ${
            isBot ? 'text-gray-500' : 'text-blue-100'
          }`}>
            {message.timestamp.toLocaleTimeString('ja-JP', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false
            })}
          </p>
        </div>
      </div>
    </div>
  );
};