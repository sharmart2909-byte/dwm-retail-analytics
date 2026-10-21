import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { customerApi, cartApi } from '../api';
import { ShoppingBag, Search, Sparkles, Clock, Package, ArrowRight, User, LogOut, X, TrendingUp, DollarSign, AlertCircle, ShoppingCart, Trash2, Plus, Minus, CheckCircle, ArrowLeft } from 'lucide-react';

export default function CustomerPortalPage() {
  const { user, logout } = useAuth();

  // Tab state: 'browse' | 'recommendations' | 'orders' | 'cart'
  const [activeTab, setActiveTab] = useState('browse');

  // Catalog state
  const [catalog, setCatalog] = useState([]);
  const [search, setSearch] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(null);

  // Personalized recommendations state (Tab 2)
  const [personalizedData, setPersonalizedData] = useState(null);
  const [personalizedLoading, setPersonalizedLoading] = useState(true);

  // Purchase history state (Tab 3)
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState('');

  // Suggestions Modal state (When user clicks "View Suggestions" on any product)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState(null);
  const [modalSuggestions, setModalSuggestions] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Toast / feedback message
  const [toastMessage, setToastMessage] = useState(null);

  // Cart state (Tab 4)
  const [cart, setCart] = useState({
    items: [],
    itemCount: 0,
    totalQuantity: 0,
    totalAmount: 0.00
  });
  const [cartLoading, setCartLoading] = useState(false);
  const [cartUpdatingId, setCartUpdatingId] = useState(null);
  const [orderSuccessModal, setOrderSuccessModal] = useState(false);

  const getStorageKey = () => `retail_cart_${user?.userId || user?.username || 'user'}`;

  const saveAndSetCart = (newCart) => {
    setCart(newCart);
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(newCart));
    } catch (e) {}
  };

  const fetchCart = async () => {
    setCartLoading(true);
    try {
      const saved = localStorage.getItem(getStorageKey());
      if (saved) {
        setCart(JSON.parse(saved));
      }
    } catch (e) {}

    try {
      const res = await cartApi.getCart();
      if (res.data) {
        const serverCart = {
          items: res.data.items || [],
          itemCount: res.data.itemCount || (res.data.items ? res.data.items.length : 0),
          totalQuantity: res.data.totalQuantity || 0,
          totalAmount: Number(res.data.totalAmount || 0)
        };
        saveAndSetCart(serverCart);
      }
    } catch (err) {
      console.warn('Backend cart endpoint offline or unauthenticated, running with local cart session:', err);
    } finally {
      setCartLoading(false);
    }
  };

  const handleAddToCart = async (product, quantity = 1) => {
    const pId = product.product_id || product.productId;
    const price = Number(product.unit_price || product.unitPrice || 2.99);
    const stockCode = product.stock_code || product.stockCode || 'N/A';
    const description = product.description || 'Product Item';

    try {
      if (pId) {
        const res = await cartApi.addItem(pId, quantity);
        if (res.data && res.data.items) {
          const updated = {
            items: res.data.items,
            itemCount: res.data.itemCount || res.data.items.length,
            totalQuantity: res.data.totalQuantity || res.data.items.reduce((s, i) => s + i.quantity, 0),
            totalAmount: Number(res.data.totalAmount || 0)
          };
          saveAndSetCart(updated);
          showToast(`Added "${description}" to basket!`);
          return;
        }
      }
    } catch (err) {
      console.warn('API addItem notice, maintaining local session cart:', err);
    }

    // Local cart fallback
    setCart((prev) => {
      const items = [...prev.items];
      const idx = items.findIndex((it) => (pId && it.productId === pId) || (it.stockCode === stockCode));
      if (idx >= 0) {
        const existing = items[idx];
        const newQty = existing.quantity + quantity;
        items[idx] = {
          ...existing,
          quantity: newQty,
          subtotal: Number((existing.unitPrice * newQty).toFixed(2))
        };
      } else {
        items.push({
          cartItemId: Date.now(),
          productId: pId || Date.now(),
          stockCode,
          description,
          quantity,
          unitPrice: price,
          subtotal: Number((price * quantity).toFixed(2))
        });
      }
      const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
      const totalAmt = Number(items.reduce((sum, it) => sum + (it.unitPrice * it.quantity), 0).toFixed(2));
      const updated = {
        items,
        itemCount: items.length,
        totalQuantity: totalQty,
        totalAmount: totalAmt
      };
      saveAndSetCart(updated);
      return updated;
    });

    showToast(`Added "${description}" to basket!`);
  };

  const handleUpdateQuantity = async (cartItemId, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(cartItemId);
      return;
    }
    setCartUpdatingId(cartItemId);
    try {
      const res = await cartApi.updateQuantity(cartItemId, newQty);
      if (res.data && res.data.items) {
        const updated = {
          items: res.data.items,
          itemCount: res.data.itemCount || res.data.items.length,
          totalQuantity: res.data.totalQuantity || res.data.items.reduce((s, i) => s + i.quantity, 0),
          totalAmount: Number(res.data.totalAmount || 0)
        };
        saveAndSetCart(updated);
        setCartUpdatingId(null);
        return;
      }
    } catch (err) {
      console.warn('API updateQuantity notice, fallback to local:', err);
    }

    setCart((prev) => {
      const items = prev.items.map((it) => {
        if (it.cartItemId === cartItemId) {
          return {
            ...it,
            quantity: newQty,
            subtotal: Number((it.unitPrice * newQty).toFixed(2))
          };
        }
        return it;
      });
      const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
      const totalAmt = Number(items.reduce((sum, it) => sum + (it.unitPrice * it.quantity), 0).toFixed(2));
      const updated = {
        items,
        itemCount: items.length,
        totalQuantity: totalQty,
        totalAmount: totalAmt
      };
      saveAndSetCart(updated);
      return updated;
    });
    setCartUpdatingId(null);
  };

  const handleRemoveItem = async (cartItemId) => {
    setCartUpdatingId(cartItemId);
    try {
      const res = await cartApi.removeItem(cartItemId);
      if (res.data && res.data.items) {
        const updated = {
          items: res.data.items,
          itemCount: res.data.itemCount || res.data.items.length,
          totalQuantity: res.data.totalQuantity || res.data.items.reduce((s, i) => s + i.quantity, 0),
          totalAmount: Number(res.data.totalAmount || 0)
        };
        saveAndSetCart(updated);
        showToast('Item removed from basket');
        setCartUpdatingId(null);
        return;
      }
    } catch (err) {
      console.warn('API removeItem notice, fallback to local:', err);
    }

    setCart((prev) => {
      const items = prev.items.filter((it) => it.cartItemId !== cartItemId);
      const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
      const totalAmt = Number(items.reduce((sum, it) => sum + (it.unitPrice * it.quantity), 0).toFixed(2));
      const updated = {
        items,
        itemCount: items.length,
        totalQuantity: totalQty,
        totalAmount: totalAmt
      };
      saveAndSetCart(updated);
      return updated;
    });
    showToast('Item removed from basket');
    setCartUpdatingId(null);
  };

  const handleClearCart = async () => {
    try {
      await cartApi.clearCart();
    } catch (err) {
      console.warn('API clearCart notice:', err);
    }
    const empty = { items: [], itemCount: 0, totalQuantity: 0, totalAmount: 0.00 };
    saveAndSetCart(empty);
    showToast('Basket cleared');
  };

  useEffect(() => {
    fetchCatalog();
    fetchPersonalizedRecommendations();
    fetchOrders();
    fetchCart();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchCatalog = async (searchTerm = '') => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const res = await customerApi.getCatalog(searchTerm, 48);
      setCatalog(res.data || []);
    } catch (err) {
      console.error('Failed to load catalog:', err);
      setCatalogError('Unable to load product catalog. Please ensure the backend service is running.');
    } finally {
      setCatalogLoading(false);
    }
  };

  const fetchPersonalizedRecommendations = async () => {
    setPersonalizedLoading(true);
    try {
      const res = await customerApi.getRecommendations('');
      setPersonalizedData(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load personalized recommendations:', err);
    } finally {
      setPersonalizedLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await customerApi.getOrders();
      setOrders(res.data || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCatalog(search);
  };

  const handleClearSearch = () => {
    setSearch('');
    fetchCatalog('');
  };

  // Open Suggestions for a specific product
  const handleOpenSuggestions = async (product) => {
    setModalProduct(product);
    setModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    setModalSuggestions(null);

    try {
      const res = await customerApi.getRecommendations(product.stock_code);
      setModalSuggestions(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load product suggestions:', err);
      setModalError('Could not load recommendation suggestions for this item.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalProduct(null);
    setModalSuggestions(null);
    setModalError(null);
  };

  // Metrics for Order History
  const totalSpent = orders.reduce((sum, ord) => sum + Number(ord.total_amount || 0), 0);
  const totalUnits = orders.reduce((sum, ord) => sum + Number(ord.quantity || 0), 0);
  const filteredOrders = orders.filter((o) => {
    if (!orderSearch.trim()) return true;
    const term = orderSearch.toLowerCase();
    return (
      (o.description && o.description.toLowerCase().includes(term)) ||
      (o.stock_code && o.stock_code.toLowerCase().includes(term)) ||
      String(o.sale_id).includes(term)
    );
  });

  // Recommendations list
  const personalizedList = personalizedData?.recommendations || [];
  const bestsellersList = personalizedData?.bestsellers || [];
  const isNewCustomer = personalizedData?.is_new_customer ?? (orders.length === 0);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#1e293b' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: 500
        }}>
          <Sparkles size={16} color="#38bdf8" />
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 30
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <ShoppingBag size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Online Retail Shopper Portal
            </h1>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
              AI Market Basket Analytics & Personalized Recommendations
            </p>
          </div>
        </div>

        {/* Customer Profile, Cart & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Header Cart Quick Access Button */}
          <button
            type="button"
            onClick={() => setActiveTab('cart')}
            className={`btn ${activeTab === 'cart' ? 'btn-primary' : 'btn-outline'}`}
            style={{
              padding: '7px 14px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              borderRadius: '8px',
              cursor: 'pointer'
            }}
            title="View My Shopping Cart"
          >
            <ShoppingCart size={16} />
            <span>My Cart</span>
            {cart.totalQuantity > 0 && (
              <span style={{
                backgroundColor: activeTab === 'cart' ? '#ffffff' : '#2563eb',
                color: activeTab === 'cart' ? '#2563eb' : '#ffffff',
                borderRadius: '999px',
                padding: '1px 7px',
                fontSize: '11px',
                fontWeight: 700
              }}>
                {cart.totalQuantity}
              </span>
            )}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#e0e7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3730a3',
              fontWeight: 600
            }}>
              <User size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{user?.fullName || user?.username}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Customer ID: {user?.customerId || 'GUEST'}</div>
            </div>
          </div>

          <button
            onClick={logout}
            className="btn btn-outline"
            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('browse')}
            className={`btn ${activeTab === 'browse' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
          >
            <ShoppingBag size={16} />
            Browse Products & Catalog
            {catalog.length > 0 && (
              <span className="badge badge-blue" style={{ marginLeft: '4px' }}>{catalog.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`btn ${activeTab === 'recommendations' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
          >
            <Sparkles size={16} />
            Recommended For You
            {personalizedList.length > 0 && (
              <span className="badge badge-green" style={{ marginLeft: '4px' }}>{personalizedList.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
          >
            <Clock size={16} />
            My Purchase History
            {orders.length > 0 && (
              <span className="badge badge-blue" style={{ marginLeft: '4px' }}>{orders.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('cart')}
            className={`btn ${activeTab === 'cart' ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
          >
            <ShoppingCart size={16} />
            My Cart
            {cart.totalQuantity > 0 && (
              <span className="badge badge-blue" style={{ marginLeft: '4px' }}>{cart.totalQuantity}</span>
            )}
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: BROWSE PRODUCTS & CATALOG */}
        {/* =================================================================== */}
        {activeTab === 'browse' && (
          <div>
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products by title or item code (e.g. HEART, LANTERN, 85123A, LUNCH BAG)..."
                  className="input-field"
                  style={{ width: '100%', paddingLeft: '38px', paddingRight: search ? '36px' : '12px' }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button type="submit" className="btn btn-primary" disabled={catalogLoading}>
                {catalogLoading ? 'Searching...' : 'Search'}
              </button>
            </form>

            {catalogError && (
              <div className="card" style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626', marginBottom: '20px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  <AlertCircle size={18} />
                  {catalogError}
                </div>
              </div>
            )}

            {catalogLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
                Loading product catalog from warehouse...
              </div>
            ) : catalog.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: '#ffffff' }}>
                <Package size={40} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>No Products Found</h3>
                <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '400px', margin: '8px auto 16px auto' }}>
                  {search ? `No products matched "${search}". Try searching with different keywords.` : 'The product warehouse catalog is currently empty. An administrator must load and clean a dataset first.'}
                </p>
                {search && (
                  <button onClick={handleClearSearch} className="btn btn-outline">
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {catalog.map((item) => (
                  <div
                    key={item.product_id || item.stock_code}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span className="badge badge-blue">SKU: {item.stock_code}</span>
                        <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '13px' }}>
                          ${Number(item.unit_price || 2.99).toFixed(2)}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '8px 0 12px 0', lineHeight: '1.4' }}>
                        {item.description}
                      </h4>
                    </div>

                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenSuggestions(item)}
                        className="btn btn-outline"
                        style={{
                          fontSize: '12px',
                          padding: '6px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#2563eb',
                          borderColor: '#bfdbfe',
                          backgroundColor: '#eff6ff'
                        }}
                      >
                        <Sparkles size={13} />
                        View Suggestions
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(item)}
                        className="btn btn-primary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        Add to Basket
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: RECOMMENDED FOR YOU (Personalized or New Customer Welcome) */}
        {/* =================================================================== */}
        {activeTab === 'recommendations' && (
          <div>
            <div className="card" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} color="#2563eb" />
                    {isNewCustomer ? 'Welcome to Our Store: Trending Product Recommendations' : 'Personalized Recommendations for Your Account'}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', marginBottom: 0 }}>
                    {personalizedData?.personalized_reason ||
                      (isNewCustomer
                        ? 'Since your account does not have prior purchase history yet, here are the top trending bestsellers across our store. As you purchase items, personalized Apriori cross-sell suggestions will be computed automatically.'
                        : 'Mined from your past transaction history using the Apriori Association Rules algorithm.')}
                  </p>
                </div>
                <span className="badge badge-green" style={{ fontSize: '12px', padding: '4px 10px' }}>
                  Algorithm: Apriori Association Engine
                </span>
              </div>
            </div>

            {personalizedLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
                Calculating personalized association pairings...
              </div>
            ) : personalizedList.length > 0 ? (
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '14px' }}>
                  Pairings Mined From Your Recent Orders:
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {personalizedList.map((rec, idx) => (
                    <div key={idx} style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span className="badge badge-blue">SKU: {rec.stock_code}</span>
                          <span className="badge badge-green" style={{ fontSize: '11px' }}>
                            Lift: {rec.lift || 1.0}x
                          </span>
                        </div>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '8px 0' }}>
                          {rec.description}
                        </h4>
                        <p style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', margin: '6px 0 12px 0' }}>
                          "{rec.recommendation_reason || 'Frequently purchased together with your past orders.'}"
                        </p>
                      </div>

                      <div style={{ paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                            Confidence: {Math.round((rec.confidence || 0.8) * 100)}%
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>
                            ${Number(rec.unit_price || 2.99).toFixed(2)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddToCart(rec)}
                          className="btn btn-primary"
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          Add to Basket
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : bestsellersList.length > 0 ? (
              <div>
                <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '20px', fontSize: '13px', color: '#1e40af' }}>
                  <strong>New Customer Notice:</strong> You have no verified past orders on file. Explore these store bestsellers to begin shopping and seed your personalized recommendation engine!
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {bestsellersList.map((item, idx) => (
                    <div key={idx} style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span className="badge badge-blue">SKU: {item.stock_code}</span>
                          <span className="badge badge-yellow" style={{ fontSize: '11px' }}>
                            Store Bestseller
                          </span>
                        </div>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '8px 0' }}>
                          {item.description}
                        </h4>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          Units Sold: <strong>{item.total_sold}</strong>
                        </div>
                      </div>

                      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenSuggestions(item)}
                          className="btn btn-outline"
                          style={{ fontSize: '12px', padding: '6px 10px', color: '#2563eb' }}
                        >
                          <Sparkles size={13} />
                          Suggestions
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>
                            ${Number(item.unit_price || 2.99).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(item)}
                            className="btn btn-primary"
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                          >
                            Add to Basket
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <Sparkles size={40} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>No Recommendations Available Yet</h3>
                <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '420px', margin: '8px auto 16px auto' }}>
                  No transaction rules have been mined from the current dataset yet. Browse the catalog and view suggestions on any product to inspect market basket pairings.
                </p>
                <button onClick={() => setActiveTab('browse')} className="btn btn-primary">
                  Browse Product Catalog
                </button>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: MY PURCHASE HISTORY */}
        {/* =================================================================== */}
        {activeTab === 'orders' && (
          <div>
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3 className="card-title">
                <Clock size={18} color="#2563eb" />
                Verified Order Records for Account: {user?.username} ({user?.customerId || 'GUEST'})
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                Transaction data queried in real-time from the MySQL Enterprise Data Warehouse (<code>retail_dw.fact_sales</code>).
              </p>
            </div>

            {/* KPI Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <Package size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Total Order Items</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>{orders.length}</div>
                </div>
              </div>

              <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                  <TrendingUp size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Total Quantity Bought</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>{totalUnits}</div>
                </div>
              </div>

              <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea' }}>
                  <DollarSign size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Lifetime Account Spend</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#2563eb' }}>${totalSpent.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {ordersLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
                Retrieving your order records from warehouse...
              </div>
            ) : orders.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: '#ffffff' }}>
                <Clock size={40} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>No Purchase History Found</h3>
                <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '420px', margin: '8px auto 16px auto' }}>
                  No prior transactions were found for customer identifier <strong>{user?.customerId || 'GUEST'}</strong> in the data warehouse. Place your first order by browsing our catalog!
                </p>
                <button onClick={() => setActiveTab('browse')} className="btn btn-primary">
                  Start Shopping
                </button>
              </div>
            ) : (
              <div className="card">
                {/* Search in orders */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                    Purchased Items ({filteredOrders.length} records)
                  </div>
                  <div style={{ maxWidth: '300px', width: '100%' }}>
                    <input
                      type="text"
                      placeholder="Filter by SKU or description..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="input-field"
                      style={{ fontSize: '12px', padding: '6px 12px', width: '100%' }}
                    />
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Sale ID</th>
                        <th>Order Date</th>
                        <th>Product SKU</th>
                        <th>Item Description</th>
                        <th style={{ textAlign: 'right' }}>Quantity</th>
                        <th style={{ textAlign: 'right' }}>Unit Price</th>
                        <th style={{ textAlign: 'right' }}>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((ord, idx) => (
                        <tr key={idx}>
                          <td><span className="badge badge-blue">#{ord.sale_id}</span></td>
                          <td>{ord.year}-{String(ord.month).padStart(2, '0')}-{String(ord.day).padStart(2, '0')}</td>
                          <td><code>{ord.stock_code}</code></td>
                          <td style={{ fontWeight: 600, color: '#0f172a' }}>{ord.description}</td>
                          <td style={{ textAlign: 'right' }}>{ord.quantity}</td>
                          <td style={{ textAlign: 'right' }}>${Number(ord.unit_price).toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                            ${Number(ord.total_amount).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: MY SHOPPING CART */}
        {/* =================================================================== */}
        {activeTab === 'cart' && (
          <div>
            <div className="card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShoppingCart size={20} color="#2563eb" />
                    My Shopping Cart
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
                    Review products added to your basket, adjust quantities, remove items, and view total pricing.
                  </p>
                </div>
                {cart.items.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="btn btn-outline"
                    style={{ fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Trash2 size={14} />
                    Clear Basket
                  </button>
                )}
              </div>
            </div>

            {cartLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
                Loading your shopping basket...
              </div>
            ) : cart.items.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '56px 24px', backgroundColor: '#ffffff' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  color: '#94a3b8'
                }}>
                  <ShoppingCart size={32} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
                  Your Basket is Empty
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '440px', margin: '0 auto 20px auto' }}>
                  You haven't added any products to your basket yet. Explore our store catalog or discover personalized recommendations!
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('browse')}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                >
                  <ShoppingBag size={16} />
                  Start Shopping Catalog
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'flex-start' }}>
                {/* Cart Items Table List */}
                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                  <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>
                      Basket Items ({cart.items.length} {cart.items.length === 1 ? 'item' : 'items'})
                    </span>
                    <span className="badge badge-blue">
                      {cart.totalQuantity} Total Units
                    </span>
                  </div>

                  <div className="table-responsive">
                    <table className="data-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Product Details</th>
                          <th style={{ textAlign: 'right' }}>Unit Price</th>
                          <th style={{ textAlign: 'center' }}>Quantity</th>
                          <th style={{ textAlign: 'right' }}>Subtotal</th>
                          <th style={{ textAlign: 'center' }}>Remove</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.items.map((item) => (
                          <tr key={item.cartItemId || item.productId}>
                            <td style={{ minWidth: '200px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span className="badge badge-blue" style={{ fontSize: '10px', width: 'fit-content' }}>
                                  SKU: {item.stockCode}
                                </span>
                                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                                  {item.description}
                                </span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                              ${Number(item.unitPrice).toFixed(2)}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(item.cartItemId, item.quantity - 1)}
                                  disabled={cartUpdatingId === item.cartItemId || item.quantity <= 1}
                                  className="btn btn-outline"
                                  style={{ padding: '3px 8px', minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  title="Decrease quantity"
                                >
                                  <Minus size={13} />
                                </button>
                                <span style={{
                                  minWidth: '32px',
                                  textAlign: 'center',
                                  fontWeight: 700,
                                  fontSize: '13px',
                                  color: '#0f172a'
                                }}>
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(item.cartItemId, item.quantity + 1)}
                                  disabled={cartUpdatingId === item.cartItemId}
                                  className="btn btn-outline"
                                  style={{ padding: '3px 8px', minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  title="Increase quantity"
                                >
                                  <Plus size={13} />
                                </button>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb', fontSize: '14px' }}>
                              ${Number(item.subtotal || (item.unitPrice * item.quantity)).toFixed(2)}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.cartItemId)}
                                disabled={cartUpdatingId === item.cartItemId}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: '6px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title="Remove item from basket"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ padding: '14px 20px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab('browse')}
                      className="btn btn-outline"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                    >
                      <ArrowLeft size={15} />
                      Continue Shopping
                    </button>
                  </div>
                </div>

                {/* Order Summary Card */}
                <div className="card" style={{ padding: '22px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                    Order Summary
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: '#475569', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Unique Items</span>
                      <strong style={{ color: '#0f172a' }}>{cart.items.length}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Total Units</span>
                      <strong style={{ color: '#0f172a' }}>{cart.totalQuantity}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subtotal</span>
                      <strong style={{ color: '#0f172a' }}>${Number(cart.totalAmount).toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Standard Shipping</span>
                      <span className="badge badge-green" style={{ fontSize: '11px' }}>FREE</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Estimated Sales Tax</span>
                      <strong style={{ color: '#0f172a' }}>$0.00</strong>
                    </div>
                  </div>

                  <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Total Price</span>
                    <span style={{ fontSize: '22px', fontWeight: 800, color: '#2563eb' }}>
                      ${Number(cart.totalAmount).toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOrderSuccessModal(true)}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', fontWeight: 600 }}
                  >
                    Proceed to Checkout
                    <ArrowRight size={16} />
                  </button>

                  <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
                    Real-time basket management with Star Schema sync
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* PRODUCT SUGGESTIONS MODAL (Triggered by "View Suggestions" button) */}
      {/* =================================================================== */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Sparkles size={18} color="#2563eb" />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Market Basket Recommendations
                  </span>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {modalProduct?.description}
                </h3>
                <span className="badge badge-blue" style={{ marginTop: '6px' }}>
                  SKU: {modalProduct?.stock_code}
                </span>
              </div>
              <button
                onClick={handleCloseModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              {modalLoading ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                  <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
                  Mining market basket pairings for SKU {modalProduct?.stock_code}...
                </div>
              ) : modalError ? (
                <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '16px', borderRadius: '8px', fontSize: '13px' }}>
                  {modalError}
                </div>
              ) : modalSuggestions?.recommendations?.length > 0 ? (
                <div>
                  <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>
                    Shoppers who purchased <strong>{modalProduct?.description}</strong> frequently paired their basket with:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {modalSuggestions.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '14px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: '#ffffff',
                          transition: 'border-color 0.2s ease'
                        }}
                      >
                        <div style={{ flex: 1, paddingRight: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span className="badge badge-blue" style={{ fontSize: '10px' }}>SKU: {rec.stock_code}</span>
                            <span className="badge badge-green" style={{ fontSize: '10px' }}>
                              Lift: {rec.lift || 1.0}x
                            </span>
                            <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                              {Math.round((rec.confidence || 0.8) * 100)}% Match
                            </span>
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                            {rec.description}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                            {rec.recommendation_reason || 'Frequently bought together'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>
                            ${Number(rec.unit_price || 2.99).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(rec)}
                            className="btn btn-primary"
                            style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
                          >
                            Add to Basket
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '36px 16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <Package size={36} color="#94a3b8" style={{ margin: '0 auto 8px auto' }} />
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                    No Direct Pairing Rules Found
                  </h4>
                  <p style={{ fontSize: '12px', color: '#64748b', maxWidth: '380px', margin: '6px auto 14px auto' }}>
                    This item has not yet met the minimum support and confidence thresholds in market baskets to generate paired rules.
                  </p>
                  <button
                    onClick={() => {
                      handleCloseModal();
                      setActiveTab('recommendations');
                    }}
                    className="btn btn-outline"
                    style={{ fontSize: '12px' }}
                  >
                    View All Personalized Recommendations
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: '#f8fafc'
            }}>
              <button onClick={handleCloseModal} className="btn btn-outline" style={{ fontSize: '13px' }}>
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order / Checkout Success Modal */}
      {orderSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            maxWidth: '460px',
            width: '100%',
            padding: '28px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#dcfce7',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <CheckCircle size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              Order Placed Successfully!
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Thank you for shopping, <strong>{user?.fullName || user?.username}</strong>! Your order with <strong>{cart.totalQuantity} items</strong> totaling <strong>${Number(cart.totalAmount).toFixed(2)}</strong> has been processed into the sales pipeline.
            </p>
            <button
              type="button"
              onClick={() => {
                handleClearCart();
                setOrderSuccessModal(false);
                setActiveTab('browse');
              }}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: '13px' }}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
