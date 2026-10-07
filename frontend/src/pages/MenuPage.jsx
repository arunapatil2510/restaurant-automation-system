import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  ShoppingBag, 
  MapPin, 
  RotateCcw, 
  ArrowRight, 
  Sparkles, 
  UtensilsCrossed,
  AlertCircle,
  RefreshCw,
  Mic
} from 'lucide-react';
import { getCategories, getMenuItems } from '../services/menuService';
import { CategoryTabs } from '../components/menu/CategoryTabs';
import { SearchBar } from '../components/menu/SearchBar';
import { FoodCard } from '../components/menu/FoodCard';
import { DishDetailModal } from '../components/menu/DishDetailModal';
import { VoiceOrderModal } from '../components/voice/VoiceOrderModal';
import { VoiceOrderButton } from '../components/voice/VoiceOrderButton';
import { useCart } from '../context/CartContext';

export const MenuPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { tableNumber, setTableNumber, totalItems, totalAmount } = useCart();

  const [categoriesList, setCategoriesList] = useState([]);
  const [dishesList, setDishesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const initialCategory = searchParams.get('category') || 'all';
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState('all'); // 'all', 'veg', 'nonveg'
  const [sortBy, setSortBy] = useState('popularity'); // 'popularity', 'rating', 'price-asc', 'price-desc'

  // Selected dish for popup modal
  const [selectedDish, setSelectedDish] = useState(null);

  // Voice Assistant Modal State
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // 1. Synchronize table parameter from URL (e.g. /menu?table=7)
  useEffect(() => {
    const tableParam = searchParams.get('table');
    if (tableParam) {
      const parsed = parseInt(tableParam, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 20) {
        setTableNumber(parsed);
      }
    }
  }, [searchParams, setTableNumber]);

  // 2. Fetch Categories and Initial Menu from Express API
  const loadMenuData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, items] = await Promise.all([getCategories(), getMenuItems()]);
      setCategoriesList(cats);
      setDishesList(items);
    } catch (err) {
      console.error('Error fetching menu from Express API:', err);
      setError('Unable to load menu from server. Please check your backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenuData();
  }, []);

  // 3. Filter and Sort Dishes locally
  const filteredDishes = useMemo(() => {
    let result = [...dishesList];

    // Filter by Category
    if (activeCategory && activeCategory !== 'all') {
      result = result.filter(d => d.categorySlug === activeCategory);
    }

    // Filter by Type (Veg / Non-Veg)
    if (activeType && activeType !== 'all') {
      result = result.filter(d => d.type === activeType);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        (d.ingredients && d.ingredients.some(ing => ing.toLowerCase().includes(q))) ||
        (d.dietaryTags && d.dietaryTags.some(tag => tag.toLowerCase().includes(q)))
      );
    }

    // Sorting
    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return result;
  }, [dishesList, activeCategory, activeType, searchQuery, sortBy]);

  // Handle category click and update URL
  const handleSelectCategory = (slug) => {
    setActiveCategory(slug);
    const newParams = new URLSearchParams(searchParams);
    if (slug === 'all') {
      newParams.delete('category');
    } else {
      newParams.set('category', slug);
    }
    setSearchParams(newParams);
  };

  const resetAllFilters = () => {
    setActiveCategory('all');
    setSearchQuery('');
    setActiveType('all');
    setSortBy('popularity');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('category');
    setSearchParams(newParams);
  };

  return (
    <div className="menu-page-wrapper">
      {/* 1. Sticky Table Context Banner */}
      <div className="table-context-strip">
        <div className="container table-context-content">
          <div className="table-context-info">
            <MapPin size={16} className="table-context-icon" />
            <span>Ordering for: <strong>Table #{tableNumber}</strong></span>
          </div>
          <div className="table-context-actions">
            <button
              className="btn-header-voice"
              onClick={() => setIsVoiceModalOpen(true)}
              title="Speak to order"
            >
              <Mic size={14} /> Voice Order
            </button>
            <Link to="/qr-access" className="table-switch-link">
              Change Table QR
            </Link>
          </div>
        </div>
      </div>

      <div className="container menu-page-content">
        {/* Page Heading */}
        <div className="menu-page-header">
          <h1 className="menu-page-title">Digital Restaurant Menu</h1>
          <p className="menu-page-subtitle">
            Browse authentic dishes crafted fresh to order. Customize your meal or use our voice assistant to order instantly.
          </p>
        </div>

        {/* 2. Prominent Voice Ordering Banner */}
        <VoiceOrderButton onClick={() => setIsVoiceModalOpen(true)} />

        {/* API Error State */}
        {error && (
          <div className="api-error-banner" style={{ marginBottom: '1.5rem' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
            <button className="btn btn-sm btn-outline" onClick={loadMenuData}>
              <RefreshCw size={14} /> Retry Loading
            </button>
          </div>
        )}

        {/* 3. Category Scroll Tabs */}
        {!error && (
          <CategoryTabs
            categories={categoriesList}
            activeCategory={activeCategory}
            onSelectCategory={handleSelectCategory}
          />
        )}

        {/* 4. Search & Filter Bar */}
        {!error && (
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeType={activeType}
            onTypeChange={setActiveType}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        )}

        {/* 5. Active Filters summary pill row */}
        {(activeCategory !== 'all' || activeType !== 'all' || searchQuery) && !error && (
          <div className="active-filters-bar">
            <span>Showing results for:</span>
            {activeCategory !== 'all' && (
              <span className="active-filter-chip">
                Category: <strong>{activeCategory}</strong>
              </span>
            )}
            {activeType !== 'all' && (
              <span className="active-filter-chip">
                Type: <strong>{activeType === 'veg' ? 'Pure Veg' : 'Non-Veg'}</strong>
              </span>
            )}
            {searchQuery && (
              <span className="active-filter-chip">
                Search: <strong>"{searchQuery}"</strong>
              </span>
            )}
            <button className="btn-reset-filters" onClick={resetAllFilters}>
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        )}

        {/* 6. Food Items Grid */}
        {loading ? (
          <div className="menu-loading-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-food-card" />
            ))}
          </div>
        ) : filteredDishes.length > 0 ? (
          <div className="food-grid">
            {filteredDishes.map((dish) => (
              <FoodCard
                key={dish.id}
                dish={dish}
                onOpenDetails={(d) => setSelectedDish(d)}
              />
            ))}
          </div>
        ) : !error ? (
          /* Empty Search / Filter State */
          <div className="empty-menu-state">
            <div className="empty-state-icon">
              <UtensilsCrossed size={48} />
            </div>
            <h3>No dishes found</h3>
            <p>We couldn't find any dishes matching your current filter criteria.</p>
            <button className="btn btn-primary btn-md" onClick={resetAllFilters}>
              <RotateCcw size={16} /> View All Menu Items
            </button>
          </div>
        ) : null}
      </div>

      {/* 7. Floating Voice Action Button */}
      <VoiceOrderButton variant="floating" onClick={() => setIsVoiceModalOpen(true)} />

      {/* 8. Sticky Bottom Mobile Cart Bar */}
      {totalItems > 0 && (
        <div className="sticky-mobile-cart-bar">
          <div className="container sticky-cart-content">
            <div className="sticky-cart-info">
              <div className="sticky-cart-badge">
                <ShoppingBag size={18} />
                <span>{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
              </div>
              <div className="sticky-cart-price">
                <span className="label">Total:</span>
                <span className="value">₹{totalAmount}</span>
              </div>
            </div>
            <Link to="/cart" className="btn btn-primary sticky-cart-btn">
              View Cart <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}

      {/* Dish Details Modal */}
      <DishDetailModal
        dish={selectedDish}
        isOpen={Boolean(selectedDish)}
        onClose={() => setSelectedDish(null)}
      />

      {/* Voice Food Ordering Modal */}
      <VoiceOrderModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        menuItems={dishesList}
      />
    </div>
  );
};
