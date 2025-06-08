import React, { useState } from 'react';
import { ChatCategory } from './types';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ChatInterface } from './components/ChatInterface';
import { chatCategories } from './data/categories';

function App() {
  const [selectedCategory, setSelectedCategory] = useState<ChatCategory | null>(null);

  const handleCategorySelect = (category: ChatCategory) => {
    setSelectedCategory(category);
  };

  const handleBackToWelcome = () => {
    setSelectedCategory(null);
  };

  return (
    <div className="h-screen overflow-hidden">
      {selectedCategory ? (
        <ChatInterface 
          category={selectedCategory} 
          onBack={handleBackToWelcome}
        />
      ) : (
        <WelcomeScreen 
          categories={chatCategories}
          onCategorySelect={handleCategorySelect}
        />
      )}
    </div>
  );
}

export default App;