import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  FiBriefcase,
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiStar,
  FiPhone,
  FiUser,
  FiMapPin,
  FiShield,
  FiRefreshCw,
  FiPackage,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

import api from '../services/api';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';

const VENDOR_FILTER_TABS = [
  { key: 'all', label: 'All Vendors', labelAr: 'جميع الموردين' },
  { key: 'pending', label: 'Pending Verification', labelAr: 'بانتظار التوثيق' },
  { key: 'verified', label: 'Verified', labelAr: 'موردون موثقون' },
];

export default function AdminVendors() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isRtl = i18n.language?.startsWith('ar');

  const initialTab = searchParams.get('is_verified') === 'false' ? 'pending' : 'all';

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVendors, setTotalVendors] = useState(0);

  const [verifyingId, setVerifyingId] = useState(null);

  const fetchVendors = useCallback(
    async (targetPage = 1, query = searchQuery, filter = activeTab) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append('page', targetPage.toString());
        params.append('per_page', '15');

        if (filter === 'pending') {
          params.append('is_verified', 'false');
        } else if (filter === 'verified') {
          params.append('is_verified', 'true');
        }

        if (query.trim()) {
          params.append('search', query.trim());
        }

        const res = await api.get(`/admin/vendors?${params.toString()}`);
        const data = res.data?.data || res.data;
        const list = Array.isArray(data) ? data : data?.vendors || [];
        const pagination = data?.pagination || {};

        setVendors(list);
        setPage(pagination.page || targetPage);
        setTotalPages(pagination.total_pages || 1);
        setTotalVendors(pagination.total || list.length);
      } catch (err) {
        console.error('Failed to load vendors:', err);
        toast.error(err.response?.data?.error || t('common.error'));
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, activeTab, t]
  );

  useEffect(() => {
    fetchVendors(1, searchQuery, activeTab);
  }, [activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchVendors(1, searchQuery, activeTab);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchVendors(newPage, searchQuery, activeTab);
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  const handleToggleVerify = async (vendor) => {
    const nextVerified = !vendor.is_verified;
    try {
      setVerifyingId(vendor.id);
      const res = await api.put(`/admin/vendors/${vendor.id}/verify`, {
        is_verified: nextVerified,
      });

      toast.success(
        res.data?.message ||
          (isRtl
            ? `تم ${nextVerified ? 'توثيق' : 'إلغاء توثيق'} حساب المورد بنجاح`
            : `Vendor has been ${nextVerified ? 'verified' : 'unverified'} successfully`)
      );

      // If viewing filtered tab, re-fetch; otherwise update locally
      if (activeTab !== 'all') {
        fetchVendors(page, searchQuery, activeTab);
      } else {
        setVendors((prev) =>
          prev.map((v) => (v.id === vendor.id ? { ...v, is_verified: nextVerified } : v))
        );
      }
    } catch (err) {
      console.error('Failed to toggle vendor verification:', err);
      toast.error(err.response?.data?.error || err.response?.data?.message || t('common.error'));
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-amber-50 text-[#CA8A04] flex items-center justify-center text-xl shadow-xs">
              <FiBriefcase className="w-5 h-5" />
            </span>
            {t('admin.vendors', 'Manage Vendors')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {isRtl
              ? `توثيق واعتماد موردي الجملة ومراقبة تقييماتهم (إجمالي: ${totalVendors})`
              : `Review merchant accreditation, verify trade licenses, and monitor ratings (Total: ${totalVendors})`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchVendors(page, searchQuery, activeTab)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-[#16A34A] text-gray-700 hover:text-[#16A34A] rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#16A34A]' : ''}`} />
          <span>{isRtl ? 'تحديث القائمة' : 'Refresh'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {VENDOR_FILTER_TABS.map((tab) => {
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

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xl shadow-gray-200/30">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute start-3.5 top-3.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isRtl
                  ? 'ابحث باسم المؤسسة، اسم المالك، أو رقم الهاتف...'
                  : 'Search by store name, owner name, or phone number...'
              }
              className="w-full ps-10 pe-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer"
          >
            {t('common.search', 'Search')}
          </button>
        </form>
      </div>

      {/* Vendors Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
        {loading ? (
          <div className="py-20">
            <LoadingSpinner size="lg" text={t('common.loading')} />
          </div>
        ) : vendors.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<FiBriefcase className="w-8 h-8" />}
              title={isRtl ? 'لا يوجد موردون مسجلون' : 'No vendors found'}
              description={
                isRtl
                  ? 'لم يتم العثور على أي موردين يطابقون معايير التصفية.'
                  : 'No wholesale vendors match the current filter criteria.'
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-100 text-gray-500 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3.5 px-6 text-start">{t('auth.business_name', 'Business Name')}</th>
                    <th className="py-3.5 px-6 text-start">{isRtl ? 'المالك / المدير' : 'Owner'}</th>
                    <th className="py-3.5 px-6 text-start">{t('auth.phone', 'Phone')}</th>
                    <th className="py-3.5 px-6 text-center">{isRtl ? 'التوثيق' : 'Verification'}</th>
                    <th className="py-3.5 px-6 text-center">{isRtl ? 'التقييم' : 'Rating'}</th>
                    <th className="py-3.5 px-6 text-end">{isRtl ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Business Name */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="font-bold text-gray-900 text-sm">
                          {v.business_name}
                        </div>
                        {v.business_name_ar && (
                          <div className="text-[11px] text-gray-400 font-normal">
                            {v.business_name_ar}
                          </div>
                        )}
                      </td>

                      {/* Owner */}
                      <td className="py-4 px-6 whitespace-nowrap text-gray-700">
                        {v.user?.full_name || v.user?.name || (isRtl ? 'مالك معتمد' : 'Vendor Representative')}
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-6 whitespace-nowrap font-mono text-gray-600" dir="ltr">
                        {v.phone || v.user?.phone || '-'}
                      </td>

                      {/* Verification Status */}
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        {v.is_verified ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#16A34A] border border-emerald-200/60">
                            <FiCheckCircle className="w-3.5 h-3.5" />
                            <span>{isRtl ? 'موثق' : 'Verified'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-[#CA8A04] border border-amber-200/60">
                            <FiXCircle className="w-3.5 h-3.5" />
                            <span>{isRtl ? 'قيد المراجعة' : 'Pending'}</span>
                          </span>
                        )}
                      </td>

                      {/* Rating */}
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 text-xs font-bold text-gray-800 bg-yellow-50/80 px-2 py-0.5 rounded-lg border border-yellow-200/50">
                          <FiStar className="w-3.5 h-3.5 text-[#EAB308] fill-current" />
                          <span>{v.rating || 4.8}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-end whitespace-nowrap">
                        <button
                          type="button"
                          disabled={verifyingId === v.id}
                          onClick={() => handleToggleVerify(v)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer ${
                            v.is_verified
                              ? 'bg-amber-50 text-[#CA8A04] hover:bg-amber-100 border border-amber-200/60'
                              : 'bg-green-50 text-[#16A34A] hover:bg-green-100 border border-green-200/60'
                          }`}
                        >
                          {verifyingId === v.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : v.is_verified ? (
                            <FiXCircle className="w-3.5 h-3.5" />
                          ) : (
                            <FiCheckCircle className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {v.is_verified
                              ? t('admin.unverify', 'Unverify')
                              : t('admin.verify', 'Verify Vendor')}
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
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
    </div>
  );
}
