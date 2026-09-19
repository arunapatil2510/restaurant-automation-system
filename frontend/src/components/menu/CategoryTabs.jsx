import React from 'react';

export const CategoryTabs = ({ categories = [], activeCategory = 'all', onSelectCategory }) => {
  return (
    <div className="category-tabs-container">
      <div className="category-tabs-scroll">
        {categories.map((cat) => {
          const isSelected = activeCategory === cat.slug;
          return (
            <button
              key={cat.id || cat.slug}
              className={`category-tab-btn ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectCategory(cat.slug)}
            >
              <span className="category-tab-icon">{cat.icon}</span>
              <span className="category-tab-label">{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
