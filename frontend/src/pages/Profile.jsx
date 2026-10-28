import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiGlobe,
  FiBriefcase,
  FiCheck,
  FiSave,
  FiShield,
  FiCalendar,
  FiImage,
  FiEdit3,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

import api from '../services/api';
import { setCredentials } from '../store/slices/authSlice';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Badge from '../components/common/Badge';

export default function Profile() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isRtl = i18n.language?.startsWith('ar');

  const { user: authUser, token, refreshToken, isAuthenticated } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Khartoum');
  const [address, setAddress] = useState('');
  const [langPref, setLangPref] = useState('ar');

  // Vendor fields
  const [isVendor, setIsVendor] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessNameAr, setBusinessNameAr] = useState('');
  const [vendorDescription, setVendorDescription] = useState('');
  const [vendorDescriptionAr, setVendorDescriptionAr] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Raw user state
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/profile');
      return;
    }

    let active = true;

    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get('/auth/me');
        const userData = res.data?.user || res.data?.data || res.data;

        if (active && userData) {
          setProfileData(userData);
          setFullName(userData.full_name || userData.name || '');
          setEmail(userData.email || '');
          setPhone(userData.phone || '');
          setCity(userData.city || 'Khartoum');
          setAddress(userData.address || '');
          setLangPref(userData.lang_pref || i18n.language?.slice(0, 2) || 'ar');

          const role = userData.role?.toLowerCase();
          const vendorFlag = role === 'vendor' || Boolean(userData.vendor);
          setIsVendor(vendorFlag);

          if (userData.vendor) {
            setBusinessName(userData.vendor.business_name || '');
            setBusinessNameAr(userData.vendor.business_name_ar || '');
            setVendorDescription(userData.vendor.description || '');
            setVendorDescriptionAr(userData.vendor.description_ar || '');
            setLogoUrl(userData.vendor.logo_url || '');
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        toast.error(err.response?.data?.error || t('common.error'));
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchUserProfile();

    return () => {
      active = false;
    };
  }, [isAuthenticated, navigate, i18n.language, t]);

  const handleLanguageToggle = (lang) => {
    setLangPref(lang);
    i18n.changeLanguage(lang);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error(isRtl ? 'يرجى إدخال الاسم الكامل' : 'Please enter your full name');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        full_name: fullName.trim(),
        email: email.trim() || null,
        city: city || 'Khartoum',
        address: address.trim() || null,
        lang_pref: langPref,
      };

      if (isVendor) {
        payload.business_name = businessName.trim();
        payload.business_name_ar = businessNameAr.trim();
        payload.description = vendorDescription.trim();
        payload.description_ar = vendorDescriptionAr.trim();
        payload.logo_url = logoUrl.trim();
      }

      const res = await api.put('/auth/me', payload);
      const updatedUser = res.data?.user || res.data?.data || res.data;

      // Update Redux user store
      if (updatedUser) {
        dispatch(
          setCredentials({
            user: { ...authUser, ...updatedUser },
            token,
            refreshToken,
          })
        );
        setProfileData(updatedUser);
      }

      toast.success(
        res.data?.message ||
          (isRtl ? 'تم تحديث الملف الشخصي بنجاح' : 'Profile updated successfully')
      );
    } catch (err) {
      console.error('Failed to update profile:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || t('common.error');
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  // Role badge helper
  const renderRoleBadge = (role) => {
    const r = (role || 'retailer').toLowerCase();
    if (r === 'admin') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-50 text-red-700 border border-red-200">
          <FiShield className="w-3.5 h-3.5 text-red-600" />
          {t('admin.badge', 'System Admin')}
        </span>
      );
    }
    if (r === 'vendor') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
          <FiBriefcase className="w-3.5 h-3.5 text-[#EAB308]" />
          {t('vendor.badge', 'Wholesale Vendor')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-[#16A34A] border border-emerald-200">
        <FiUser className="w-3.5 h-3.5 text-[#16A34A]" />
        {t('auth.retailer', 'Retailer')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text={t('common.loading')} />
      </div>
    );
  }

  const userInitial = fullName ? fullName.charAt(0).toUpperCase() : 'U';

  return (
    <div className="min-h-[80vh] py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Page Title */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-green-50 text-[#16A34A] flex items-center justify-center text-xl shadow-xs">
            <FiUser className="w-5 h-5" />
          </span>
          {t('nav.profile', 'User Profile')}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          {isRtl
            ? 'عرض وتعديل معلومات حسابك، الموقع الجغرافي وبيانات المتجر'
            : 'View and update your FoodX account information, location and business credentials'}
        </p>
      </div>

      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl shadow-gray-200/40 mb-8 relative overflow-hidden">
        {/* Subtle Accent Stripe */}
        <div className="absolute top-0 inset-x-0 h-2 bg-linear-to-r from-[#16A34A] via-[#22C55E] to-[#EAB308]" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-2">
          {/* Avatar Container */}
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-linear-to-br from-[#16A34A] to-[#14532D] text-white flex items-center justify-center text-3xl font-black shadow-lg shadow-green-900/20">
              {profileData?.vendor?.logo_url ? (
                <img
                  src={profileData.vendor.logo_url}
                  alt={fullName}
                  className="w-full h-full object-cover rounded-3xl"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                userInitial
              )}
            </div>
          </div>

          {/* User Basic Info */}
          <div className="flex-1 text-center sm:text-start">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                  {fullName || profileData?.phone}
                </h2>
                {isVendor && businessName && (
                  <p className="text-sm font-semibold text-[#16A34A] flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                    <FiBriefcase className="w-3.5 h-3.5" />
                    <span>{businessName}</span>
                    {businessNameAr && <span className="text-gray-400">({businessNameAr})</span>}
                  </p>
                )}
              </div>

              <div>{renderRoleBadge(profileData?.role)}</div>
            </div>

            {/* Contacts & Metadata */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100">
              <span className="flex items-center gap-1.5 font-medium">
                <FiPhone className="w-3.5 h-3.5 text-[#16A34A]" />
                <span dir="ltr">{phone || profileData?.phone}</span>
              </span>

              {email && (
                <span className="flex items-center gap-1.5 font-medium">
                  <FiMail className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>{email}</span>
                </span>
              )}

              <span className="flex items-center gap-1.5 font-medium">
                <FiMapPin className="w-3.5 h-3.5 text-[#16A34A]" />
                <span>
                  {city ? t(`common.${city.toLowerCase()}`, city) : t('common.khartoum', 'Khartoum')}
                </span>
              </span>

              <span className="flex items-center gap-1.5 text-gray-400">
                <FiCalendar className="w-3.5 h-3.5" />
                <span>
                  {isRtl ? 'حساب نشط' : 'Active Account'}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Personal Details Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl shadow-gray-200/40">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FiEdit3 className="w-5 h-5 text-[#16A34A]" />
            {isRtl ? 'المعلومات الشخصية والاتصال' : 'Personal & Contact Information'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                {t('auth.full_name', 'Full Name')} *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Mohammed Ahmed"
                  className="w-full ps-10 pe-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition"
                />
                <FiUser className="absolute start-3.5 top-3.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                {isRtl ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@foodx.sd"
                  className="w-full ps-10 pe-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition"
                />
                <FiMail className="absolute start-3.5 top-3.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Phone (Read Only) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                {t('auth.phone', 'Phone Number')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled
                  value={phone}
                  dir="ltr"
                  className="w-full ps-10 pe-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 cursor-not-allowed"
                />
                <FiPhone className="absolute start-3.5 top-3.5 w-4 h-4 text-gray-400" />
              </div>
              <span className="text-[11px] text-gray-400 mt-1 block">
                {isRtl ? 'رقم الهاتف مؤكد بالرمز ولا يمكن تعديله' : 'Verified phone number cannot be changed'}
              </span>
            </div>

            {/* City Dropdown */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                {t('auth.city', 'City')} *
              </label>
              <div className="relative">
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full ps-10 pe-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition cursor-pointer appearance-none"
                >
                  <option value="Khartoum">{t('common.khartoum', 'Khartoum')}</option>
                  <option value="Omdurman">{t('common.omdurman', 'Omdurman')}</option>
                  <option value="Bahri">{t('common.bahri', 'Bahri')}</option>
                </select>
                <FiMapPin className="absolute start-3.5 top-3.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Detailed Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                {t('auth.address', 'Street / Detailed Address')}
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={isRtl ? 'مثال: السوق العربي، شارع الحرية، قرب بنك الخرطوم' : 'e.g. Souq Al-Arabi, Al-Hurriya St.'}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition resize-none"
              />
            </div>

            {/* Language Preference Toggle */}
            <div className="sm:col-span-2 pt-2">
              <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <FiGlobe className="w-4 h-4 text-[#16A34A]" />
                {isRtl ? 'اللغة المفضلة للواجهة' : 'Interface Language Preference'}
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleLanguageToggle('ar')}
                  className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer flex items-center justify-center gap-2 ${
                    langPref === 'ar'
                      ? 'bg-[#16A34A] text-white border-[#16A34A] shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-green-50'
                  }`}
                >
                  {langPref === 'ar' && <FiCheck className="w-4 h-4" />}
                  <span>العربية (Arabic)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLanguageToggle('en')}
                  className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer flex items-center justify-center gap-2 ${
                    langPref === 'en'
                      ? 'bg-[#16A34A] text-white border-[#16A34A] shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-green-50'
                  }`}
                >
                  {langPref === 'en' && <FiCheck className="w-4 h-4" />}
                  <span>English (الإنجليزية)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Business Profile (Conditional for Vendors) */}
        {isVendor && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl shadow-gray-200/40">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiBriefcase className="w-5 h-5 text-[#EAB308]" />
                {t('vendor.profile', 'Store Profile (Wholesale)')}
              </h3>
              <Badge variant="warning" dot size="sm">
                {t('vendor.badge', 'Vendor')}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Business Name (EN) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  {t('auth.business_name', 'Business Name (English)')} *
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Khartoum Wholesale Flour Hub"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition"
                />
              </div>

              {/* Business Name (AR) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  {t('auth.business_name_ar', 'Business Name (Arabic)')} *
                </label>
                <input
                  type="text"
                  required
                  value={businessNameAr}
                  onChange={(e) => setBusinessNameAr(e.target.value)}
                  placeholder="مثال: مؤسسة الخرطوم لتجارة الدقيق بالجملة"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition"
                />
              </div>

              {/* Logo URL */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  {isRtl ? 'رابط شعار المتجر (Logo URL)' : 'Store Logo Image URL'}
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full ps-10 pe-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition"
                  />
                  <FiImage className="absolute start-3.5 top-3.5 w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Description (EN) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  {isRtl ? 'نبذة عن المتجر (بالإنجليزية)' : 'Description (English)'}
                </label>
                <textarea
                  rows={3}
                  value={vendorDescription}
                  onChange={(e) => setVendorDescription(e.target.value)}
                  placeholder="Leading distributor of sugar, edible oils and flour across Sudan..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition resize-none"
                />
              </div>

              {/* Description (AR) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  {isRtl ? 'نبذة عن المتجر (بالعربية)' : 'Description (Arabic)'}
                </label>
                <textarea
                  rows={3}
                  value={vendorDescriptionAr}
                  onChange={(e) => setVendorDescriptionAr(e.target.value)}
                  placeholder="مورد معتمد للسلع التموينية الاستراتيجية، السكر، الزيوت والدقيق للمتاجر في ولاية الخرطوم..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Save Button */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3.5 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#14532D] text-white font-bold text-sm sm:text-base rounded-2xl shadow-lg shadow-green-700/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('common.loading', 'Saving...')}</span>
              </>
            ) : (
              <>
                <FiSave className="w-5 h-5" />
                <span>{t('common.save', 'Save Changes')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
