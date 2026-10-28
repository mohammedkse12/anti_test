import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  FiUsers,
  FiSearch,
  FiUserCheck,
  FiUserX,
  FiPhone,
  FiMail,
  FiMapPin,
  FiCalendar,
  FiShield,
  FiBriefcase,
  FiUser,
  FiRefreshCw,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

import api from '../services/api';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';

const ROLE_TABS = [
  { key: 'all', label: 'All Users', labelAr: 'جميع المستخدمين' },
  { key: 'retailer', label: 'Retailers', labelAr: 'تجار التجزئة (بقالات)' },
  { key: 'vendor', label: 'Vendors', labelAr: 'موردو الجملة' },
  { key: 'admin', label: 'Admins', labelAr: 'المشرفون' },
];

export default function AdminUsers() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith('ar');
  const { user: currentAdmin } = useSelector((state) => state.auth);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const [togglingId, setTogglingId] = useState(null);

  const fetchUsers = useCallback(
    async (targetPage = 1, query = searchQuery, role = activeTab) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append('page', targetPage.toString());
        params.append('per_page', '15');

        if (role !== 'all') {
          params.append('role', role);
        }
        if (query.trim()) {
          params.append('search', query.trim());
        }

        const res = await api.get(`/admin/users?${params.toString()}`);
        const data = res.data?.data || res.data;
        const list = Array.isArray(data) ? data : data?.users || [];
        const pagination = data?.pagination || {};

        setUsers(list);
        setPage(pagination.page || targetPage);
        setTotalPages(pagination.total_pages || 1);
        setTotalUsers(pagination.total || list.length);
      } catch (err) {
        console.error('Failed to load users:', err);
        toast.error(err.response?.data?.error || t('common.error'));
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, activeTab, t]
  );

  useEffect(() => {
    fetchUsers(1, searchQuery, activeTab);
  }, [activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(1, searchQuery, activeTab);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchUsers(newPage, searchQuery, activeTab);
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  const handleToggleStatus = async (targetUser) => {
    const nextStatus = !targetUser.is_active;
    try {
      setTogglingId(targetUser.id);
      const res = await api.put(`/admin/users/${targetUser.id}/status`, {
        is_active: nextStatus,
      });

      toast.success(
        res.data?.message ||
          (isRtl
            ? `تم ${nextStatus ? 'تنشيط' : 'تعطيل'} حساب المستخدم بنجاح`
            : `User account has been ${nextStatus ? 'activated' : 'deactivated'}`)
      );

      // Update state locally
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: nextStatus } : u))
      );
    } catch (err) {
      console.error('Failed to toggle user status:', err);
      toast.error(err.response?.data?.error || err.response?.data?.message || t('common.error'));
    } finally {
      setTogglingId(null);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(isRtl ? 'ar-SD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const renderRoleBadge = (role) => {
    const r = (role || 'retailer').toLowerCase();
    if (r === 'admin') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
          <FiShield className="w-3.5 h-3.5 text-red-600" />
          {t('admin.badge', 'Admin')}
        </span>
      );
    }
    if (r === 'vendor') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <FiBriefcase className="w-3.5 h-3.5 text-[#EAB308]" />
          {t('vendor.badge', 'Vendor')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#16A34A] border border-emerald-200">
        <FiUser className="w-3.5 h-3.5 text-[#16A34A]" />
        {t('auth.retailer', 'Retailer')}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-green-50 text-[#16A34A] flex items-center justify-center text-xl shadow-xs">
              <FiUsers className="w-5 h-5" />
            </span>
            {t('admin.users', 'Manage Retailers & Users')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {isRtl
              ? `إدارة حسابات تجار التجزئة، الموردين والمشرفين (إجمالي: ${totalUsers})`
              : `Platform accounts, roles, access permissions, and activation status (Total: ${totalUsers})`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchUsers(page, searchQuery, activeTab)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-[#16A34A] text-gray-700 hover:text-[#16A34A] rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#16A34A]' : ''}`} />
          <span>{isRtl ? 'تحديث القائمة' : 'Refresh'}</span>
        </button>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {ROLE_TABS.map((tab) => {
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
                  ? 'ابحث بالاسم، رقم الهاتف أو البريد الإلكتروني...'
                  : 'Search by full name, phone number, or email...'
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

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
        {loading ? (
          <div className="py-20">
            <LoadingSpinner size="lg" text={t('common.loading')} />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<FiUsers className="w-8 h-8" />}
              title={isRtl ? 'لم يتم العثور على أي مستخدمين' : 'No users found'}
              description={
                isRtl
                  ? 'جرب البحث بكلمة أخرى أو تغيير التصفية.'
                  : 'Try searching with a different name or changing role filter.'
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-100 text-gray-500 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3.5 px-6 text-start">{t('auth.full_name', 'User Name')}</th>
                    <th className="py-3.5 px-6 text-start">{t('auth.phone', 'Phone')}</th>
                    <th className="py-3.5 px-6 text-center">{t('auth.role', 'Role')}</th>
                    <th className="py-3.5 px-6 text-start">{t('auth.city', 'City')}</th>
                    <th className="py-3.5 px-6 text-center">{isRtl ? 'الحالة' : 'Status'}</th>
                    <th className="py-3.5 px-6 text-start">{t('orders.date', 'Joined')}</th>
                    <th className="py-3.5 px-6 text-end">{isRtl ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {users.map((u) => {
                    const isSelf = String(u.id) === String(currentAdmin?.id);
                    return (
                      <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                        {/* Name & Email */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="font-bold text-gray-900 text-sm">
                            {u.full_name || u.name || 'Anonymous User'}
                          </div>
                          {u.email && (
                            <div className="text-[11px] text-gray-400 font-normal">
                              {u.email}
                            </div>
                          )}
                        </td>

                        {/* Phone */}
                        <td className="py-4 px-6 whitespace-nowrap font-mono text-gray-600" dir="ltr">
                          {u.phone}
                        </td>

                        {/* Role */}
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          {renderRoleBadge(u.role)}
                        </td>

                        {/* City */}
                        <td className="py-4 px-6 whitespace-nowrap text-gray-700">
                          {u.city ? t(`common.${u.city.toLowerCase()}`, u.city) : '-'}
                        </td>

                        {/* Active Status */}
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          {u.is_active ? (
                            <Badge variant="success" dot size="sm">
                              {isRtl ? 'نشط' : 'Active'}
                            </Badge>
                          ) : (
                            <Badge variant="danger" dot size="sm">
                              {isRtl ? 'معطل' : 'Deactivated'}
                            </Badge>
                          )}
                        </td>

                        {/* Created Date */}
                        <td className="py-4 px-6 whitespace-nowrap text-gray-500 text-xs">
                          {formatDate(u.created_at)}
                        </td>

                        {/* Action Toggle */}
                        <td className="py-4 px-6 text-end whitespace-nowrap">
                          {isSelf ? (
                            <span className="text-[11px] text-gray-400 font-semibold italic">
                              {isRtl ? 'حسابك الحالي' : 'Current Admin'}
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={togglingId === u.id}
                              onClick={() => handleToggleStatus(u)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer ${
                                u.is_active
                                  ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/60'
                                  : 'bg-green-50 text-[#16A34A] hover:bg-green-100 border border-green-200/60'
                              }`}
                            >
                              {togglingId === u.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : u.is_active ? (
                                <FiUserX className="w-3.5 h-3.5" />
                              ) : (
                                <FiUserCheck className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {u.is_active
                                  ? t('admin.deactivate', 'Deactivate')
                                  : t('admin.activate', 'Activate')}
                              </span>
                            </button>
                          )}
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
    </div>
  );
}
