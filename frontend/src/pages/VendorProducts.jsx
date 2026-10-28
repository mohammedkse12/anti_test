import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiSearch,
  FiImage,
  FiPackage,
  FiCheck,
  FiX,
  FiAlertTriangle,
  FiFilter,
  FiRefreshCw,
  FiTag,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

import api from '../services/api';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';

const UNIT_OPTIONS = [
  { value: 'piece', labelKey: 'products.piece', fallback: 'Piece' },
  { value: 'kg', labelKey: 'products.kg', fallback: 'Kilogram (kg)' },
  { value: 'box', labelKey: 'products.box', fallback: 'Box' },
  { value: 'carton', labelKey: 'products.carton', fallback: 'Carton' },
  { value: 'sack', labelKey: 'products.sack', fallback: 'Sack / Bag' },
];

export default function VendorProducts() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isRtl = i18n.language?.startsWith('ar');
  const { user } = useSelector((state) => state.auth);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submittingForm, setSubmittingForm] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form Fields
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descAr, setDescAr] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('piece');
  const [minOrderQty, setMinOrderQty] = useState('1');
  const [stockQty, setStockQty] = useState('100');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/categories');
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) {
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      const data = res.data?.data || res.data;
      const list = Array.isArray(data) ? data : data?.products || data?.items || [];
      setProducts(list);
    } catch (err) {
      console.error('Failed to load vendor products:', err);
      toast.error(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [fetchCategories, fetchProducts]);

  // Handle open modal via url parameter ?action=add
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'add') {
      openAddModal();
    }
  }, [location.search]);

  // Open modal for Adding
  const openAddModal = () => {
    setEditingProduct(null);
    setNameEn('');
    setNameAr('');
    setDescEn('');
    setDescAr('');
    setCategoryId(categories[0]?.id?.toString() || '');
    setPrice('');
    setUnit('piece');
    setMinOrderQty('1');
    setStockQty('100');
    setImageUrl('');
    setIsActive(true);
    setIsFormModalOpen(true);
  };

  // Open modal for Editing
  const openEditModal = (prod) => {
    setEditingProduct(prod);
    setNameEn(prod.name_en || prod.name || '');
    setNameAr(prod.name_ar || prod.name || '');
    setDescEn(prod.description_en || prod.description || '');
    setDescAr(prod.description_ar || prod.description || '');
    setCategoryId(prod.category_id?.toString() || prod.category?.id?.toString() || '');
    setPrice(prod.price?.toString() || '');
    setUnit(prod.unit || 'piece');
    setMinOrderQty(prod.min_order_qty?.toString() || '1');
    setStockQty(prod.stock_qty?.toString() || '0');
    setImageUrl(prod.image_url || '');
    setIsActive(prod.is_active !== false);
    setIsFormModalOpen(true);
  };

  // Save product (POST or PUT)
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!nameEn.trim() || !nameAr.trim()) {
      toast.error(isRtl ? 'يرجى إدخال اسم المنتج باللغتين' : 'Please provide product name in both English & Arabic');
      return;
    }

    const numPrice = parseFloat(price);
    if (!numPrice || numPrice <= 0) {
      toast.error(isRtl ? 'يرجى إدخال سعر صحيح' : 'Please provide a valid price');
      return;
    }

    if (!categoryId) {
      toast.error(isRtl ? 'يرجى اختيار التصنيف' : 'Please select a category');
      return;
    }

    try {
      setSubmittingForm(true);

      const payload = {
        name_en: nameEn.trim(),
        name_ar: nameAr.trim(),
        description_en: descEn.trim() || null,
        description_ar: descAr.trim() || null,
        category_id: parseInt(categoryId, 10),
        price: numPrice,
        unit: unit || 'piece',
        min_order_qty: parseInt(minOrderQty, 10) || 1,
        stock_qty: parseInt(stockQty, 10) || 0,
        image_url: imageUrl.trim() || null,
        is_active: Boolean(isActive),
      };

      if (editingProduct) {
        // PUT update
        await api.put(`/products/${editingProduct.id}`, payload);
        toast.success(isRtl ? 'تم تحديث بيانات المنتج بنجاح' : 'Product updated successfully');
      } else {
        // POST create
        await api.post('/products', payload);
        toast.success(isRtl ? 'تمت إضافة المنتج بنجاح' : 'Product created successfully');
      }

      setIsFormModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error('Failed to save product:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || t('common.error');
      toast.error(errMsg);
    } finally {
      setSubmittingForm(false);
    }
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      setDeleting(true);
      await api.delete(`/products/${productToDelete.id}`);
      toast.success(isRtl ? 'تم حذف / إيقاف تنشيط المنتج' : 'Product deactivated successfully');
      setDeleteModalOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (err) {
      console.error('Failed to delete product:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || t('common.error');
      toast.error(errMsg);
    } finally {
      setDeleting(false);
    }
  };

  // Filter products by search and category
  const filteredProducts = products.filter((prod) => {
    const matchesSearch =
      !searchQuery.trim() ||
      (prod.name_en && prod.name_en.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (prod.name_ar && prod.name_ar.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (prod.name && prod.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' ||
      prod.category_id?.toString() === selectedCategory ||
      prod.category?.id?.toString() === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const formatSdg = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Title and Add Product Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-green-50 text-[#16A34A] flex items-center justify-center text-xl shadow-xs">
              <FiPackage className="w-5 h-5" />
            </span>
            {t('vendor.products', 'Products Management')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {isRtl
              ? 'إدارة مخزون السلع الغذائية، الأسعار، وحدات البيع، وحالة التوفر'
              : 'Manage wholesale catalog, pricing, units of measure, and active inventory'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchProducts}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-[#16A34A] hover:border-[#16A34A] transition shadow-xs cursor-pointer"
            title={t('common.filter', 'Refresh')}
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#16A34A]' : ''}`} />
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#14532D] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-green-700/20 transition cursor-pointer"
          >
            <FiPlus className="w-4 h-4" />
            <span>{t('vendor.add_product', 'Add Product')}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xl shadow-gray-200/30 flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <FiSearch className="absolute start-3.5 top-3.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isRtl
                ? 'ابحث بالاسم باللغة العربية أو الإنجليزية...'
                : 'Search product by name in Arabic or English...'
            }
            className="w-full ps-10 pe-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition"
          />
        </div>

        {/* Category Filter */}
        <div className="sm:w-60">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition cursor-pointer"
          >
            <option value="all">{t('products.all_categories', 'All Categories')}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id.toString()}>
                {isRtl ? cat.name_ar || cat.name_en : cat.name_en || cat.name_ar}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
        {loading ? (
          <div className="py-20">
            <LoadingSpinner size="lg" text={t('common.loading')} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<FiPackage className="w-8 h-8" />}
              title={
                products.length === 0
                  ? t('products.no_products', 'No products listed yet')
                  : isRtl
                  ? 'لا توجد منتجات مطابقة للبحث'
                  : 'No products match your filters'
              }
              description={
                products.length === 0
                  ? isRtl
                    ? 'أضف أول منتج غذائي إلى متجرك للبدء في تلقي طلبات الجملة.'
                    : 'Add your first wholesale product to start receiving retailer orders.'
                  : isRtl
                  ? 'جرب البحث بكلمة مختلفة أو اختر تصنيفاً آخر.'
                  : 'Try searching with another keyword or change your category filter.'
              }
              actionText={products.length === 0 ? t('vendor.add_product', 'Add Product') : undefined}
              onAction={products.length === 0 ? openAddModal : undefined}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100 text-gray-500 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-6 text-start">{isRtl ? 'المنتج' : 'Product'}</th>
                  <th className="py-3.5 px-6 text-start">{t('products.categories', 'Category')}</th>
                  <th className="py-3.5 px-6 text-end">{t('products.price', 'Price')}</th>
                  <th className="py-3.5 px-6 text-center">{t('products.unit', 'Unit')}</th>
                  <th className="py-3.5 px-6 text-center">{t('products.stock', 'Stock')}</th>
                  <th className="py-3.5 px-6 text-center">{t('orders.status', 'Status')}</th>
                  <th className="py-3.5 px-6 text-end">{isRtl ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredProducts.map((prod) => {
                  const displayName = isRtl
                    ? prod.name_ar || prod.name_en || prod.name
                    : prod.name_en || prod.name_ar || prod.name;
                  const altName = isRtl ? prod.name_en : prod.name_ar;

                  return (
                    <tr key={prod.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Thumbnail & Bilingual Name */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {prod.image_url ? (
                              <img
                                src={prod.image_url}
                                alt={displayName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <FiPackage className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{displayName}</div>
                            {altName && <div className="text-[11px] text-gray-400">{altName}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-6 whitespace-nowrap text-gray-600">
                        {prod.category?.name_en || prod.category?.name_ar || 'Wholesale'}
                      </td>

                      {/* Price */}
                      <td className="py-4 px-6 text-end whitespace-nowrap font-black text-gray-900">
                        {formatSdg(prod.price)}{' '}
                        <span className="text-xs font-bold text-gray-400">
                          {t('products.sdg', 'SDG')}
                        </span>
                      </td>

                      {/* Unit */}
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold">
                          {t(`products.${prod.unit}`, prod.unit)}
                        </span>
                      </td>

                      {/* Stock */}
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <span
                          className={`font-mono font-bold ${
                            prod.stock_qty <= 10 ? 'text-red-600' : 'text-gray-900'
                          }`}
                        >
                          {prod.stock_qty ?? 0}
                        </span>
                        <div className="text-[10px] text-gray-400">
                          Min: {prod.min_order_qty || 1}
                        </div>
                      </td>

                      {/* Active Status */}
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        {prod.is_active !== false ? (
                          <Badge variant="success" dot size="sm">
                            {isRtl ? 'نشط' : 'Active'}
                          </Badge>
                        ) : (
                          <Badge variant="neutral" dot size="sm">
                            {isRtl ? 'معطل' : 'Inactive'}
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-end whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(prod)}
                            className="p-2 rounded-xl text-gray-600 hover:text-[#16A34A] hover:bg-green-50 transition cursor-pointer"
                            title={t('common.edit', 'Edit')}
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setProductToDelete(prod);
                              setDeleteModalOpen(true);
                            }}
                            className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title={t('common.delete', 'Delete')}
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={
          editingProduct
            ? t('vendor.edit_product', 'Edit Product')
            : t('vendor.add_product', 'Add New Product')
        }
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name EN */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {isRtl ? 'اسم المنتج (بالإنجليزية)' : 'Product Name (English)'} *
              </label>
              <input
                type="text"
                required
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. White Sugar 50kg Sack"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition"
              />
            </div>

            {/* Name AR */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {isRtl ? 'اسم المنتج (بالعربية)' : 'Product Name (Arabic)'} *
              </label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="مثال: سكر كنانة زنة 50 كيلو"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition"
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {t('products.categories', 'Category')} *
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition cursor-pointer"
              >
                <option value="">{isRtl ? '-- اختر التصنيف --' : '-- Select Category --'}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {isRtl ? c.name_ar || c.name_en : c.name_en || c.name_ar}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit Dropdown */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {t('products.unit', 'Unit of Measure')} *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition cursor-pointer"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {t(u.labelKey, u.fallback)}
                  </option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {t('products.price', 'Unit Price')} ({t('products.sdg', 'SDG')}) *
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 85000"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition"
              />
            </div>

            {/* Stock Quantity */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {t('products.stock', 'Stock Quantity')} *
              </label>
              <input
                type="number"
                min="0"
                required
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                placeholder="e.g. 200"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition"
              />
            </div>

            {/* Min Order Qty */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {t('products.min_order', 'Minimum Order Quantity')} *
              </label>
              <input
                type="number"
                min="1"
                required
                value={minOrderQty}
                onChange={(e) => setMinOrderQty(e.target.value)}
                placeholder="e.g. 5"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition"
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {isRtl ? 'رابط صورة المنتج (URL)' : 'Product Image URL'}
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition"
              />
            </div>

            {/* Description EN */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {isRtl ? 'الوصف (بالإنجليزية)' : 'Description (English)'}
              </label>
              <textarea
                rows={2}
                value={descEn}
                onChange={(e) => setDescEn(e.target.value)}
                placeholder="High quality wholesale sugar in factory packaging..."
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition resize-none"
              />
            </div>

            {/* Description AR */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {isRtl ? 'الوصف (بالعربية)' : 'Description (Arabic)'}
              </label>
              <textarea
                rows={2}
                value={descAr}
                onChange={(e) => setDescAr(e.target.value)}
                placeholder="سكر أبيض نقي مطحون بالجملة للمخابز والسوبرماركت..."
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition resize-none"
              />
            </div>

            {/* Is Active Toggle */}
            <div className="sm:col-span-2 flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="is-active-chk"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-[#16A34A] focus:ring-[#16A34A] rounded-md border-gray-300 cursor-pointer"
              />
              <label htmlFor="is-active-chk" className="text-xs font-bold text-gray-800 cursor-pointer select-none">
                {isRtl ? 'عرض المنتج في متجر الجملة (نشط)' : 'List product in active B2B marketplace'}
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={submittingForm}
              className="px-6 py-2 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#14532D] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {submittingForm && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{t('common.save', 'Save Product')}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={t('common.delete', 'Deactivate Product')}
        size="sm"
      >
        <div className="text-center py-2 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <FiAlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">
              {isRtl ? 'هل أنت متأكد من رغبتك في حذف هذا المنتج؟' : 'Are you sure you want to delete this product?'}
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              {productToDelete?.name_en || productToDelete?.name_ar || productToDelete?.name}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-100 cursor-pointer"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {deleting ? t('common.loading') : t('common.delete', 'Delete')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
