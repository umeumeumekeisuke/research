import React, { useState, useEffect, useRef } from 'react';
import { Message, ChatCategory } from '../types';
import { ChatMessage } from './ChatMessage';
import { QuickActions } from './QuickActions';
import { VoiceInput } from './VoiceInput';
import { ImageInput } from './ImageInput';
import { Send, ArrowLeft } from 'lucide-react';
import { botResponses } from '../data/responses';
import * as Icons from 'lucide-react';

interface ChatInterfaceProps {
  category: ChatCategory;
  onBack: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ category, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const IconComponent = Icons[category.icon as keyof typeof Icons] as React.ComponentType<{ size?: number }>;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Welcome message when entering a category
    const welcomeMessage: Message = {
      id: '1',
      content: `こんにちは！${category.name}についてお手伝いします。${category.description}に関することなら、なんでもお気軽にご相談ください。\n\n💬 テキスト入力\n🎤 音声入力\n📷 画像アップロード\n\nどの方法でも対応できます！`,
      sender: 'bot',
      timestamp: new Date(),
      category: category.id
    };
    setMessages([welcomeMessage]);
  }, [category]);

  const sendMessage = (content: string, type: 'text' | 'voice' | 'image' = 'text') => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date(),
      category: category.id,
      type
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      let botResponse = '';
      
      if (type === 'voice') {
        botResponse = '音声メッセージを受信しました！とても自然な話し方ですね。';
      } else if (type === 'image') {
        botResponse = '画像を確認しました！詳細について説明いたします。画像に関連する情報やアドバイスが必要でしたら、お気軽にお聞かせください。';
      } else {
        const responses = botResponses[category.id] || botResponses.default;
        botResponse = responses[Math.floor(Math.random() * responses.length)];
      }
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: botResponse,
        sender: 'bot',
        timestamp: new Date(),
        category: category.id
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleVoiceInput = (transcript: string) => {
    sendMessage(`🎤 ${transcript}`, 'voice');
  };

  const handleImageUpload = (imageData: string, description: string) => {
    sendMessage(`📷 ${description}`, 'image');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-200 bg-white shadow-sm">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors duration-200"
        >
          <ArrowLeft size={20} />
        </button>
        <div className={`p-3 rounded-xl ${category.color} text-white shadow-md`}>
          <IconComponent size={24} />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-gray-800 text-lg">{category.name}</h2>
          <p className="text-sm text-gray-600">音声・画像・テキストで対応可能</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          オンライン
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        
        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce\" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
              <p className="text-sm text-gray-500">入力中...</p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="p-4 bg-white border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-3 font-medium">よくある質問：</p>
          <QuickActions 
            actions={category.quickActions} 
            onActionClick={sendMessage} 
          />
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="メッセージを入力してください..."
              className="w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          
          <div className="flex gap-2">
            <VoiceInput onVoiceInput={handleVoiceInput} />
            <ImageInput onImageUpload={handleImageUpload} />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};