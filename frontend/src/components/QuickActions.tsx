import React from 'react';

interface QuickActionsProps {
  actions: string[];
  onActionClick: (action: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions, onActionClick }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={() => onActionClick(action)}
          className="px-4 py-2 text-sm bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 rounded-full border border-blue-200 hover:from-blue-100 hover:to-purple-100 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
        >
          {action}
        </button>
      ))}
    </div>
  );
};