import React from 'react';
import { ChatCategory } from '../types';
import * as Icons from 'lucide-react';

interface CategoryCardProps {
  category: ChatCategory;
  isSelected: boolean;
  onClick: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, isSelected, onClick }) => {
  const IconComponent = Icons[category.icon as keyof typeof Icons] as React.ComponentType<{ size?: number }>;

  return (
    <button
      onClick={onClick}
      className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left w-full group ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-xl transform scale-105'
          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg hover:transform hover:scale-102'
      }`}
    >
      <div className="flex items-center gap-4 mb-3">
        <div className={`p-3 rounded-xl ${category.color} text-white shadow-md group-hover:shadow-lg transition-shadow duration-300`}>
          <IconComponent size={24} />
        </div>
        <h3 className="font-bold text-gray-800 text-lg">{category.name}</h3>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{category.description}</p>
    </button>
  );
};