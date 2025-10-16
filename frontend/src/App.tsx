// src/App.tsx
import React from 'react';
import { ChatInterface } from './components/ChatInterface';
import type { ChatCategory } from './types';

// “単一チャット”用のデフォルトカテゴリ（見た目用）
const defaultCategory: ChatCategory = {
  id: 'assistant',
  name: '大学生活サポート',
  icon: 'GraduationCap',
  description: '学習・就活・生活・メンタルなど何でも相談してください。',
  color: 'bg-indigo-500',
  quickActions: [
    '学習計画を一緒に立てたい',
    'レポートの書き方を教えて',
    'おすすめのサークルを知りたい',
    '奨学金や家計管理の相談をしたい',
    '就活の始め方を教えて'
  ],
};

function App() {
  return (
    <div className="h-screen overflow-hidden">
      <ChatInterface
        category={defaultCategory}
        onBack={() => {}}
        showBack={false}    // ← 戻るボタンを消す
      />
    </div>
  );
}

export default App;
