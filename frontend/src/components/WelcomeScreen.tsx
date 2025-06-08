import React from 'react';
import { ChatCategory } from '../types';
import { CategoryCard } from './CategoryCard';
import { MessageCircle, Sparkles, GraduationCap } from 'lucide-react';

interface WelcomeScreenProps {
  categories: ChatCategory[];
  onCategorySelect: (category: ChatCategory) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ categories, onCategorySelect }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="text-center pt-12 pb-8 px-4">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl text-white shadow-lg">
            <GraduationCap size={40} />
          </div>
          <Sparkles className="text-purple-500 animate-pulse" size={28} />
        </div>
        
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          大学生活サポート
        </h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">
          AIアシスタント
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
          あなたの大学生活を全面的にサポートするAIパートナーです。<br />
          学習から就活、日常生活まで、どんな相談でも24時間いつでもお気軽にどうぞ。
        </p>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-3">
            今日はどんなことでお手伝いしましょうか？
          </h2>
          <p className="text-gray-600 text-lg">
            カテゴリーを選んで会話を始めましょう
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              isSelected={false}
              onClick={() => onCategorySelect(category)}
            />
          ))}
        </div>

        {/* Additional Features */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            このサービスの特徴
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="text-blue-600" size={32} />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">自然な対話</h4>
              <p className="text-gray-600 text-sm">
                まるで友達と話すような自然な会話で、気軽に相談できます
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="text-green-600" size={32} />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">専門的サポート</h4>
              <p className="text-gray-600 text-sm">
                大学生活に特化した専門的なアドバイスと情報を提供します
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-purple-600" size={32} />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">個別対応</h4>
              <p className="text-gray-600 text-sm">
                あなたの状況に合わせたパーソナライズされたアドバイス
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-600 mb-6">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              24時間365日利用可能
            </span>
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              プライバシー保護
            </span>
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              完全無料
            </span>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">
            ※ このサービスはAIアシスタントです。緊急時や深刻な問題については、<br />
            大学の学生相談室や専門機関にご相談ください。
          </p>
        </div>
      </div>
    </div>
  );
};