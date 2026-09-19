import React from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';

export const SearchBar = ({
  searchQuery,
  onSearchChange,
  activeType,
  onTypeChange,
  sortBy,
  onSortChange,
}) => {
  return (
    <div className="search-filter-wrapper">
      {/* Search Input Box */}
      <div className="search-input-box">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search by dish name, ingredients, or taste..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            className="search-clear-btn"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter Row: Veg/Non-Veg Toggle & Sort Selector */}
      <div className="filter-controls-row">
        {/* Veg / Non-Veg / All Filter Pills */}
        <div className="dietary-filter-group">
          <button
            className={`filter-pill ${activeType === 'all' ? 'active' : ''}`}
            onClick={() => onTypeChange('all')}
          >
            All Items
          </button>
          <button
            className={`filter-pill veg-pill ${activeType === 'veg' ? 'active' : ''}`}
            onClick={() => onTypeChange('veg')}
          >
            <span className="dietary-dot-indicator veg-dot" /> Pure Veg
          </button>
          <button
            className={`filter-pill nonveg-pill ${activeType === 'nonveg' ? 'active' : ''}`}
            onClick={() => onTypeChange('nonveg')}
          >
            <span className="dietary-dot-indicator nonveg-dot" /> Non-Veg
          </button>
        </div>

        {/* Sort Dropdown */}
        <div className="sort-selector-container">
          <SlidersHorizontal size={14} className="sort-icon" />
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Sort dishes"
          >
            <option value="popularity">Most Popular</option>
            <option value="rating">Top Rated</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>
    </div>
  );
};
