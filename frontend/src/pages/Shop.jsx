import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import {
  FiSearch,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiPackage,
  FiX,
  FiShoppingBag,
  FiSliders,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import { addToCart } from '../store/slices/cartSlice';

function ProductCard({ product, onAddToCart, isRtl, t }) {
  const navigate = useNavigate();
  const productId = product.id || product._id;
  const name = isRtl ? product.name_ar || product.name : product.name || product.name_en;
  const price = product.price || 0;
  const unit = product.unit || 'piece';
  const minQty = product.min_order_qty || product.min_order || 1;
  const vendorName = product.vendor?.business_name || product.vendor_name || 'FoodX Vendor';
  const stock = product.stock_qty ?? product.stock ?? 100;
  const isOutOfStock = stock <= 0;

  return (
    <div
      onClick={() => navigate(`/products/${productId}`)}
      className="bg-white rounded-3xl border border-gray-200/80 hover:border-[#16A34A] hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden cursor-pointer group"
    >
      <div className="relative p-4 bg-gray-50 flex items-center justify-center h-48 overflow-hidden">
        {product.image_url || product.image ? (
          <img
            src={product.image_url || product.image}
            alt={name}
            className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <FiPackage className="w-16 h-16 text-gray-300" />
        )}

        <div className="absolute top-3 end-3 flex flex-col gap-1 items-end">
          <span className="px-2.5 py-1 bg-[#EAB308] text-white text-[11px] font-extrabold rounded-lg shadow-2xs">
            {isRtl ? `أدنى طلب: ${minQty}` : `Min: ${minQty}`}
          </span>
          {isOutOfStock && (
            <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-md">
              {t('products.out_of_stock')}
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-xs text-gray-400 font-medium block mb-1 line-clamp-1">
            {vendorName}
          </span>
          <h3 className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-[#16A34A] transition-colors line-clamp-2 leading-snug">
            {name}
          </h3>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-black text-gray-900">
                {price.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-gray-500">{t('products.sdg')}</span>
            </div>
            <span className="text-[11px] text-gray-400">
              {isRtl ? `لكل ${unit}` : `per ${unit}`}
            </span>
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={(e) => onAddToCart(e, product)}
            className={`p-3 rounded-2xl transition shadow-xs flex items-center justify-center ${
              isOutOfStock
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-[#16A34A] hover:bg-[#15803D] text-white active:scale-95'
            }`}
            title={t('products.add_to_cart')}
          >
            <FiPlus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Shop() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const isRtl = i18n.language?.startsWith('ar');

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filter States initialized from query params
  const currentCategory = searchParams.get('category') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentMinPrice = searchParams.get('min_price') || '';
  const currentMaxPrice = searchParams.get('max_price') || '';
  const currentSort = searchParams.get('sort') || 'newest';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState(currentSearch);
  const [minPriceInput, setMinPriceInput] = useState(currentMinPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(currentMaxPrice);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Fetch Categories once
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/categories');
        const data = res.data?.data || res.data || [];
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setCategories([
          { id: 'flour', name: 'Flour & Grains', name_ar: 'الدقيق والحبوب', count: 24 },
          { id: 'oil', name: 'Oils & Ghee', name_ar: 'الزيوت والسمن', count: 18 },
          { id: 'sugar', name: 'Sugar & Salt', name_ar: 'السكر والملح', count: 12 },
          { id: 'dairy', name: 'Dairy Products', name_ar: 'منتجات الألبان', count: 15 },
          { id: 'canned', name: 'Canned Goods', name_ar: 'الأغذية المحفوظة', count: 30 },
        ]);
      }
    };
    fetchCats();
  }, []);

  // Fetch Products whenever URL search params change
  useEffect(() => {
    let active = true;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (currentCategory) params.append('category', currentCategory);
        if (currentSearch) params.append('search', currentSearch);
        if (currentMinPrice) params.append('min_price', currentMinPrice);
        if (currentMaxPrice) params.append('max_price', currentMaxPrice);
        if (currentSort) params.append('sort', currentSort);
        params.append('page', currentPage.toString());
        params.append('per_page', '12');

        const res = await api.get(`/products?${params.toString()}`);
        const data = res.data?.data || res.data;

        if (active) {
          const list = Array.isArray(data)
            ? data
            : data?.products || data?.items || [];
          setProducts(list);
          setTotalPages(data?.totalPages || data?.pages || Math.ceil((data?.total || list.length) / 12) || 1);
          setTotalCount(data?.total || data?.count || list.length);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
        if (active) {
          setProducts([]);
          setTotalPages(1);
          setTotalCount(0);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProducts();
    return () => {
      active = false;
    };
  }, [currentCategory, currentSearch, currentMinPrice, currentMaxPrice, currentSort, currentPage]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    // Reset to page 1 on filter changes
    if (key !== 'page') {
      next.set('page', '1');
    }
    setSearchParams(next);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParam('search', searchInput.trim());
  };

  const handlePriceApply = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (minPriceInput) next.set('min_price', minPriceInput);
    else next.delete('min_price');

    if (maxPriceInput) next.set('max_price', maxPriceInput);
    else next.delete('max_price');

    next.set('page', '1');
    setSearchParams(next);
    setMobileFilterOpen(false);
  };

  const handleClearAll = () => {
    setSearchInput('');
    setMinPriceInput('');
    setMaxPriceInput('');
    setSearchParams({});
    setMobileFilterOpen(false);
  };

  const handleAddToCart = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    const minQty = Number(product.min_order_qty || product.min_order || 1);
    dispatch(
      addToCart({
        product,
        productId: product.id || product._id,
        quantity: minQty,
      })
    );
    const prodName = isRtl ? product.name_ar || product.name : product.name || product.name_en;
    toast.success(
      isRtl ? `تمت إضافة "${prodName}" إلى السلة` : `Added "${prodName}" to cart`
    );
  };

  const sidebarContent = (
    <div className="space-y-6">
      {/* Categories Filter */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
          <h3 className="font-extrabold text-gray-900 text-base">
            {t('products.categories')}
          </h3>
          {currentCategory && (
            <button
              onClick={() => updateParam('category', '')}
              className="text-xs font-semibold text-[#16A34A] hover:underline"
            >
              {isRtl ? 'إلغاء التحديد' : 'Clear'}
            </button>
          )}
        </div>

        <ul className="space-y-1.5">
          <li>
            <button
              onClick={() => updateParam('category', '')}
              className={`w-full text-start px-3 py-2 rounded-xl text-sm font-semibold transition flex items-center justify-between ${
                !currentCategory
                  ? 'bg-[#16A34A] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{t('products.all_categories')}</span>
            </button>
          </li>
          {categories.map((cat) => {
            const catId = cat.slug || cat.id || cat.name;
            const isSelected = currentCategory === catId;
            const catName = isRtl ? cat.name_ar || cat.name : cat.name || cat.name_en;
            return (
              <li key={cat.id || cat._id || cat.name}>
                <button
                  onClick={() => updateParam('category', catId)}
                  className={`w-full text-start px-3 py-2 rounded-xl text-sm font-medium transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#16A34A] text-white font-bold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="truncate">{catName}</span>
                  {cat.count !== undefined && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {cat.count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Price Range Filter */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs">
        <h3 className="font-extrabold text-gray-900 text-base pb-3 border-b border-gray-100 mb-4">
          {t('products.price')} ({t('products.sdg')})
        </h3>
        <form onSubmit={handlePriceApply} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                {isRtl ? 'الحد الأدنى' : 'Min Price'}
              </label>
              <input
                type="number"
                placeholder="0"
                value={minPriceInput}
                onChange={(e) => setMinPriceInput(e.target.value)}
                className="w-full bg-[#F9FAFB] border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                {isRtl ? 'الحد الأقصى' : 'Max Price'}
              </label>
              <input
                type="number"
                placeholder="100,000"
                value={maxPriceInput}
                onChange={(e) => setMaxPriceInput(e.target.value)}
                className="w-full bg-[#F9FAFB] border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              {t('products.filter')}
            </button>
            {(currentMinPrice || currentMaxPrice) && (
              <button
                type="button"
                onClick={() => {
                  setMinPriceInput('');
                  setMaxPriceInput('');
                  const next = new URLSearchParams(searchParams);
                  next.delete('min_price');
                  next.delete('max_price');
                  setSearchParams(next);
                }}
                className="px-3 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-200 transition"
              >
                {t('common.cancel')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Breadcrumb / Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {t('products.title')}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {totalCount > 0
                ? isRtl
                  ? `عرض ${totalCount} منتج بالجملة`
                  : `Showing ${totalCount} wholesale products`
                : ''}
            </p>
          </div>

          {/* Mobile Filter Toggle Button */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 shadow-xs"
            >
              <FiSliders className="w-4 h-4 text-[#16A34A]" />
              <span>{t('products.filter')}</span>
            </button>
          </div>
        </div>

        {/* Layout Grid: Sidebar + Main Area */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Desktop Left Sidebar */}
          <aside className="hidden md:block md:col-span-4 lg:col-span-3 sticky top-24">
            {sidebarContent}
          </aside>

          {/* Mobile Drawer */}
          {mobileFilterOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden">
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-xs"
                onClick={() => setMobileFilterOpen(false)}
              />
              <div className="relative w-80 max-w-[85%] bg-[#F9FAFB] h-full shadow-2xl p-6 overflow-y-auto z-10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
                    <h2 className="text-lg font-black text-gray-900">{t('products.filter')}</h2>
                    <button
                      onClick={() => setMobileFilterOpen(false)}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-900"
                    >
                      <FiX className="w-6 h-6" />
                    </button>
                  </div>
                  {sidebarContent}
                </div>
                <div className="pt-6">
                  <button
                    onClick={handleClearAll}
                    className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold"
                  >
                    {isRtl ? 'إعادة ضبط كل الفلاتر' : 'Reset All Filters'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <section className="md:col-span-8 lg:col-span-9 space-y-6">
            {/* Top Bar: Search Bar + Sort Dropdown */}
            <div className="bg-white rounded-3xl p-4 border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-4">
              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t('nav.search_placeholder')}
                  className="w-full bg-[#F9FAFB] border border-gray-200 rounded-2xl ps-11 pe-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] transition"
                />
                <button
                  type="submit"
                  className="absolute inset-y-0 start-0 ps-3.5 flex items-center text-gray-400 hover:text-[#16A34A]"
                >
                  <FiSearch className="w-5 h-5" />
                </button>
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      updateParam('search', '');
                    }}
                    className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </form>

              {/* Sort By Dropdown */}
              <div className="w-full sm:w-auto flex items-center gap-2 shrink-0">
                <label className="text-xs font-bold text-gray-500 whitespace-nowrap hidden lg:block">
                  {t('products.sort_by')}:
                </label>
                <select
                  value={currentSort}
                  onChange={(e) => updateParam('sort', e.target.value)}
                  className="w-full sm:w-auto bg-[#F9FAFB] border border-gray-200 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-700 focus:outline-none focus:border-[#16A34A] cursor-pointer"
                >
                  <option value="newest">{t('products.newest')}</option>
                  <option value="price_asc">{t('products.price_low')}</option>
                  <option value="price_desc">{t('products.price_high')}</option>
                </select>
              </div>
            </div>

            {/* Active Filters Pill Bar */}
            {(currentCategory || currentSearch || currentMinPrice || currentMaxPrice) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-gray-400">
                  {isRtl ? 'فلاتر مطبقة:' : 'Active filters:'}
                </span>

                {currentCategory && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-[#16A34A] text-xs font-bold rounded-xl border border-green-200">
                    <span>{t('products.categories')}: {currentCategory}</span>
                    <button onClick={() => updateParam('category', '')}>
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}

                {currentSearch && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-[#CA8A04] text-xs font-bold rounded-xl border border-yellow-200">
                    <span>"{currentSearch}"</span>
                    <button onClick={() => {
                      setSearchInput('');
                      updateParam('search', '');
                    }}>
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}

                {(currentMinPrice || currentMaxPrice) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200">
                    <span>
                      {currentMinPrice || '0'} - {currentMaxPrice || '∞'} {t('products.sdg')}
                    </span>
                    <button
                      onClick={() => {
                        setMinPriceInput('');
                        setMaxPriceInput('');
                        const next = new URLSearchParams(searchParams);
                        next.delete('min_price');
                        next.delete('max_price');
                        setSearchParams(next);
                      }}
                    >
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}

                <button
                  onClick={handleClearAll}
                  className="text-xs font-bold text-red-500 hover:underline ms-2"
                >
                  {isRtl ? 'مسح الكل' : 'Clear all'}
                </button>
              </div>
            )}

            {/* Products Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="h-80 bg-white rounded-3xl animate-pulse border border-gray-100"
                  />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/80 space-y-4">
                <FiPackage className="w-16 h-16 text-gray-300 mx-auto" />
                <h3 className="text-lg font-bold text-gray-800">
                  {t('products.no_products')}
                </h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  {isRtl
                    ? 'جرب البحث بكلمات أخرى أو قم بإلغاء بعض الفلاتر لعرض نتائج أكثر.'
                    : 'Try clearing some filters or searching for generic grocery items like flour, oil, or sugar.'}
                </p>
                <button
                  onClick={handleClearAll}
                  className="px-6 py-2.5 bg-[#16A34A] text-white rounded-xl text-sm font-bold hover:bg-[#15803D] transition shadow-xs"
                >
                  {isRtl ? 'إعادة تعيين الفلاتر' : 'Reset Filters'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((prod) => (
                  <ProductCard
                    key={prod.id || prod._id}
                    product={prod}
                    onAddToCart={handleAddToCart}
                    isRtl={isRtl}
                    t={t}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white rounded-3xl p-4 border border-gray-200/80 shadow-xs flex items-center justify-between mt-8">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => updateParam('page', (currentPage - 1).toString())}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                    currentPage <= 1
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {isRtl ? <FiChevronRight className="w-4 h-4" /> : <FiChevronLeft className="w-4 h-4" />}
                  <span>{t('common.previous')}</span>
                </button>

                <div className="text-xs font-bold text-gray-600">
                  <span>{t('common.page')} {currentPage} {t('common.of')} {totalPages}</span>
                </div>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => updateParam('page', (currentPage + 1).toString())}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                    currentPage >= totalPages
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{t('common.next')}</span>
                  {isRtl ? <FiChevronLeft className="w-4 h-4" /> : <FiChevronRight className="w-4 h-4" />}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
