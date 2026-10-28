import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  FiClipboard,
  FiChevronDown,
  FiChevronUp,
  FiTruck,
  FiUser,
  FiPhone,
  FiCalendar,
  FiPackage,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiDollarSign,
  FiSend,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

import api from '../services/api';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';

const STATUS_TABS = [
  { key: 'all', labelKey: 'orders.title', fallback: 'All Orders' },
  { key: 'pending', labelKey: 'orders.pending', fallback: 'Pending' },
  { key: 'confirmed', labelKey: 'orders.confirmed', fallback: 'Confirmed' },
  { key: 'preparing', labelKey: 'orders.preparing', fallback: 'Preparing' },
  { key: 'shipped', labelKey: 'orders.shipped', fallback: 'Shipped' },
  { key: 'delivered', labelKey: 'orders.delivered', fallback: 'Delivered' },
];

const NEXT_STATUS = {
  pending: { next: 'confirmed', label: 'Confirm Order', labelAr: 'تأكيد الطلب' },
  confirmed: { next: 'preparing', label: 'Start Preparing', labelAr: 'بدء التجهيز' },
  preparing: { next: 'shipped', label: 'Dispatch / Ship', labelAr: 'شحن وإرسال' },
  shipped: { next: 'delivered', label: 'Mark Delivered', labelAr: 'تم التسليم' },
};

export default function VendorOrders() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith('ar');
  const { user } = useSelector((state) => state.auth);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Status updating state
  const [updatingId, setUpdatingId] = useState(null);

  // Shipping Modal state
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [selectedOrderForShip, setSelectedOrderForShip] = useState(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [shippingLoading, setShippingLoading] = useState(false);

  // Fetch Vendor Orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      const data = res.data?.data || res.data;
      const list = Array.isArray(data) ? data : data?.orders || data?.items || [];
      setOrders(list);
    } catch (err) {
      console.error('Failed to load vendor orders:', err);
      toast.error(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const toggleExpand = (id) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  };

  // Status transition handler
  const handleUpdateStatus = async (order, targetStatus) => {
    // If transitioning to shipped, open modal to input driver info
    if (targetStatus === 'shipped') {
      setSelectedOrderForShip(order);
      setDriverName(order.delivery?.driver_name || '');
      setDriverPhone(order.delivery?.driver_phone || '');
      setDeliveryNotes(order.delivery?.delivery_notes || '');
      setShippingModalOpen(true);
      return;
    }

    try {
      setUpdatingId(order.id);
      const res = await api.put(`/orders/${order.id}/status`, { status: targetStatus });
      toast.success(
        res.data?.message ||
          (isRtl
            ? `تم تحديث حالة الطلب إلى "${targetStatus}"`
            : `Order updated to ${targetStatus}`)
      );
      fetchOrders();
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error(err.response?.data?.error || err.response?.data?.message || t('common.error'));
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle Dispatch / Ship Submit
  const handleShippingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrderForShip) return;

    try {
      setShippingLoading(true);

      // 1. Update delivery info if driver name or phone provided
      if (driverName.trim() || driverPhone.trim()) {
        try {
          await api.put(`/delivery/${selectedOrderForShip.id}`, {
            driver_name: driverName.trim(),
            driver_phone: driverPhone.trim(),
            delivery_notes: deliveryNotes.trim() || undefined,
          });
        } catch (delivErr) {
          console.warn('Delivery details update warning:', delivErr);
        }
      }

      // 2. Update order status to shipped
      await api.put(`/orders/${selectedOrderForShip.id}/status`, { status: 'shipped' });

      toast.success(isRtl ? 'تم شحن الطلب وتحديث بيانات السائق' : 'Order marked as shipped');
      setShippingModalOpen(false);
      setSelectedOrderForShip(null);
      fetchOrders();
    } catch (err) {
      console.error('Failed to ship order:', err);
      toast.error(err.response?.data?.error || err.response?.data?.message || t('common.error'));
    } finally {
      setShippingLoading(false);
    }
  };

  // Filter orders by active tab
  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'all') return true;
    return (order.order_status || '').toLowerCase() === activeTab.toLowerCase();
  });

  const formatSdg = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(isRtl ? 'ar-SD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'pending':
        return <Badge variant="warning" dot>{t('orders.pending', 'Pending')}</Badge>;
      case 'confirmed':
        return <Badge variant="info" dot>{t('orders.confirmed', 'Confirmed')}</Badge>;
      case 'preparing':
        return <Badge variant="warning" dot>{t('orders.preparing', 'Preparing')}</Badge>;
      case 'shipped':
        return <Badge variant="info" dot>{t('orders.shipped', 'Shipped')}</Badge>;
      case 'delivered':
        return <Badge variant="success" dot>{t('orders.delivered', 'Delivered')}</Badge>;
      case 'cancelled':
        return <Badge variant="danger" dot>{t('orders.cancelled', 'Cancelled')}</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-green-50 text-[#16A34A] flex items-center justify-center text-xl shadow-xs">
              <FiClipboard className="w-5 h-5" />
            </span>
            {t('vendor.orders', 'Store Orders')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {isRtl
              ? 'تأكيد الطلبات، التجهيز، تسجيل بيانات السائق والتسليم للمتاجر'
              : 'Review wholesale purchase orders, update fulfillment workflow, and assign drivers'}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOrders}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-[#16A34A] text-gray-700 hover:text-[#16A34A] rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#16A34A]' : ''}`} />
          <span>{isRtl ? 'تحديث الطلبات' : 'Refresh'}</span>
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count =
            tab.key === 'all'
              ? orders.length
              : orders.filter((o) => (o.order_status || '').toLowerCase() === tab.key).length;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                isActive
                  ? 'bg-[#16A34A] text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{t(tab.labelKey, tab.fallback)}</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders Table Container */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
        {loading ? (
          <div className="py-20">
            <LoadingSpinner size="lg" text={t('common.loading')} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<FiClipboard className="w-8 h-8" />}
              title={t('orders.no_orders', 'No orders in this status')}
              description={
                isRtl
                  ? 'لم يتم العثور على أي طلبات في هذه المرحلة حالياً.'
                  : 'There are currently no orders under this filter.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100 text-gray-500 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-6 text-start">{t('orders.order_number', 'Order #')}</th>
                  <th className="py-3.5 px-6 text-start">{isRtl ? 'المشتري / التاجر' : 'Retailer'}</th>
                  <th className="py-3.5 px-6 text-start">{t('orders.date', 'Date')}</th>
                  <th className="py-3.5 px-6 text-center">{isRtl ? 'الأصناف' : 'Items'}</th>
                  <th className="py-3.5 px-6 text-end">{t('orders.total', 'Total Amount')}</th>
                  <th className="py-3.5 px-6 text-center">{t('orders.status', 'Status')}</th>
                  <th className="py-3.5 px-6 text-end">{isRtl ? 'تحديث الحالة / تفاصيل' : 'Workflow Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const currentStatus = (order.order_status || '').toLowerCase();
                  const transition = NEXT_STATUS[currentStatus];
                  const items = order.items || [];
                  const retailer = order.retailer || {};

                  return (
                    <React.Fragment key={order.id}>
                      <tr
                        className={`hover:bg-gray-50/80 transition-colors ${
                          isExpanded ? 'bg-green-50/20' : ''
                        }`}
                      >
                        {/* Order Number */}
                        <td className="py-4 px-6 font-mono font-bold text-gray-900 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleExpand(order.id)}
                            className="text-[#16A34A] hover:underline flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{order.order_number || `#${order.id.slice(0, 8)}`}</span>
                            {isExpanded ? (
                              <FiChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <FiChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>

                        {/* Retailer Name & Phone */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="font-bold text-gray-900">
                            {retailer.full_name || retailer.name || (isRtl ? 'تاجر تجزئة' : 'Retailer')}
                          </div>
                          {retailer.phone && (
                            <div className="text-[11px] text-gray-400 font-mono" dir="ltr">
                              {retailer.phone}
                            </div>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-4 px-6 text-gray-500 whitespace-nowrap">
                          {formatDate(order.created_at)}
                        </td>

                        {/* Items Count */}
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-bold text-xs">
                            {items.length || 1}
                          </span>
                        </td>

                        {/* Total Amount */}
                        <td className="py-4 px-6 text-end whitespace-nowrap font-black text-gray-900">
                          {formatSdg(order.total)}{' '}
                          <span className="text-xs font-bold text-gray-400">
                            {t('products.sdg', 'SDG')}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          {renderStatusBadge(order.order_status)}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-end whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {transition && (
                              <button
                                type="button"
                                disabled={updatingId === order.id}
                                onClick={() => handleUpdateStatus(order, transition.next)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] active:bg-[#14532D] text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                              >
                                {updatingId === order.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <FiCheckCircle className="w-3.5 h-3.5" />
                                )}
                                <span>{isRtl ? transition.labelAr : transition.label}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => toggleExpand(order.id)}
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
                              title={isRtl ? 'تفاصيل الأصناف' : 'Order Details'}
                            >
                              {isExpanded ? (
                                <FiChevronUp className="w-4 h-4" />
                              ) : (
                                <FiChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Order Details Row */}
                      {isExpanded && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={7} className="p-6">
                            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                  {isRtl ? 'الأصناف المطلوبة والتفاصيل' : 'Order Items Breakdown'}
                                </h4>
                                <div className="text-xs text-gray-600">
                                  <span>{t('orders.payment_method', 'Payment Method')}: </span>
                                  <strong className="text-gray-900 capitalize">
                                    {order.payment_method || 'Cash on Delivery'}
                                  </strong>
                                </div>
                              </div>

                              {/* Items Table */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-gray-400 font-semibold border-b border-gray-100 pb-2">
                                      <th className="text-start py-2">{isRtl ? 'المنتج' : 'Product'}</th>
                                      <th className="text-center py-2">{t('cart.quantity', 'Quantity')}</th>
                                      <th className="text-end py-2">{t('cart.unit_price', 'Unit Price')}</th>
                                      <th className="text-end py-2">{t('cart.total', 'Subtotal')}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                    {items.map((item, idx) => (
                                      <tr key={item.id || idx}>
                                        <td className="py-2.5 font-bold text-gray-900">
                                          {item.product_name_en || item.product_name || item.name || `Item #${idx + 1}`}
                                        </td>
                                        <td className="py-2.5 text-center font-bold text-gray-700">
                                          {item.quantity} {item.unit || ''}
                                        </td>
                                        <td className="py-2.5 text-end text-gray-600">
                                          {formatSdg(item.unit_price)} SDG
                                        </td>
                                        <td className="py-2.5 text-end font-bold text-gray-900">
                                          {formatSdg(item.total_price || item.unit_price * item.quantity)} SDG
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Driver / Shipping Info If Any */}
                              {order.delivery && (order.delivery.driver_name || order.delivery.driver_phone) && (
                                <div className="p-3 bg-green-50 rounded-xl border border-green-200/60 flex flex-wrap items-center gap-4 text-xs text-green-900">
                                  <span className="font-bold flex items-center gap-1.5">
                                    <FiTruck className="w-4 h-4 text-[#16A34A]" />
                                    {isRtl ? 'بيانات الشحن:' : 'Delivery Driver:'}
                                  </span>
                                  {order.delivery.driver_name && (
                                    <span>{order.delivery.driver_name}</span>
                                  )}
                                  {order.delivery.driver_phone && (
                                    <span dir="ltr" className="font-mono">{order.delivery.driver_phone}</span>
                                  )}
                                  {order.delivery.delivery_notes && (
                                    <span className="text-gray-500">({order.delivery.delivery_notes})</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dispatch / Shipping Info Modal */}
      <Modal
        isOpen={shippingModalOpen}
        onClose={() => setShippingModalOpen(false)}
        title={isRtl ? 'تسجيل بيانات السائق والشحن' : 'Assign Driver & Mark as Shipped'}
        size="md"
      >
        <form onSubmit={handleShippingSubmit} className="space-y-4">
          <p className="text-xs text-gray-500">
            {isRtl
              ? 'أدخل اسم ورقم هاتف سائق التوصيل لمشاركة تفاصيل الشحن مع العميل والمنصة.'
              : 'Enter the delivery driver name and phone number to notify the customer of dispatch.'}
          </p>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {isRtl ? 'اسم السائق' : 'Driver Name'} *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="e.g. Osman Babiker"
                className="w-full ps-10 pe-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition"
              />
              <FiUser className="absolute start-3.5 top-3 w-4 h-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {isRtl ? 'رقم هاتف السائق' : 'Driver Phone Number'} *
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="+249 91 234 5678"
                dir="ltr"
                className="w-full ps-10 pe-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition"
              />
              <FiPhone className="absolute start-3.5 top-3 w-4 h-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {isRtl ? 'ملاحظات الشحن والتسليم' : 'Delivery Notes'} ({isRtl ? 'اختياري' : 'Optional'})
            </label>
            <textarea
              rows={2}
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="e.g. White Toyota Hilux truck, plate 4829"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShippingModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={shippingLoading}
              className="px-6 py-2 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#14532D] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {shippingLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiSend className="w-4 h-4" />
              )}
              <span>{isRtl ? 'تأكيد الشحن' : 'Confirm Dispatch'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
