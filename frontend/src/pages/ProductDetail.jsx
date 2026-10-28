import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import {
  FiArrowRight,
  FiArrowLeft,
  FiPlus,
  FiMinus,
  FiShoppingCart,
  FiCheckCircle,
  FiAlertCircle,
  FiShield,
  FiStar,
  FiPackage,
  FiTruck,
  FiMapPin,
  FiPhone,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import { addToCart } from '../store/slices/cartSlice';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const isRtl = i18n.language?.startsWith('ar');

  const [product, setProduct] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/products/${id}`);
        const data = res.data?.data || res.data;
        if (!data) throw new Error('Product not found');

        if (active) {
          setProduct(data);
          const minQty = Number(data.min_order_qty || data.min_order || 1);
          setQuantity(minQty);

          const vendorObj = data.vendor || {
            business_name: data.vendor_name || 'Sudan Wholesale Hub',
            rating: 4.8,
            is_verified: true,
            city: 'Khartoum',
            phone: '+249 91 234 5678',
          };
          setVendor(vendorObj);

          // Fetch related products from vendor or category
          if (data.vendor_id || data.vendor?._id || data.vendor?.id) {
            const vId = data.vendor_id || data.vendor?._id || data.vendor?.id;
            try {
              const relRes = await api.get(`/products?vendor_id=${vId}&per_page=4`);
              const relData = relRes.data?.data || relRes.data?.products || relRes.data || [];
              if (active) {
                setRelatedProducts(
                  (Array.isArray(relData) ? relData : []).filter(
                    (p) => (p.id || p._id) !== id
                  )
                );
              }
            } catch (rErr) {
              console.warn('Could not load related products:', rErr);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch product details:', err);
        if (active) {
          setError(err.message || 'Error loading product');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProductDetails();
    return () => {
      active = false;
    };
  }, [id]);

  const minOrderQty = Number(product?.min_order_qty || product?.min_order || 1);
  const stockQty = Number(product?.stock_qty ?? product?.stock ?? 100);
  const isOutOfStock = stockQty <= 0;

  const handleIncrement = () => {
    if (quantity < stockQty) {
      setQuantity((prev) => prev + 1);
    } else {
      toast.error(isRtl ? 'تم الوصول للحد الأقصى للمخزون' : 'Reached max available stock');
    }
  };

  const handleDecrement = () => {
    if (quantity > minOrderQty) {
      setQuantity((prev) => prev - 1);
    } else {
      toast.error(
        isRtl
          ? `الحد الأدنى للطلب هو ${minOrderQty}`
          : `Minimum order quantity is ${minOrderQty}`
      );
    }
  };

  const handleAddToCart = () => {
    if (!product || isOutOfStock) return;
    dispatch(
      addToCart({
        product,
        productId: product.id || product._id,
        quantity: Number(quantity),
      })
    );
    const prodName = isRtl ? product.name_ar || product.name : product.name || product.name_en;
    toast.success(
      isRtl
        ? `تمت إضافة ${quantity} من "${prodName}" إلى السلة`
        : `Added ${quantity} of "${prodName}" to cart`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 h-96 bg-white rounded-3xl animate-pulse border border-gray-100" />
          <div className="lg:col-span-6 space-y-4">
            <div className="h-8 bg-white rounded-xl w-3/4 animate-pulse" />
            <div className="h-6 bg-white rounded-xl w-1/4 animate-pulse" />
            <div className="h-24 bg-white rounded-2xl animate-pulse" />
            <div className="h-16 bg-white rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] py-20 px-4 max-w-xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <FiAlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-gray-900">
          {isRtl ? 'المنتج غير موجود' : 'Product Not Found'}
        </h2>
        <p className="text-sm text-gray-500">
          {isRtl
            ? 'تعذر العثور على تفاصيل هذا الصنف أو ربما تمت إزالته من قبل المورد.'
            : 'Could not find details for this wholesale product or it has been removed.'}
        </p>
        <Link
          to="/shop"
          className="inline-block px-6 py-3 bg-[#16A34A] text-white rounded-xl font-bold hover:bg-[#15803D] transition shadow-xs"
        >
          {t('products.title')}
        </Link>
      </div>
    );
  }

  const name = isRtl ? product.name_ar || product.name : product.name || product.name_en;
  const description = isRtl
    ? product.description_ar || product.description
    : product.description || product.description_en || 'No description available for this product.';
  const price = product.price || 0;
  const unit = product.unit || 'piece';

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
          <Link to="/" className="hover:text-[#16A34A] font-medium">
            {t('nav.home')}
          </Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-[#16A34A] font-medium">
            {t('nav.shop')}
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-bold truncate max-w-xs">{name}</span>
        </div>

        {/* Main Product Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Large Image */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-8 border border-gray-200/80 shadow-xs flex items-center justify-center min-h-[420px] relative overflow-hidden">
            {product.image_url || product.image ? (
              <img
                src={product.image_url || product.image}
                alt={name}
                className="max-h-96 w-auto object-contain hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <FiPackage className="w-32 h-32 text-gray-300" />
            )}

            <div className="absolute top-4 start-4">
              {isOutOfStock ? (
                <span className="px-3.5 py-1.5 bg-red-600 text-white text-xs font-bold rounded-xl shadow-xs">
                  {t('products.out_of_stock')}
                </span>
              ) : (
                <span className="px-3.5 py-1.5 bg-green-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5">
                  <FiCheckCircle className="w-3.5 h-3.5" />
                  <span>{t('products.stock')}</span>
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Product Info & Actions */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <span className="text-xs font-bold text-[#16A34A] uppercase tracking-wider block mb-1">
                {product.category_name || product.category || 'Wholesale Grocery'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
                {name}
              </h1>
            </div>

            {/* Price Box */}
            <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs flex items-baseline justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 block">
                  {t('cart.unit_price')}
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-[#16A34A]">
                    {price.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-gray-600">{t('products.sdg')}</span>
                  <span className="text-xs text-gray-400 ms-1">
                    {isRtl ? `/ ${unit}` : `per ${unit}`}
                  </span>
                </div>
              </div>

              <div className="text-end">
                <span className="text-xs font-semibold text-gray-500 block">
                  {t('products.min_order')}
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {minOrderQty} {unit}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
              <h3 className="text-sm font-extrabold text-gray-900 mb-2">
                {isRtl ? 'وصف المنتج والمواصفات' : 'Product Description'}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {description}
              </p>
            </div>

            {/* Quantity Selector & Add to Cart */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-gray-900 block">
                    {t('cart.quantity')}
                  </span>
                  <span className="text-xs text-gray-400">
                    {isRtl ? `الحد الأدنى: ${minOrderQty} ${unit}` : `Min required: ${minOrderQty} ${unit}`}
                  </span>
                </div>

                <div className="flex items-center gap-3 bg-[#F9FAFB] p-1.5 rounded-2xl border border-gray-200">
                  <button
                    type="button"
                    disabled={quantity <= minOrderQty || isOutOfStock}
                    onClick={handleDecrement}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition shadow-2xs"
                  >
                    <FiMinus className="w-4 h-4" />
                  </button>

                  <span className="w-12 text-center font-black text-gray-900 text-lg">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={handleIncrement}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition shadow-2xs"
                  >
                    <FiPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Total Calculation */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-sm">
                <span className="font-semibold text-gray-600">{t('cart.total')}:</span>
                <span className="text-xl font-black text-gray-900">
                  {(price * quantity).toLocaleString()} {t('products.sdg')}
                </span>
              </div>

              {/* Add to Cart Button */}
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className="w-full py-4 bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-base rounded-2xl shadow-lg shadow-green-700/20 active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiShoppingCart className="w-5 h-5" />
                <span>{t('products.add_to_cart')}</span>
              </button>
            </div>

            {/* Vendor Info Card */}
            {vendor && (
              <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#CA8A04] flex items-center justify-center font-bold text-lg shadow-2xs">
                    {(vendor.business_name || 'V')[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-gray-900 text-sm sm:text-base">
                        {vendor.business_name}
                      </h4>
                      {vendor.is_verified !== false && (
                        <span className="px-2 py-0.5 bg-green-100 text-[#16A34A] text-[10px] font-bold rounded-md flex items-center gap-1">
                          <FiCheckCircle className="w-3 h-3" />
                          <span>{isRtl ? 'موثق' : 'Verified'}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1 text-amber-600 font-semibold">
                        <FiStar className="w-3.5 h-3.5 fill-current" />
                        <span>{vendor.rating || '4.9'}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <FiMapPin className="w-3.5 h-3.5" />
                        <span>{vendor.city || t('common.khartoum')}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/shop?vendor=${vendor.id || vendor._id || ''}`}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  {isRtl ? 'زيارة المتجر' : 'View Store'}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Related Products from Same Vendor */}
        {relatedProducts.length > 0 && (
          <div className="pt-8 border-t border-gray-200">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-6">
              {isRtl ? 'منتجات أخرى من نفس المورد' : 'More Products from this Vendor'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((rel) => {
                const relId = rel.id || rel._id;
                const relName = isRtl ? rel.name_ar || rel.name : rel.name || rel.name_en;
                return (
                  <div
                    key={relId}
                    onClick={() => navigate(`/products/${relId}`)}
                    className="bg-white rounded-3xl border border-gray-200/80 hover:border-[#16A34A] hover:shadow-md transition cursor-pointer p-4 flex flex-col justify-between group"
                  >
                    <div className="h-40 bg-gray-50 rounded-2xl flex items-center justify-center p-2 mb-3">
                      {rel.image_url || rel.image ? (
                        <img
                          src={rel.image_url || rel.image}
                          alt={relName}
                          className="h-full object-contain group-hover:scale-105 transition"
                        />
                      ) : (
                        <FiPackage className="w-12 h-12 text-gray-300" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm line-clamp-1 mb-1 group-hover:text-[#16A34A] transition">
                        {relName}
                      </h4>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-black text-[#16A34A]">
                          {(rel.price || 0).toLocaleString()}
                        </span>
                        <span className="text-xs font-semibold text-gray-500">
                          {t('products.sdg')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
