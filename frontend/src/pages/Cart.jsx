import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import {
  FiTrash2,
  FiPlus,
  FiMinus,
  FiShoppingBag,
  FiTruck,
  FiDollarSign,
  FiCreditCard,
  FiCheckCircle,
  FiArrowRight,
  FiArrowLeft,
  FiAlertCircle,
  FiPackage,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import {
  fetchCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  updateQuantityLocal,
  removeItemLocal,
  clearCartLocal,
  selectCartItems,
  selectCartSubtotal,
  selectCartLoading,
} from '../store/slices/cartSlice';

export default function Cart() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isRtl = i18n.language?.startsWith('ar');

  const cartItems = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartSubtotal);
  const loadingCart = useSelector(selectCartLoading);
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [paymentMethod, setPaymentMethod] = useState('bankak'); // 'cod', 'bankak', 'wallet'
  const [walletBalance, setWalletBalance] = useState(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [shippingAddress, setShippingAddress] = useState(user?.address || 'الخرطوم - السوق المركزي');
  const [city, setCity] = useState(user?.city || 'Khartoum');
  const [notes, setNotes] = useState('');

  // Fixed or dynamic delivery fee (SDG 3,000 flat wholesale delivery in Khartoum)
  const deliveryFee = cartItems.length > 0 ? 3000 : 0;
  const grandTotal = subtotal + deliveryFee;

  // On mount, load cart from server & wallet balance
  useEffect(() => {
    dispatch(fetchCart());

    const loadWallet = async () => {
      if (isAuthenticated) {
        try {
          const res = await api.get('/wallet');
          const data = res.data?.data || res.data;
          setWalletBalance(data?.balance ?? 0);
        } catch (err) {
          console.warn('Could not fetch wallet balance:', err);
          setWalletBalance(0);
        }
      }
    };
    loadWallet();
  }, [dispatch, isAuthenticated]);

  // Group items by vendor
  const groupedByVendor = useMemo(() => {
    const groups = {};
    cartItems.forEach((item) => {
      const vendorName =
        item.vendor?.business_name ||
        item.product?.vendor?.business_name ||
        item.vendor_name ||
        item.product?.vendor_name ||
        (isRtl ? 'مورد معتمد' : 'Verified Vendor');

      if (!groups[vendorName]) {
        groups[vendorName] = [];
      }
      groups[vendorName].push(item);
    });
    return groups;
  }, [cartItems, isRtl]);

  const handleQuantityChange = async (item, newQty) => {
    const itemId = item._id || item.id || item.productId;
    const minQty = Number(item.product?.min_order_qty || item.min_order_qty || 1);

    if (newQty < minQty) {
      toast.error(
        isRtl
          ? `الحد الأدنى للطلب لهذا الصنف هو ${minQty}`
          : `Minimum order quantity is ${minQty}`
      );
      return;
    }

    // Optimistic local update
    dispatch(updateQuantityLocal({ itemId, quantity: newQty }));

    // Sync with backend if logged in
    try {
      await api.put(`/cart/items/${itemId}`, { quantity: newQty });
    } catch (err) {
      // Background sync error handled gracefully
      console.warn('Backend cart item update:', err.message);
    }
  };

  const handleRemove = async (item) => {
    const itemId = item._id || item.id || item.productId;
    dispatch(removeItemLocal(itemId));
    try {
      await api.delete(`/cart/items/${itemId}`);
    } catch (err) {
      console.warn('Backend cart remove:', err.message);
    }
    toast.success(isRtl ? 'تم حذف الصنف من السلة' : 'Item removed from cart');
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;

    if (!isAuthenticated) {
      toast.error(
        isRtl ? 'يرجى تسجيل الدخول لمتابعة تأكيد الطلب' : 'Please log in to proceed with checkout'
      );
      navigate('/login');
      return;
    }

    if (paymentMethod === 'wallet' && walletBalance !== null && walletBalance < grandTotal) {
      toast.error(
        isRtl
          ? `رصيد المحفظة الحالي (${walletBalance.toLocaleString()} ج.س) غير كافٍ. يرجى شحن المحفظة أو اختيار وسيلة دفع أخرى.`
          : `Insufficient wallet balance (${walletBalance.toLocaleString()} SDG). Please top up or choose another payment method.`
      );
      return;
    }

    try {
      setPlacingOrder(true);

      const orderPayload = {
        items: cartItems.map((i) => ({
          productId: i.productId || i.product?._id || i.product?.id || i._id,
          quantity: i.quantity,
          price: i.price || i.product?.price,
        })),
        payment_method: paymentMethod,
        shipping_address: shippingAddress,
        city,
        notes,
        subtotal,
        delivery_fee: deliveryFee,
        total: grandTotal,
      };

      const res = await api.post('/orders', orderPayload);
      const data = res.data?.data || res.data;
      const orderId = data?.id || data?._id || data?.order_number || data?.orderId;

      // Clear cart
      dispatch(clearCartLocal());
      try {
        await api.delete('/cart');
      } catch (e) {
        // ignore
      }

      toast.success(
        isRtl ? 'تم إنشاء الطلب بنجاح! جاري تحويلك للتفاصيل' : 'Order placed successfully! Redirecting...'
      );

      if (orderId) {
        navigate(`/orders/${orderId}`);
      } else {
        navigate('/orders');
      }
    } catch (err) {
      console.error('Failed to place order:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to place order';
      toast.error(msg);
    } finally {
      setPlacingOrder(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-white rounded-3xl p-8 sm:p-12 text-center border border-gray-200 shadow-sm space-y-6">
          <div className="w-20 h-20 rounded-full bg-green-50 text-[#16A34A] flex items-center justify-center mx-auto">
            <FiShoppingBag className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              {t('cart.empty')}
            </h2>
            <p className="text-sm text-gray-500">
              {isRtl
                ? 'لم تقم بإضافة أية سلع أو بضائع إلى سلة التسوق حتى الآن.'
                : 'Your shopping cart is currently empty. Explore our wholesale catalog.'}
            </p>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-2xl shadow-md transition"
          >
            <span>{t('cart.continue_shopping')}</span>
            {isRtl ? <FiArrowLeft className="w-4 h-4" /> : <FiArrowRight className="w-4 h-4" />}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {t('cart.title')}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {cartItems.length} {cartItems.length === 1 ? t('cart.item') : t('cart.items')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(isRtl ? 'هل تريد إفراغ السلة بالكامل؟' : 'Clear all cart items?')) {
                dispatch(clearCartLocal());
                api.delete('/cart').catch(() => {});
                toast.success(isRtl ? 'تم إفراغ السلة' : 'Cart cleared');
              }
            }}
            className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline"
          >
            {t('cart.clear_cart')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Grouped Cart Items */}
          <div className="lg:col-span-8 space-y-6">
            {Object.entries(groupedByVendor).map(([vendorName, items]) => (
              <div
                key={vendorName}
                className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden"
              >
                {/* Vendor Header */}
                <div className="bg-gray-50/80 px-6 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#16A34A]" />
                    <span className="font-extrabold text-sm text-gray-800">{vendorName}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-semibold">
                    {items.length} {t('cart.items')}
                  </span>
                </div>

                {/* Items List */}
                <div className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const itemKey = item._id || item.id || item.productId;
                    const prod = item.product || item;
                    const name = isRtl
                      ? prod.name_ar || prod.name
                      : prod.name || prod.name_en || 'Product';
                    const unitPrice = Number(item.price || prod.price || 0);
                    const qty = Number(item.quantity) || 1;
                    const lineTotal = unitPrice * qty;
                    const minQty = Number(prod.min_order_qty || prod.min_order || 1);

                    return (
                      <div
                        key={itemKey}
                        className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        {/* Image + Info */}
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-20 h-20 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center shrink-0 p-2 overflow-hidden">
                            {prod.image_url || prod.image ? (
                              <img
                                src={prod.image_url || prod.image}
                                alt={name}
                                className="h-full object-contain"
                              />
                            ) : (
                              <FiPackage className="w-8 h-8 text-gray-300" />
                            )}
                          </div>
                          <div>
                            <Link
                              to={`/products/${prod.id || prod._id || item.productId}`}
                              className="font-bold text-gray-900 text-sm sm:text-base hover:text-[#16A34A] transition line-clamp-1"
                            >
                              {name}
                            </Link>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {unitPrice.toLocaleString()} {t('products.sdg')}{' '}
                              <span className="text-gray-400">/ {prod.unit || 'piece'}</span>
                            </p>
                            <span className="text-[11px] text-[#CA8A04] font-semibold">
                              {isRtl ? `الحد الأدنى: ${minQty}` : `Min: ${minQty}`}
                            </span>
                          </div>
                        </div>

                        {/* Quantity Controls + Line Total + Remove */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                          {/* Qty Box */}
                          <div className="flex items-center gap-2 bg-[#F9FAFB] p-1 rounded-xl border border-gray-200">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(item, qty - 1)}
                              className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 transition shadow-2xs"
                            >
                              <FiMinus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center font-bold text-gray-900 text-sm">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(item, qty + 1)}
                              className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 transition shadow-2xs"
                            >
                              <FiPlus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Line Total */}
                          <div className="text-end min-w-[90px]">
                            <span className="text-base font-black text-gray-900 block">
                              {lineTotal.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-gray-400 font-semibold">
                              {t('products.sdg')}
                            </span>
                          </div>

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => handleRemove(item)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition"
                            title={t('cart.remove')}
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Order Summary & Checkout */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-xs space-y-6">
              <h2 className="text-lg font-black text-gray-900 pb-3 border-b border-gray-100">
                {isRtl ? 'ملخص الفاتورة والشحن' : 'Order Summary'}
              </h2>

              {/* Delivery Details inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    {t('auth.city')}
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#F9FAFB] border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#16A34A]"
                  >
                    <option value="Khartoum">{t('common.khartoum')}</option>
                    <option value="Omdurman">{t('common.omdurman')}</option>
                    <option value="Bahri">{t('common.bahri')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    {t('auth.address')}
                  </label>
                  <input
                    type="text"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder={isRtl ? 'اسم الحي / الشارع / علامة مميزة' : 'Street address'}
                    className="w-full bg-[#F9FAFB] border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#16A34A]"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-gray-600">
                  {t('payment.select_method')}
                </label>

                {/* Bankak */}
                <div
                  onClick={() => setPaymentMethod('bankak')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    paymentMethod === 'bankak'
                      ? 'border-[#16A34A] bg-green-50/50 ring-1 ring-[#16A34A]'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-100 text-[#16A34A] flex items-center justify-center font-bold">
                      <FiCreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{t('payment.bankak')}</p>
                      <p className="text-[11px] text-gray-500">
                        {isRtl ? 'تحويل حساب إلى حساب فوري' : 'Instant Bank of Khartoum transfer'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'bankak'}
                    onChange={() => setPaymentMethod('bankak')}
                    className="accent-[#16A34A]"
                  />
                </div>

                {/* Cash on Delivery */}
                <div
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    paymentMethod === 'cod'
                      ? 'border-[#16A34A] bg-green-50/50 ring-1 ring-[#16A34A]'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-[#CA8A04] flex items-center justify-center font-bold">
                      <FiDollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{t('payment.cod')}</p>
                      <p className="text-[11px] text-gray-500">
                        {isRtl ? 'سداد نقدي عند استلام البضاعة' : 'Pay when truck arrives'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="accent-[#16A34A]"
                  />
                </div>

                {/* FoodX Wallet */}
                <div
                  onClick={() => setPaymentMethod('wallet')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    paymentMethod === 'wallet'
                      ? 'border-[#16A34A] bg-green-50/50 ring-1 ring-[#16A34A]'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#16A34A] flex items-center justify-center font-bold">
                      <FiCheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{t('payment.wallet')}</p>
                      <p className="text-[11px] text-gray-500">
                        {isRtl ? 'الرصيد المتاح:' : 'Balance:'}{' '}
                        <span className="font-bold text-[#16A34A]">
                          {walletBalance !== null ? `${walletBalance.toLocaleString()} SDG` : '--'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'wallet'}
                    onChange={() => setPaymentMethod('wallet')}
                    className="accent-[#16A34A]"
                  />
                </div>
              </div>

              {/* Price Calculations */}
              <div className="pt-4 border-t border-gray-100 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>{t('cart.subtotal')}</span>
                  <span className="font-bold text-gray-900">
                    {subtotal.toLocaleString()} {t('products.sdg')}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{t('cart.delivery_fee')}</span>
                  <span className="font-bold text-gray-900">
                    {deliveryFee.toLocaleString()} {t('products.sdg')}
                  </span>
                </div>
                <div className="flex justify-between text-base font-black text-gray-900 pt-3 border-t border-gray-100">
                  <span>{t('cart.total')}</span>
                  <div className="text-end">
                    <span className="text-2xl text-[#16A34A] font-black">
                      {grandTotal.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500 ms-1">{t('products.sdg')}</span>
                  </div>
                </div>
              </div>

              {/* Place Order CTA */}
              <button
                type="button"
                disabled={placingOrder}
                onClick={handlePlaceOrder}
                className="w-full py-4 bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold rounded-2xl shadow-lg shadow-green-700/20 active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {placingOrder ? (
                  <span>{t('common.loading')}</span>
                ) : (
                  <>
                    <FiShoppingBag className="w-5 h-5" />
                    <span>{t('orders.place_order')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
