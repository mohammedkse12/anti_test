import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FiArrowRight,
  FiArrowLeft,
  FiPackage,
  FiClock,
  FiCheckCircle,
  FiTruck,
  FiMapPin,
  FiPhone,
  FiUser,
  FiCreditCard,
  FiAlertCircle,
  FiXCircle,
  FiCalendar,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';

const ORDER_STEPS = [
  { key: 'pending', labelKey: 'orders.pending' },
  { key: 'confirmed', labelKey: 'orders.confirmed' },
  { key: 'preparing', labelKey: 'orders.preparing' },
  { key: 'shipped', labelKey: 'orders.shipped' },
  { key: 'delivered', labelKey: 'orders.delivered' },
];

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith('ar');

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/orders/${id}`);
        const data = res.data?.data || res.data;
        if (active) {
          setOrder(data);
        }
      } catch (err) {
        console.error('Failed to load order details:', err);
        toast.error(err.response?.data?.message || 'Failed to load order');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchOrder();
    return () => {
      active = false;
    };
  }, [id]);

  const handleCancelOrder = async () => {
    if (!window.confirm(isRtl ? 'هل أنت متأكد من إلغاء هذا الطلب؟' : 'Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      setCancelling(true);
      try {
        await api.post(`/orders/${id}/cancel`);
      } catch (postErr) {
        await api.put(`/orders/${id}`, { status: 'cancelled' });
      }

      toast.success(isRtl ? 'تم إلغاء الطلب بنجاح' : 'Order cancelled successfully');
      setOrder((prev) => ({ ...prev, status: 'cancelled' }));
    } catch (err) {
      console.error('Failed to cancel order:', err);
      toast.error(err.response?.data?.message || 'Could not cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] py-12 px-4 max-w-4xl mx-auto space-y-6">
        <div className="h-10 bg-white rounded-2xl animate-pulse" />
        <div className="h-32 bg-white rounded-3xl animate-pulse" />
        <div className="h-64 bg-white rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] py-20 px-4 max-w-md mx-auto text-center space-y-4">
        <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">
          {isRtl ? 'الطلب غير متوفر' : 'Order Not Found'}
        </h2>
        <Link
          to="/orders"
          className="inline-block px-6 py-2.5 bg-[#16A34A] text-white rounded-xl text-xs font-bold"
        >
          {t('orders.title')}
        </Link>
      </div>
    );
  }

  const orderNumber = order.order_number || `#ORD-${String(order.id || order._id || id).slice(-6)}`;
  const status = (order.status || 'pending').toLowerCase();
  const isCancelled = status === 'cancelled';
  const canCancel = status === 'pending';

  // Step tracker index
  const stepIndex = ORDER_STEPS.findIndex((s) => s.key === status);
  const currentStep = stepIndex === -1 ? (isCancelled ? -1 : 0) : stepIndex;

  const items = order.items || [];
  const subtotal = Number(order.subtotal || order.sub_total || 0);
  const deliveryFee = Number(order.delivery_fee || 0);
  const total = Number(order.total || order.total_amount || subtotal + deliveryFee);
  const delivery = order.delivery || {};
  const driverName = delivery.driver_name || order.driver_name || (isRtl ? 'مندوب الأسطول المركزي' : 'FoodX Fleet Driver');
  const driverPhone = delivery.driver_phone || order.driver_phone || '+249 91 000 0000';
  const estimatedTime = delivery.estimated_delivery_time || (isRtl ? 'خلال 24-48 ساعة' : 'Within 24-48 hrs');

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Breadcrumb & Action */}
        <div className="flex items-center justify-between">
          <Link
            to="/orders"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-600 hover:text-[#16A34A]"
          >
            {isRtl ? <FiArrowRight className="w-4 h-4" /> : <FiArrowLeft className="w-4 h-4" />}
            <span>{isRtl ? 'العودة لقائمة الطلبات' : 'Back to Orders'}</span>
          </Link>

          {canCancel && (
            <button
              type="button"
              disabled={cancelling}
              onClick={handleCancelOrder}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold border border-red-200 transition"
            >
              {cancelling ? t('common.loading') : t('orders.cancel')}
            </button>
          )}
        </div>

        {/* Order Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-900">{orderNumber}</h1>
              {isCancelled ? (
                <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-xl">
                  {t('orders.cancelled')}
                </span>
              ) : (
                <span className="px-3 py-1 bg-green-100 text-[#16A34A] text-xs font-bold rounded-xl capitalize">
                  {t(`orders.${status}`) || status}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
              <FiCalendar className="w-3.5 h-3.5" />
              <span>{new Date(order.created_at || order.createdAt || Date.now()).toLocaleString()}</span>
            </p>
          </div>

          <div className="text-start sm:text-end">
            <span className="text-xs text-gray-400 block">{t('orders.total')}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#16A34A]">
                {total.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-gray-500">{t('products.sdg')}</span>
            </div>
          </div>
        </div>

        {/* Visual Step Progress Tracker (hidden if cancelled) */}
        {!isCancelled ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs">
            <h3 className="text-sm font-extrabold text-gray-900 mb-6">
              {t('orders.track')}
            </h3>

            <div className="relative flex items-center justify-between">
              {/* Background Line */}
              <div className="absolute top-1/2 start-4 end-4 h-1 bg-gray-100 -translate-y-1/2 z-0" />
              {/* Active colored line */}
              <div
                className="absolute top-1/2 start-4 h-1 bg-[#16A34A] -translate-y-1/2 z-0 transition-all duration-500"
                style={{
                  width: `${(currentStep / (ORDER_STEPS.length - 1)) * 100}%`,
                }}
              />

              {ORDER_STEPS.map((s, idx) => {
                const isCompleted = idx <= currentStep;
                const isCurrent = idx === currentStep;

                return (
                  <div key={s.key} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition shadow-2xs ${
                        isCompleted
                          ? 'bg-[#16A34A] text-white ring-4 ring-green-50'
                          : 'bg-white border-2 border-gray-300 text-gray-400'
                      }`}
                    >
                      {isCompleted ? <FiCheckCircle className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs font-bold mt-2 whitespace-nowrap ${
                        isCurrent
                          ? 'text-[#16A34A]'
                          : isCompleted
                          ? 'text-gray-800'
                          : 'text-gray-400'
                      }`}
                    >
                      {t(s.labelKey)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-red-50 rounded-3xl p-6 border border-red-200 flex items-center gap-4 text-red-700">
            <FiXCircle className="w-8 h-8 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">{isRtl ? 'تم إلغاء هذه الطلبية' : 'Order Cancelled'}</h4>
              <p className="text-xs text-red-600/90 mt-0.5">
                {isRtl
                  ? 'تم إلغاء الطلبية بناءً على طلبك أو لعدم توفر المخزون لدى المورد.'
                  : 'This wholesale order has been cancelled.'}
              </p>
            </div>
          </div>
        )}

        {/* Order Items Table */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base font-extrabold text-gray-900">
              {isRtl ? 'الأصناف المشمولة بالفاتورة' : 'Ordered Items'}
            </h3>
            <span className="text-xs text-gray-400 font-semibold">
              {items.length} {t('cart.items')}
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {items.map((item, index) => {
              const prod = item.product || item;
              const prodName = isRtl
                ? prod.name_ar || prod.name
                : prod.name || prod.name_en || 'Product';
              const unitPrice = Number(item.price || prod.price || 0);
              const qty = Number(item.quantity) || 1;
              const lineTotal = unitPrice * qty;

              return (
                <div
                  key={index}
                  className="p-4 sm:p-6 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center shrink-0">
                      {prod.image_url || prod.image ? (
                        <img
                          src={prod.image_url || prod.image}
                          alt={prodName}
                          className="h-full object-contain p-1"
                        />
                      ) : (
                        <FiPackage className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                        {prodName}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {qty} × {unitPrice.toLocaleString()} {t('products.sdg')}
                      </p>
                    </div>
                  </div>

                  <div className="text-end">
                    <span className="text-base font-black text-gray-900 block">
                      {lineTotal.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-400">{t('products.sdg')}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing Totals */}
          <div className="p-6 bg-gray-50/70 border-t border-gray-100 space-y-2 text-sm">
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
            <div className="flex justify-between text-base font-black text-gray-900 pt-3 border-t border-gray-200">
              <span>{t('cart.total')}</span>
              <span className="text-xl text-[#16A34A] font-black">
                {total.toLocaleString()} {t('products.sdg')}
              </span>
            </div>
          </div>
        </div>

        {/* 2-Columns: Payment Info & Delivery Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment Info Card */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-[#16A34A] flex items-center justify-center font-bold">
                <FiCreditCard className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-gray-900 text-base">
                {t('orders.payment_method')}
              </h3>
            </div>

            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{isRtl ? 'الوسيلة:' : 'Method:'}</span>
                <span className="font-bold text-gray-900">
                  {order.payment_method === 'bankak'
                    ? t('payment.bankak')
                    : order.payment_method === 'wallet'
                    ? t('payment.wallet')
                    : t('payment.cod')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{isRtl ? 'حالة السداد:' : 'Payment Status:'}</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-md text-xs ${
                    order.payment_status === 'paid'
                      ? 'bg-green-100 text-[#16A34A]'
                      : 'bg-yellow-100 text-[#CA8A04]'
                  }`}
                >
                  {order.payment_status === 'paid'
                    ? isRtl ? 'تم الدفع' : 'Paid'
                    : isRtl ? 'قيد الانتظار' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Info Card */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-50 text-[#CA8A04] flex items-center justify-center font-bold">
                <FiTruck className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-gray-900 text-base">
                {t('delivery.status')}
              </h3>
            </div>

            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('delivery.driver')}:</span>
                <span className="font-bold text-gray-900">{driverName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('delivery.phone')}:</span>
                <span className="font-bold text-gray-900 direction-ltr">{driverPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('delivery.estimated')}:</span>
                <span className="font-bold text-[#16A34A]">{estimatedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('auth.address')}:</span>
                <span className="font-bold text-gray-900 text-end">
                  {order.shipping_address || `${order.city || 'الخرطوم'}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
