import React from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  ShoppingBag, 
  CalendarCheck, 
  Tag, 
  ChefHat, 
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { menuItems, offers } from '../../data/mockData';

export const AdminOverviewPage = () => {
  const { adminUser } = useAuth();

  const statCards = [
    { title: 'Total Menu Dishes', value: menuItems.length, icon: <UtensilsCrossed size={22} />, color: '#16a34a', bg: '#dcfce7', link: '/admin/menu' },
    { title: 'In-Stock Dishes', value: menuItems.filter(i => i.isAvailable !== false).length, icon: <Sparkles size={22} />, color: '#0284c7', bg: '#e0f2fe', link: '/admin/menu' },
    { title: 'Active Promo Codes', value: offers.length, icon: <Tag size={22} />, color: '#ea580c', bg: '#ffedd5', link: '/admin/offers' },
    { title: 'Tables Managed', value: '20 Tables', icon: <CalendarCheck size={22} />, color: '#9333ea', bg: '#f3e8ff', link: '/admin/reservations' },
  ];

  const quickModules = [
    {
      title: 'Menu Management',
      desc: 'Add new dishes, update pricing, and toggle instant stock availability (In Stock / Sold Out).',
      icon: <UtensilsCrossed size={24} />,
      link: '/admin/menu',
      badge: 'CRUD'
    },
    {
      title: 'Live Order Queue',
      desc: 'View real-time dine-in orders received from table QR codes and customer checkouts.',
      icon: <ShoppingBag size={24} />,
      link: '/admin/orders',
      badge: 'Live'
    },
    {
      title: 'Table Reservations',
      desc: 'Manage customer table booking requests, dates, and party size confirmations.',
      icon: <CalendarCheck size={24} />,
      link: '/admin/reservations',
      badge: 'Bookings'
    },
    {
      title: 'Kitchen Display (KDS)',
      desc: 'Dedicated 4-column kitchen station board for chefs to start preparation and mark orders ready.',
      icon: <ChefHat size={24} />,
      link: '/admin/kitchen',
      badge: 'Kitchen'
    },
    {
      title: 'Promotional Offers',
      desc: 'Create discount coupon codes (e.g. FLAT20) and configure minimum order values.',
      icon: <Tag size={24} />,
      link: '/admin/offers',
      badge: 'Discounts'
    },
  ];

  return (
    <div className="admin-page-container">
      {/* Welcome Banner */}
      <div className="admin-welcome-banner">
        <div>
          <span className="admin-welcome-pill">
            <ShieldCheck size={14} /> Authenticated Staff Session
          </span>
          <h1 className="admin-welcome-title">
            Welcome, {adminUser?.name || 'Manager'} 👋
          </h1>
          <p className="admin-welcome-subtitle">
            RESTOSMART Restaurant Automation Management Hub. Choose a module below to manage your restaurant operations.
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="admin-stats-grid">
        {statCards.map((stat, idx) => (
          <Link key={idx} to={stat.link} className="admin-stat-card">
            <div className="admin-stat-icon-box" style={{ background: stat.bg, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="admin-stat-info">
              <span className="admin-stat-val">{stat.value}</span>
              <span className="admin-stat-label">{stat.title}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Operational Modules Section */}
      <div className="admin-section-block">
        <h3 className="admin-section-heading">Operational Modules</h3>
        <div className="admin-modules-grid">
          {quickModules.map((mod, idx) => (
            <Link key={idx} to={mod.link} className="admin-module-card">
              <div className="admin-module-top">
                <div className="admin-module-icon">{mod.icon}</div>
                <span className="admin-module-badge">{mod.badge}</span>
              </div>
              <h4 className="admin-module-title">{mod.title}</h4>
              <p className="admin-module-desc">{mod.desc}</p>
              <div className="admin-module-link">
                <span>Open Module</span>
                <ArrowRight size={15} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
