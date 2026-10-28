import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import {
  FiArrowRight,
  FiArrowLeft,
  FiShoppingBag,
  FiTruck,
  FiAward,
  FiCheckCircle,
  FiTrendingUp,
  FiUsers,
  FiBox,
  FiMapPin,
  FiPlus,
  FiPackage,
  FiShield,
  FiLayers,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import { addToCart } from '../store/slices/cartSlice';

export default function Home() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isRtl = i18n.language?.startsWith('ar');

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [stats, setStats] = useState({
    vendorsCount: '150+',
    productsCount: '1,200+',
    citiesCount: '3',
  });

  useEffect(() => {
    let isMounted = true;

    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const res = await api.get('/categories');
        const data = res.data?.data || res.data || [];
        if (isMounted) {
          setCategories(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        // Fallback default wholesale categories if api is initializing
        if (isMounted) {
          setCategories([
            { id: '1', name: 'Flour & Grains', name_ar: 'الدقيق والحبوب', icon: 'FiLayers' },
            { id: '2', name: 'Oils & Ghee', name_ar: 'الزيوت والسمن', icon: 'FiBox' },
            { id: '3', name: 'Sugar & Salt', name_ar: 'السكر والملح', icon: 'FiPackage' },
            { id: '4', name: 'Dairy & Cheese', name_ar: 'الألبان والأجبان', icon: 'FiShoppingBag' },
            { id: '5', name: 'Beverages & Juices', name_ar: 'المشروبات والعصائر', icon: 'FiBox' },
            { id: '6', name: 'Canned Food', name_ar: 'المعلبات والأغذية المحفوظة', icon: 'FiPackage' },
          ]);
        }
      } finally {
        if (isMounted) setLoadingCategories(false);
      }
    };

    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await api.get('/products?per_page=8');
        const data = res.data?.data || res.data?.products || res.data || [];
        if (isMounted) {
          setProducts(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error fetching featured products:', err);
        if (isMounted) {
          setProducts([]);
        }
      } finally {
        if (isMounted) setLoadingProducts(false);
      }
    };

    fetchCategories();
    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddToCart = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(
      addToCart({
        product,
        productId: product.id || product._id,
        quantity: Number(product.min_order_qty || product.min_order || 1),
      })
    );
    toast.success(
      isRtl
        ? `تمت إضافة "${product.name_ar || product.name}" إلى السلة`
        : `Added "${product.name || product.name_en || 'Product'}" to cart`
    );
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-16">
      {/* 1. Hero Banner */}
      <section className="relative overflow-hidden bg-linear-to-r from-[#16A34A] to-[#15803D] text-white">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 end-0 -mt-16 -me-16 w-96 h-96 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 start-0 -mb-20 -ms-20 w-80 h-80 rounded-full bg-[#EAB308]/20 blur-xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 space-y-6 text-start">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-medium">
                <FiMapPin className="text-[#EAB308] w-4 h-4" />
                <span>
                  {t('common.khartoum')} • {t('common.omdurman')} • {t('common.bahri')}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                {isRtl ? 'سوقك للمواد الغذائية في الخرطوم' : 'Your Grocery Marketplace in Khartoum'}
              </h1>

              <p className="text-base sm:text-xl text-green-50 max-w-2xl font-normal leading-relaxed">
                {isRtl
                  ? 'منصة التجارة الإلكترونية بالجملة الأولى في السودان. نربط محلات البقالة وتجار التجزئة بأفضل مصانع وموردي الأغذية بأسعار الجملة المباشرة وتوصيل فوري.'
                  : 'Sudan’s leading B2B wholesale marketplace connecting grocery retailers and supermarkets directly with verified manufacturers and distributors at genuine wholesale prices.'}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#EAB308] hover:bg-[#CA8A04] text-white font-extrabold text-base shadow-lg shadow-yellow-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <span>{isRtl ? 'ابدأ التسوق' : 'Start Shopping'}</span>
                  {isRtl ? <FiArrowLeft className="w-5 h-5" /> : <FiArrowRight className="w-5 h-5" />}
                </Link>

                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-white hover:bg-gray-100 text-[#16A34A] font-bold text-base shadow-md transition"
                >
                  <span>{t('auth.register_as_vendor')}</span>
                </Link>
              </div>
            </div>

            {/* Hero Quick Badge Box */}
            <div className="lg:col-span-4 hidden lg:flex flex-col gap-4">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl text-white shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAB308] text-white flex items-center justify-center font-bold">
                    <FiShield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base">
                      {isRtl ? 'أمان وضمان 100%' : '100% Guaranteed Quality'}
                    </h4>
                    <p className="text-xs text-white/80">
                      {isRtl ? 'بضائع مفحوصة ومطابقة للمواصفات' : 'Verified Sudanese suppliers'}
                    </p>
                  </div>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between text-xs text-green-100">
                  <span>{isRtl ? 'دفع عبر تطبيق بنكك' : 'Bankak Supported'}</span>
                  <span className="font-bold text-[#EAB308]">✓ Verified</span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl text-white shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white text-[#16A34A] flex items-center justify-center font-bold">
                    <FiTruck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base">
                      {isRtl ? 'توصيل مباشر لباب متجرك' : 'Direct Store Delivery'}
                    </h4>
                    <p className="text-xs text-white/80">
                      {isRtl ? 'أسطول شاحنات مجهز لنقل البضائع' : 'Within Khartoum state & states'}
                    </p>
                  </div>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between text-xs text-green-100">
                  <span>{isRtl ? 'تتبع لحظي للشحنة' : 'Live Tracking'}</span>
                  <span className="font-bold text-white">24/7</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Stats Bar */}
      <section className="relative -mt-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 z-20">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-gray-100">
          <div className="flex flex-col items-center justify-center pt-2 sm:pt-0">
            <div className="flex items-center gap-3 mb-1">
              <FiUsers className="w-6 h-6 text-[#16A34A]" />
              <span className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                {stats.vendorsCount}
              </span>
            </div>
            <span className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">
              {isRtl ? 'مورد معتمد وشركة تصنيع' : 'Verified Food Vendors'}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center pt-4 sm:pt-0">
            <div className="flex items-center gap-3 mb-1">
              <FiBox className="w-6 h-6 text-[#EAB308]" />
              <span className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                {stats.productsCount}
              </span>
            </div>
            <span className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">
              {isRtl ? 'منتج جملة متوفر بالمخازن' : 'Wholesale Grocery Products'}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center pt-4 sm:pt-0">
            <div className="flex items-center gap-3 mb-1">
              <FiMapPin className="w-6 h-6 text-[#16A34A]" />
              <span className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                {stats.citiesCount}
              </span>
            </div>
            <span className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">
              {isRtl ? 'مدن مغطاة بالكامل (الخرطوم، أم درمان، بحري)' : 'Cities Fully Served'}
            </span>
          </div>
        </div>
      </section>

      {/* 3. Featured Categories Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-[#16A34A] uppercase tracking-wider">
              {isRtl ? 'تصفح الأصناف' : 'Explore Catalog'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mt-1">
              {t('products.categories')}
            </h2>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#16A34A] hover:text-[#15803D] hover:underline"
          >
            <span>{isRtl ? 'عرض الكل' : 'View All'}</span>
            {isRtl ? <FiArrowLeft className="w-4 h-4" /> : <FiArrowRight className="w-4 h-4" />}
          </Link>
        </div>

        {loadingCategories ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="h-28 bg-white rounded-2xl animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {categories.map((cat, index) => {
              const catName = isRtl ? cat.name_ar || cat.name : cat.name || cat.name_en;
              return (
                <Link
                  key={cat.id || cat._id || index}
                  to={`/shop?category=${encodeURIComponent(cat.slug || cat.id || cat.name)}`}
                  className="group bg-white rounded-2xl p-5 border border-gray-200/70 hover:border-[#16A34A] hover:shadow-md transition-all flex flex-col items-center text-center gap-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-green-50 text-[#16A34A] group-hover:bg-[#16A34A] group-hover:text-white transition-colors flex items-center justify-center font-bold shadow-xs">
                    <FiLayers className="w-7 h-7" />
                  </div>
                  <span className="text-sm font-bold text-gray-800 group-hover:text-[#16A34A] line-clamp-1 transition-colors">
                    {catName}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Featured Products Section (Horizontal Scrollable) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-[#EAB308] uppercase tracking-wider">
              {isRtl ? 'الأكثر طلباً بالجملة' : 'Bestsellers'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mt-1">
              {isRtl ? 'منتجات مميزة لمتجرك' : 'Featured Products'}
            </h2>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#16A34A] hover:text-[#15803D] hover:underline"
          >
            <span>{isRtl ? 'تسوق كل السلع' : 'Shop All Products'}</span>
            {isRtl ? <FiArrowLeft className="w-4 h-4" /> : <FiArrowRight className="w-4 h-4" />}
          </Link>
        </div>

        {loadingProducts ? (
          <div className="flex gap-6 overflow-x-auto pb-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-72 shrink-0 h-80 bg-white rounded-3xl animate-pulse border border-gray-100"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-gray-200">
            <FiBox className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">
              {isRtl ? 'لا تتوفر منتجات حالياً' : 'No featured products yet'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {isRtl ? 'تفضل بزيارة صفحة المتجر للاطلاع على القائمة الكاملة' : 'Visit our shop to see all available inventory'}
            </p>
            <Link
              to="/shop"
              className="inline-block px-6 py-2.5 bg-[#16A34A] text-white rounded-xl text-sm font-bold hover:bg-[#15803D]"
            >
              {t('nav.shop')}
            </Link>
          </div>
        ) : (
          <div className="flex gap-5 overflow-x-auto pb-4 pt-1 snap-x no-scrollbar">
            {products.map((item) => {
              const productId = item.id || item._id;
              const prodName = isRtl ? item.name_ar || item.name : item.name || item.name_en;
              const vendorName = item.vendor?.business_name || item.vendor_name || 'FoodX Wholesale';
              const price = item.price || 0;
              const unit = item.unit || 'piece';
              const minQty = item.min_order_qty || item.min_order || 1;

              return (
                <div
                  key={productId}
                  onClick={() => navigate(`/products/${productId}`)}
                  className="w-64 sm:w-72 shrink-0 snap-start bg-white rounded-3xl border border-gray-200/80 hover:border-[#16A34A] hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden cursor-pointer group"
                >
                  <div className="relative p-4 bg-gray-50 flex items-center justify-center h-44 overflow-hidden">
                    {item.image_url || item.image ? (
                      <img
                        src={item.image_url || item.image}
                        alt={prodName}
                        className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <FiPackage className="w-16 h-16 text-gray-300" />
                    )}
                    <span className="absolute top-3 end-3 px-2.5 py-1 bg-[#EAB308] text-white text-[10px] font-extrabold rounded-lg shadow-2xs">
                      {isRtl ? `أدنى طلب: ${minQty}` : `Min: ${minQty}`}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-1 line-clamp-1">{vendorName}</p>
                      <h3 className="font-bold text-gray-900 text-sm group-hover:text-[#16A34A] transition-colors line-clamp-2 leading-snug">
                        {prodName}
                      </h3>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-black text-gray-900">{price.toLocaleString()}</span>
                          <span className="text-xs font-bold text-gray-500">{t('products.sdg')}</span>
                        </div>
                        <span className="text-[11px] text-gray-400">
                          {isRtl ? `لكل ${unit}` : `per ${unit}`}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleAddToCart(e, item)}
                        className="p-2.5 bg-green-50 hover:bg-[#16A34A] text-[#16A34A] hover:text-white rounded-xl transition shadow-2xs"
                        title={t('products.add_to_cart')}
                      >
                        <FiPlus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Why FoodX Section (3 Cards) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20 sm:mt-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-[#16A34A] uppercase tracking-wider">
            {isRtl ? 'لماذا منصة FoodX؟' : 'Why Choose FoodX'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mt-1">
            {isRtl ? 'الحل الأمثل لإمداد وتزويد محلات التجزئة' : 'The Smarter Way to Stock Your Grocery'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Wide Selection */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition text-start flex flex-col items-start">
            <div className="w-14 h-14 rounded-2xl bg-green-100 text-[#16A34A] flex items-center justify-center font-bold mb-6">
              <FiShoppingBag className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 mb-3">
              {isRtl ? 'تشكيلة واسعة وشاملة' : 'Wide Selection'}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {isRtl
                ? 'أكثر من ألف صنف من المواد التموينية الأساسية: دقيق، زيوت، سكر، معلبات، وبقوليات من أكبر المطاحن والمصانع السودانية في مكان واحد.'
                : 'Browse thousands of wholesale essential food items: flour, cooking oils, sugar, canned foods, and grains directly from top Sudanese producers.'}
            </p>
          </div>

          {/* Card 2: Fast Delivery */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition text-start flex flex-col items-start">
            <div className="w-14 h-14 rounded-2xl bg-yellow-100 text-[#CA8A04] flex items-center justify-center font-bold mb-6">
              <FiTruck className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 mb-3">
              {isRtl ? 'توصيل سريع وموثوق' : 'Fast Delivery'}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {isRtl
                ? 'شحن سريع ومباشر إلى باب متجرك في الخرطوم، بحري، وأم درمان دون عناء الذهاب للأسواق المركزية والازدحام.'
                : 'Reliable doorstep shipping directly to your retail storefront across Khartoum, Bahri, and Omdurman without market hassle.'}
            </p>
          </div>

          {/* Card 3: Best Prices */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition text-start flex flex-col items-start">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-[#16A34A] flex items-center justify-center font-bold mb-6">
              <FiTrendingUp className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 mb-3">
              {isRtl ? 'أفضل أسعار الجملة' : 'Best Prices'}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {isRtl
                ? 'أسعار مصنع وتوزيع حقيقية بدون وسطاء متعددين، مع خيارات دفع مرنة تشمل تطبيق بنكك، الدفع عند الاستلام، ومحفظة FoodX.'
                : 'Genuine direct-from-factory wholesale rates with flexible payments: Bankak transfer, Cash on Delivery, and instant FoodX Wallet.'}
            </p>
          </div>
        </div>
      </section>

      {/* Call to action footer banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="bg-linear-to-r from-gray-900 to-[#15803D] rounded-3xl p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center md:text-start">
            <h3 className="text-2xl sm:text-3xl font-black">
              {isRtl ? 'هل أنت مورد أو تاجر جملة؟' : 'Are You a Wholesale Supplier?'}
            </h3>
            <p className="text-gray-300 text-sm max-w-xl">
              {isRtl
                ? 'انضم إلى شبكة موردي FoodX واعرض بضائعك لآلاف متاجر التجزئة والسوبرماركت في السودان الآن.'
                : 'Join the FoodX vendor network and distribute your stock to thousands of retailers across Sudan.'}
            </p>
          </div>
          <Link
            to="/register"
            className="shrink-0 px-8 py-3.5 bg-[#EAB308] hover:bg-[#CA8A04] text-white font-extrabold rounded-2xl shadow-md transition"
          >
            {t('auth.register_as_vendor')}
          </Link>
        </div>
      </section>
    </div>
  );
}
