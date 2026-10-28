import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiClipboard,
  FiEye,
  FiSearch,
  FiRefreshCw,
  FiCalendar,
  FiDollarSign,
  FiTruck,
  FiUser,
  FiBriefcase,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiMapPin,
  FiPhone,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

import api from '../services/api';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';

const ORDER_STATUS_TABS = [
  { key: 'all', label: 'All Orders', labelAr: 'جميع الطلبات' },
  { key: 'pending', label: 'Pending', labelAr: 'قيد المراجعة' },
  { key: 'confirmed', label: 'Confirmed', labelAr: 'مؤكدة' },
  { key: 'preparing', label: 'Preparing', labelAr: 'قيد التجهيز' },
  { key: 'shipped', label: 'Shipped', labelAr: 'مشحونة' },
  { key: 'delivered', label: 'Delivered', labelAr: 'مستلمة' },
  { key: 'cancelled', label: 'Cancelled', labelAr: 'ملغية' },
];

export default function AdminOrders() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith('ar');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Detail Modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchOrders = useCallback(
    async (targetPage = 1, status = activeTab) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append('page', targetPage.toString());
        params.append('per_page', '15');

        if (status !== 'all') {
          params.append('status', status);
        }

        const res = await api.get(`/admin/orders?${params.toString()}`);
        const data = res.data?.data || res.data;
        const list = Array.isArray(data) ? data : data?.orders || [];
        const pagination = data?.pagination || {};

        setOrders(list);
        setPage(pagination.page || targetPage);
        setTotalPages(pagination.total_pages || 1);
        setTotalOrders(pagination.total || list.length);
      } catch (err) {
        console.error('Failed to load admin orders:', err);
        toast.error(err.response?.data?.error || t('common.error'));
      } finally {
        setLoading(false);
      }
    },
    [activeTab, t]
  );

  useEffect(() => {
    fetchOrders(1, activeTab);
  }, [activeTab]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchOrders(newPage, activeTab);
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  const handleOpenDetail = (order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

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

  const renderOrderStatusBadge = (status) => {
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

  const renderPaymentStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'paid':
        return <Badge variant="success" size="sm">{isRtl ? 'مدفوع' : 'Paid'}</Badge>;
      case 'pending':
        return <Badge variant="warning" size="sm">{isRtl ? 'معلق' : 'Pending'}</Badge>;
      case 'refunded':
        return <Badge variant="info" size="sm">{isRtl ? 'مسترد' : 'Refunded'}</Badge>;
      case 'failed':
        return <Badge variant="danger" size="sm">{isRtl ? 'فشل' : 'Failed'}</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status || 'Unpaid'}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-green-50 text-[#16A34A] flex items-center justify-center text-xl shadow-xs">
              <FiClipboard className="w-5 h-5" />
            </span>
            {t('admin.all_orders', 'Marketplace Orders')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {isRtl
              ? `مراقبة كافة أوامر الشراء، المدفوعات وحالات التسليم (إجمالي: ${totalOrders})`
              : `Platform-wide order oversight, merchant fulfillment, and payment tracking (Total: ${totalOrders})`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchOrders(page, activeTab)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-[#16A34A] text-gray-700 hover:text-[#16A34A] rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#16A34A]' : ''}`} />
          <span>{isRtl ? 'تحديث السجل' : 'Refresh'}</span>
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {ORDER_STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-[#16A34A] text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {isRtl ? tab.labelAr : tab.label}
            </button>
          );
        })}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
        {loading ? (
          <div className="py-20">
            <LoadingSpinner size="lg" text={t('common.loading')} />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<FiClipboard className="w-8 h-8" />}
              title={t('orders.no_orders', 'No orders in this status')}
              description={
                isRtl
                  ? 'لم يتم العثور على أي طلبات في هذه الحالة حالياً.'
                  : 'No orders match this status filter.'
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-100 text-gray-500 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3.5 px-6 text-start">{t('orders.order_number', 'Order #')}</th>
                    <th className="py-3.5 px-6 text-start">{isRtl ? 'المشتري' : 'Retailer'}</th>
                    <th className="py-3.5 px-6 text-start">{isRtl ? 'المورد' : 'Vendor'}</th>
                    <th className="py-3.5 px-6 text-start">{t('orders.date', 'Date')}</th>
                    <th className="py-3.5 px-6 text-end">{t('orders.total', 'Total')}</th>
                    <th className="py-3.5 px-6 text-center">{isRtl ? 'الدفع' : 'Payment'}</th>
                    <th className="py-3.5 px-6 text-center">{t('orders.status', 'Status')}</th>
                    <th className="py-3.5 px-6 text-end">{isRtl ? 'عرض' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {orders.map((o) => {
                    const retailer = o.retailer || {};
                    const vendor = o.vendor || {};

                    return (
                      <tr key={o.id} className="hover:bg-gray-50/80 transition-colors">
                        {/* Order Number */}
                        <td className="py-4 px-6 font-mono font-bold text-gray-900 whitespace-nowrap">
                          {o.order_number || `#${o.id.slice(0, 8)}`}
                        </td>

                        {/* Retailer */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="font-bold text-gray-900">
                            {retailer.full_name || retailer.name || 'Retailer'}
                          </div>
                          {retailer.phone && (
                            <div className="text-[11px] text-gray-400 font-mono" dir="ltr">
                              {retailer.phone}
                            </div>
                          )}
                        </td>

                        {/* Vendor */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="font-bold text-[#16A34A]">
                            {vendor.business_name || (isRtl ? 'مورد جملة' : 'Vendor')}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-4 px-6 text-gray-500 whitespace-nowrap">
                          {formatDate(o.created_at)}
                        </td>

                        {/* Total Amount */}
                        <td className="py-4 px-6 text-end whitespace-nowrap font-black text-gray-900">
                          {formatSdg(o.total)}{' '}
                          <span className="text-xs font-bold text-gray-400">
                            {t('products.sdg', 'SDG')}
                          </span>
                        </td>

                        {/* Payment Method & Status */}
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[11px] font-semibold text-gray-700 capitalize">
                              {o.payment_method || 'COD'}
                            </span>
                            {renderPaymentStatusBadge(o.payment_status)}
                          </div>
                        </td>

                        {/* Order Status */}
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          {renderOrderStatusBadge(o.order_status)}
                        </td>

                        {/* Action View */}
                        <td className="py-4 px-6 text-end whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(o)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-green-50 text-gray-700 hover:text-[#16A34A] text-xs font-bold transition cursor-pointer"
                          >
                            <FiEye className="w-3.5 h-3.5" />
                            <span>{t('common.view', 'Details')}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-center">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Order Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={
          selectedOrder
            ? `${t('orders.details', 'Order Details')} - ${selectedOrder.order_number || `#${selectedOrder.id.slice(0, 8)}`}`
            : t('orders.details', 'Order Details')
        }
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Top Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                  {t('orders.status', 'Fulfillment Status')}
                </span>
                {renderOrderStatusBadge(selectedOrder.order_status)}
              </div>

              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                  {t('orders.payment_method', 'Payment')}
                </span>
                <div className="font-bold text-gray-900 text-xs sm:text-sm capitalize">
                  {selectedOrder.payment_method || 'Cash on Delivery'}
                </div>
                <div className="mt-1">{renderPaymentStatusBadge(selectedOrder.payment_status)}</div>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                  {t('orders.total', 'Gross Total')}
                </span>
                <div className="font-black text-[#16A34A] text-sm sm:text-base">
                  {formatSdg(selectedOrder.total)} {t('products.sdg', 'SDG')}
                </div>
              </div>
            </div>

            {/* Retailer & Vendor Contacts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Retailer Info */}
              <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-1.5">
                <h4 className="font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <FiUser className="w-3.5 h-3.5 text-[#16A34A]" />
                  {isRtl ? 'بيانات التاجر المشتري' : 'Retailer Information'}
                </h4>
                <div className="font-bold text-gray-800">
                  {selectedOrder.retailer?.full_name || selectedOrder.retailer?.name || 'Retailer'}
                </div>
                <div className="text-gray-500 font-mono" dir="ltr">
                  {selectedOrder.retailer?.phone || '-'}
                </div>
                <div className="text-gray-500">
                  {selectedOrder.shipping_address || selectedOrder.retailer?.address || selectedOrder.retailer?.city || '-'}
                </div>
              </div>

              {/* Vendor Info */}
              <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-1.5">
                <h4 className="font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <FiBriefcase className="w-3.5 h-3.5 text-[#EAB308]" />
                  {isRtl ? 'بيانات المورد البائع' : 'Vendor Information'}
                </h4>
                <div className="font-bold text-gray-800">
                  {selectedOrder.vendor?.business_name || 'Vendor'}
                </div>
                <div className="text-gray-500 font-mono" dir="ltr">
                  {selectedOrder.vendor?.phone || '-'}
                </div>
                <div className="text-gray-500">
                  {selectedOrder.vendor?.address || selectedOrder.vendor?.city || '-'}
                </div>
              </div>
            </div>

            {/* Items Breakdown */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                {isRtl ? 'قائمة الأصناف والكميات' : 'Order Items Breakdown'}
              </h4>
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="text-start py-2.5 px-4">{isRtl ? 'المنتج' : 'Item'}</th>
                      <th className="text-center py-2.5 px-4">{t('cart.quantity', 'Qty')}</th>
                      <th className="text-end py-2.5 px-4">{t('cart.unit_price', 'Unit Price')}</th>
                      <th className="text-end py-2.5 px-4">{t('cart.total', 'Total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {(selectedOrder.items || []).map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="py-2.5 px-4 font-bold text-gray-900">
                          {item.product_name_en || item.product_name || item.name || `Item #${idx + 1}`}
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-gray-700">
                          {item.quantity} {item.unit || ''}
                        </td>
                        <td className="py-2.5 px-4 text-end text-gray-600">
                          {formatSdg(item.unit_price)} SDG
                        </td>
                        <td className="py-2.5 px-4 text-end font-bold text-gray-900">
                          {formatSdg(item.total_price || item.unit_price * item.quantity)} SDG
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Delivery Driver Info If Available */}
            {selectedOrder.delivery && (selectedOrder.delivery.driver_name || selectedOrder.delivery.driver_phone) && (
              <div className="p-4 bg-green-50 rounded-2xl border border-green-200/60 flex items-center gap-3 text-xs text-green-900">
                <FiTruck className="w-5 h-5 text-[#16A34A] shrink-0" />
                <div>
                  <span className="font-bold block">
                    {isRtl ? 'سائق التوصيل المعتمد:' : 'Assigned Delivery Driver:'}
                  </span>
                  <span>{selectedOrder.delivery.driver_name}</span> •{' '}
                  <span dir="ltr" className="font-mono">{selectedOrder.delivery.driver_phone}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
