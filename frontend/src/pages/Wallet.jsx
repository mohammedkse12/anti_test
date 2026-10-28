import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowDownLeft,
  FiArrowUpRight,
  FiPlusCircle,
  FiCreditCard,
  FiRefreshCw,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiShield,
  FiDollarSign,
  FiFileText,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Pagination from '../components/common/Pagination';
import Badge from '../components/common/Badge';

export default function Wallet() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRtl = i18n.language?.startsWith('ar');
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingTxns, setLoadingTxns] = useState(true);
  const [submittingTopup, setSubmittingTopup] = useState(false);

  // Top up form state
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [showTopupForm, setShowTopupForm] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTxns, setTotalTxns] = useState(0);

  // Pre-set top-up amount chips
  const quickAmounts = [5000, 10000, 25000, 50000, 100000];

  // Format currency helper
  const formatSdg = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Format date helper
  const formatDate = (isoString) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(isRtl ? 'ar-SD' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Fetch wallet balance
  const fetchWallet = useCallback(async () => {
    try {
      setLoadingWallet(true);
      const res = await api.get('/wallet');
      const data = res.data?.data || res.data;
      setWallet(data);
    } catch (err) {
      console.error('Failed to load wallet:', err);
      toast.error(err.response?.data?.error || t('common.error'));
    } finally {
      setLoadingWallet(false);
    }
  }, [t]);

  // Fetch transactions
  const fetchTransactions = useCallback(async (targetPage = 1) => {
    try {
      setLoadingTxns(true);
      const res = await api.get(`/wallet/transactions?page=${targetPage}&per_page=10`);
      const payload = res.data?.data || res.data;
      const list = payload?.transactions || [];
      const pagination = payload?.pagination || {};

      setTransactions(list);
      setPage(pagination.page || targetPage);
      setTotalPages(pagination.total_pages || 1);
      setTotalTxns(pagination.total || list.length);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      toast.error(err.response?.data?.error || t('common.error'));
    } finally {
      setLoadingTxns(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/wallet');
      return;
    }
    fetchWallet();
    fetchTransactions(1);
  }, [isAuthenticated, navigate, fetchWallet, fetchTransactions]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchTransactions(newPage);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleTopupSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error(isRtl ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount');
      return;
    }

    try {
      setSubmittingTopup(true);
      const res = await api.post('/wallet/topup', {
        amount: parsedAmount,
        reference: reference.trim() || undefined,
        description: description.trim() || (isRtl ? 'شحن رصيد المحفظة' : 'Wallet balance top-up'),
      });

      toast.success(
        res.data?.message ||
          (isRtl ? 'تم شحن المحفظة بنجاح' : 'Wallet topped up successfully')
      );
      setAmount('');
      setReference('');
      setDescription('');
      setShowTopupForm(false);
      // Refresh wallet & transactions
      fetchWallet();
      fetchTransactions(1);
    } catch (err) {
      console.error('Topup failed:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || t('common.error');
      toast.error(errMsg);
    } finally {
      setSubmittingTopup(false);
    }
  };

  return (
    <div className="min-h-[80vh] py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-green-50 text-[#16A34A] flex items-center justify-center text-xl shadow-xs">
              <FiCreditCard className="w-5 h-5" />
            </span>
            {t('wallet.title', 'FoodX Wallet')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {isRtl
              ? 'إدارة الرصيد الإلكتروني، المدفوعات والمعاملات المالية الفورية'
              : 'Manage digital balance, payments and instant grocery financial transactions'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            fetchWallet();
            fetchTransactions(page);
          }}
          disabled={loadingWallet || loadingTxns}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-[#16A34A] text-gray-700 hover:text-[#16A34A] rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <FiRefreshCw className={`w-4 h-4 ${loadingWallet || loadingTxns ? 'animate-spin text-[#16A34A]' : ''}`} />
          <span>{isRtl ? 'تحديث الرصيد' : 'Refresh'}</span>
        </button>
      </div>

      {/* Grid: Balance Card & Quick Top-up Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Large Green Gradient Balance Card */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-linear-to-br from-[#16A34A] via-[#15803D] to-[#14532D] text-white p-6 sm:p-8 shadow-xl shadow-green-900/15 flex flex-col justify-between min-h-[220px]">
          {/* Subtle Decorative Elements */}
          <div className="absolute -top-12 -end-12 w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-12 -start-12 w-48 h-48 rounded-full bg-[#EAB308]/20 blur-xl pointer-events-none" />

          {/* Top Row: User & Status Badge */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-white text-base">
                FX
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-green-100 font-semibold block">
                  {t('wallet.title', 'FoodX Wallet')}
                </span>
                <span className="text-xs sm:text-sm font-bold text-white">
                  {user?.full_name || user?.phone || 'FoodX Partner'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white">
              <FiShield className="w-3.5 h-3.5 text-[#EAB308]" />
              <span>{isRtl ? 'محفظة آمنة' : 'Secure Wallet'}</span>
            </div>
          </div>

          {/* Center Balance Display */}
          <div className="relative z-10 my-6">
            <span className="text-xs sm:text-sm font-medium text-green-100 block mb-1">
              {t('wallet.balance', 'Available Balance')}
            </span>
            {loadingWallet ? (
              <div className="flex items-center gap-3 py-2">
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-lg text-white/80">{t('common.loading')}</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                  {formatSdg(wallet?.balance)}
                </span>
                <span className="text-lg sm:text-2xl font-bold text-[#EAB308]">
                  {t('products.sdg', 'SDG')}
                </span>
              </div>
            )}
          </div>

          {/* Bottom Row Info */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/20 text-xs text-green-100">
            <div>
              <span className="text-white/70 block text-[10px] uppercase">
                {isRtl ? 'رقم الحساب' : 'Account Identifier'}
              </span>
              <span className="font-mono font-medium text-white">
                {wallet?.id ? `${wallet.id.slice(0, 8)}...${wallet.id.slice(-4)}` : user?.phone || 'FX-0000'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowTopupForm((prev) => !prev)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#EAB308] hover:bg-[#CA8A04] text-gray-900 font-bold rounded-xl shadow-md transition transform active:scale-95 cursor-pointer text-xs sm:text-sm"
            >
              <FiPlusCircle className="w-4 h-4 text-gray-900" />
              <span>{showTopupForm ? (isRtl ? 'إخفاء الشحن' : 'Close Top-up') : t('wallet.topup', 'Top-up Balance')}</span>
            </button>
          </div>
        </div>

        {/* Top-up Action Card / Form */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiPlusCircle className="w-5 h-5 text-[#16A34A]" />
                {t('wallet.topup', 'Top-up Balance')}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-[#16A34A] font-semibold border border-green-200/60">
                {isRtl ? 'فوري' : 'Instant'}
              </span>
            </div>

            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              {isRtl
                ? 'أدخل المبلغ بالجنيه السوداني لتغذية رصيدك للمشتريات أو التحويل عبر بنكك.'
                : 'Enter the amount in SDG to fund your wallet for wholesale orders or Bankak transfer.'}
            </p>

            <form onSubmit={handleTopupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  {t('wallet.amount', 'Top-up Amount')} ({t('products.sdg', 'SDG')}) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition"
                  />
                  <div className="absolute inset-y-0 end-3 flex items-center pointer-events-none text-xs font-bold text-gray-400">
                    {t('products.sdg', 'SDG')}
                  </div>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="text-[11px] font-semibold text-gray-400 block mb-1.5">
                  {isRtl ? 'مبالغ سريعة:' : 'Quick Select:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickAmounts.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setAmount(q.toString())}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition cursor-pointer ${
                        amount === q.toString()
                          ? 'bg-[#16A34A] text-white border-[#16A34A]'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-green-50 hover:text-[#16A34A] hover:border-green-200'
                      }`}
                    >
                      +{q.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Reference */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t('wallet.reference', 'Reference #')} ({isRtl ? 'اختياري - كود بنكك' : 'Optional - Bankak Ref'})
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. BOK-84920412"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition"
                />
              </div>

              {/* Optional Description */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {isRtl ? 'ملاحظة / وصف' : 'Description'} ({isRtl ? 'اختياري' : 'Optional'})
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={isRtl ? 'شحن رصيد الطلبات' : 'Grocery purchase balance'}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition"
                />
              </div>

              <button
                type="submit"
                disabled={submittingTopup || !amount}
                className="w-full py-3 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#14532D] text-white text-sm font-bold rounded-xl shadow-md shadow-green-700/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {submittingTopup ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('common.loading', 'Processing...')}</span>
                  </>
                ) : (
                  <>
                    <FiPlusCircle className="w-4 h-4" />
                    <span>{t('wallet.topup', 'Top Up Now')}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
        {/* Table Header / Filter Bar */}
        <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <FiClock className="w-5 h-5 text-[#16A34A]" />
              {t('wallet.history', 'Transaction History')}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isRtl
                ? `إجمالي العمليات المسجلة: ${totalTxns}`
                : `Total recorded financial operations: ${totalTxns}`}
            </p>
          </div>
        </div>

        {/* Content Table / Cards */}
        {loadingTxns ? (
          <div className="py-16">
            <LoadingSpinner size="lg" text={t('common.loading')} />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 px-4">
            <EmptyState
              icon={<FiCreditCard className="w-8 h-8" />}
              title={t('wallet.no_transactions', 'No financial transactions recorded yet')}
              description={
                isRtl
                  ? 'لم تقم بأي عمليات إيداع أو دفع حتى الآن. اشحن محفظتك لبدء الطلبات.'
                  : 'You have not made any deposits or payments yet. Top up your balance to get started.'
              }
              actionText={t('wallet.topup', 'Top-up Balance')}
              onAction={() => setShowTopupForm(true)}
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-start text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-100 text-gray-500 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3.5 px-6 text-start">{t('orders.date', 'Date & Time')}</th>
                    <th className="py-3.5 px-6 text-start">{t('wallet.transaction_type', 'Type')}</th>
                    <th className="py-3.5 px-6 text-start">{isRtl ? 'المصدر' : 'Source'}</th>
                    <th className="py-3.5 px-6 text-start">{isRtl ? 'البيان والمرجع' : 'Description / Reference'}</th>
                    <th className="py-3.5 px-6 text-end">{isRtl ? 'المبلغ' : 'Amount'}</th>
                    <th className="py-3.5 px-6 text-end">{isRtl ? 'الرصيد بعد العملية' : 'Balance After'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {transactions.map((txn) => {
                    const isCredit = txn.type === 'credit';
                    return (
                      <tr key={txn.id} className="hover:bg-gray-50/80 transition-colors">
                        {/* Date */}
                        <td className="py-4 px-6 text-gray-600 whitespace-nowrap">
                          {formatDate(txn.created_at)}
                        </td>

                        {/* Type */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                              isCredit
                                ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200/60'
                                : 'bg-red-50 text-red-600 border border-red-200/60'
                            }`}
                          >
                            {isCredit ? (
                              <FiArrowDownLeft className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <FiArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span>
                              {isCredit
                                ? t('wallet.credit', 'Credit (+)')
                                : t('wallet.debit', 'Debit (-)')}
                            </span>
                          </span>
                        </td>

                        {/* Source */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700">
                            {txn.source === 'topup'
                              ? t('wallet.topup_source', 'Top-up')
                              : txn.source === 'payment'
                              ? t('wallet.payment_source', 'Order Payment')
                              : txn.source === 'refund'
                              ? t('wallet.refund_source', 'Refund')
                              : txn.source}
                          </span>
                        </td>

                        {/* Description & Reference */}
                        <td className="py-4 px-6">
                          <div className="max-w-xs">
                            <p className="text-gray-900 font-semibold truncate text-xs sm:text-sm">
                              {txn.description || (isCredit ? 'Wallet Top-up' : 'Payment')}
                            </p>
                            {txn.reference && (
                              <span className="text-[11px] font-mono text-gray-400 block mt-0.5">
                                Ref: {txn.reference}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-4 px-6 text-end whitespace-nowrap">
                          <span
                            className={`font-black text-sm sm:text-base ${
                              isCredit ? 'text-[#16A34A]' : 'text-red-600'
                            }`}
                          >
                            {isCredit ? '+' : '-'} {formatSdg(txn.amount)}{' '}
                            <span className="text-xs font-bold text-gray-400">
                              {t('products.sdg', 'SDG')}
                            </span>
                          </span>
                        </td>

                        {/* Balance After */}
                        <td className="py-4 px-6 text-end whitespace-nowrap text-gray-700 font-mono text-xs sm:text-sm">
                          {formatSdg(txn.balance_after)}{' '}
                          <span className="text-gray-400">{t('products.sdg', 'SDG')}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-gray-100">
              {transactions.map((txn) => {
                const isCredit = txn.type === 'credit';
                return (
                  <div key={txn.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                          isCredit
                            ? 'bg-emerald-50 text-[#16A34A]'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {isCredit ? (
                          <FiArrowDownLeft className="w-3 h-3" />
                        ) : (
                          <FiArrowUpRight className="w-3 h-3" />
                        )}
                        <span>{isCredit ? t('wallet.credit') : t('wallet.debit')}</span>
                      </span>

                      <span
                        className={`font-black text-sm ${
                          isCredit ? 'text-[#16A34A]' : 'text-red-600'
                        }`}
                      >
                        {isCredit ? '+' : '-'} {formatSdg(txn.amount)}{' '}
                        <span className="text-[10px]">{t('products.sdg')}</span>
                      </span>
                    </div>

                    <div className="text-xs text-gray-900 font-semibold">
                      {txn.description}
                    </div>

                    {txn.reference && (
                      <div className="text-[11px] font-mono text-gray-400">
                        Ref: {txn.reference}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-50">
                      <span>{formatDate(txn.created_at)}</span>
                      <span>
                        {isRtl ? 'الرصيد بعده: ' : 'After: '}
                        <strong className="text-gray-700">{formatSdg(txn.balance_after)} SDG</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
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
