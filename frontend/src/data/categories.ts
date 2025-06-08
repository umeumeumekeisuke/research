import { ChatCategory } from '../types';

export const chatCategories: ChatCategory[] = [
  {
    id: 'academic',
    name: '学習サポート',
    icon: 'BookOpen',
    description: '勉強法、課題支援、履修計画のアドバイス',
    color: 'bg-blue-500',
    quickActions: [
      '効果的な勉強スケジュールを教えて',
      'レポートの書き方を知りたい',
      '試験対策のコツは？',
      '単位取得のアドバイス'
    ]
  },
  {
    id: 'campus',
    name: 'キャンパスライフ',
    icon: 'Users',
    description: 'サークル活動、イベント、学内施設の情報',
    color: 'bg-green-500',
    quickActions: [
      'おすすめのサークルを教えて',
      '学園祭の準備について',
      '図書館の利用方法',
      '学食のおすすめメニュー'
    ]
  },
  {
    id: 'mental-health',
    name: 'メンタルヘルス',
    icon: 'Heart',
    description: 'ストレス管理、心の健康維持をサポート',
    color: 'bg-purple-500',
    quickActions: [
      'ストレス解消法を教えて',
      '不安な気持ちを和らげたい',
      '良い睡眠のコツは？',
      '相談窓口を知りたい'
    ]
  },
  {
    id: 'career',
    name: '就職・キャリア',
    icon: 'Briefcase',
    description: '就職活動、インターン、将来設計の相談',
    color: 'bg-indigo-500',
    quickActions: [
      '就活の始め方を教えて',
      'ES（エントリーシート）の書き方',
      '面接対策のポイント',
      'インターンシップの探し方'
    ]
  },
  {
    id: 'financial',
    name: '生活・お金の相談',
    icon: 'DollarSign',
    description: '生活費管理、奨学金、アルバイトの相談',
    color: 'bg-amber-500',
    quickActions: [
      '一人暮らしの家計管理',
      'おすすめのアルバイト',
      '奨学金について知りたい',
      '節約のコツを教えて'
    ]
  },
  {
    id: 'life',
    name: '日常生活サポート',
    icon: 'Home',
    description: '一人暮らし、健康管理、人間関係の悩み',
    color: 'bg-rose-500',
    quickActions: [
      '一人暮らしの始め方',
      '友達作りのコツ',
      '健康的な生活習慣',
      '時間管理の方法'
    ]
  }
];