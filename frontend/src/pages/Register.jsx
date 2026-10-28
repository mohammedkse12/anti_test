import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import {
  FiShoppingBag,
  FiTruck,
  FiPhone,
  FiLock,
  FiUser,
  FiMapPin,
  FiBriefcase,
  FiCheckCircle,
  FiArrowRight,
  FiArrowLeft,
  FiKey,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import { setCredentials } from '../store/slices/authSlice';
import AuthLayout from '../layouts/AuthLayout';

export default function Register() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isRtl = i18n.language?.startsWith('ar');

  const [step, setStep] = useState(1); // 1: role, 2: details, 3: verify OTP
  const [role, setRole] = useState('retailer'); // 'retailer' or 'vendor'
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('Khartoum');
  const [address, setAddress] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessNameAr, setBusinessNameAr] = useState('');
  const [otp, setOtp] = useState('');

  const cleanPhone = (raw) => {
    let p = raw.replace(/\s+/g, '').replace(/[-()]/g, '');
    if (p.startsWith('+249')) p = p.substring(4);
    else if (p.startsWith('00249')) p = p.substring(5);
    else if (p.startsWith('249')) p = p.substring(3);
    else if (p.startsWith('0')) p = p.substring(1);
    return p;
  };

  const handleStep1Next = () => {
    setStep(2);
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    const cleaned = cleanPhone(phone);
    if (!cleaned || cleaned.length < 9) {
      toast.error(
        isRtl ? 'يرجى إدخال رقم هاتف سوداني صحيح' : 'Please enter a valid phone number'
      );
      return;
    }

    if (role === 'vendor' && (!businessName.trim() || !businessNameAr.trim())) {
      toast.error(
        isRtl
          ? 'يرجى إدخال اسم المتجر/المؤسسة بالإنجليزية والعربية'
          : 'Please enter business name in English and Arabic'
      );
      return;
    }

    try {
      setLoading(true);
      const payload = {
        phone: `+249${cleaned}`,
        password,
        full_name: fullName,
        role,
        city,
        address,
        ...(role === 'vendor' && {
          business_name: businessName,
          business_name_ar: businessNameAr,
        }),
      };

      const res = await api.post('/auth/register', payload);
      toast.success(
        isRtl
          ? 'تم إنشاء الحساب بنجاح! تم إرسال رمز التحقق'
          : 'Registration successful! Verification OTP sent'
      );
      setStep(3);
    } catch (err) {
      console.error('Registration failed:', err);
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleStep3VerifyOtp = async (e) => {
    e.preventDefault();
    const cleaned = cleanPhone(phone);
    const cleanOtp = otp.trim();

    try {
      setLoading(true);
      const res = await api.post('/auth/verify-otp', {
        phone: `+249${cleaned}`,
        otp: cleanOtp,
      });

      const data = res.data?.data || res.data;
      const token = data?.token || data?.accessToken;
      const refreshToken = data?.refreshToken;
      const user = data?.user || {
        phone: `+249${cleaned}`,
        role,
        name: fullName,
      };

      if (token) {
        dispatch(
          setCredentials({
            token,
            refreshToken,
            user,
          })
        );
        toast.success(isRtl ? 'تم تفعيل الحساب بنجاح!' : 'Account verified successfully!');
        if (role === 'vendor') {
          navigate('/vendor/dashboard');
        } else {
          navigate('/');
        }
      } else {
        toast.success(isRtl ? 'تم التحقق بنجاح! يرجى تسجيل الدخول' : 'Verified! Please login');
        navigate('/login');
      }
    } catch (err) {
      console.error('OTP verification failed:', err);
      const msg = err.response?.data?.message || err.message || 'Invalid or expired OTP';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.register')}
      subtitle={isRtl ? 'انضم إلى شبكة التجارة الغذائية الأكبر في الخرطوم' : 'Join Khartoum’s premier wholesale grocery platform'}
    >
      {/* Stepper Indicator */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute top-1/2 start-0 end-0 h-0.5 bg-gray-200 -translate-y-1/2 z-0" />

        <div className="relative z-10 flex flex-col items-center">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition ${
              step >= 1 ? 'bg-[#16A34A] text-white' : 'bg-gray-200 text-gray-500'
            }`}
          >
            1
          </div>
          <span className="text-[10px] font-bold text-gray-500 mt-1">
            {t('auth.role')}
          </span>
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition ${
              step >= 2 ? 'bg-[#16A34A] text-white' : 'bg-gray-200 text-gray-500'
            }`}
          >
            2
          </div>
          <span className="text-[10px] font-bold text-gray-500 mt-1">
            {isRtl ? 'البيانات' : 'Details'}
          </span>
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition ${
              step >= 3 ? 'bg-[#16A34A] text-white' : 'bg-gray-200 text-gray-500'
            }`}
          >
            3
          </div>
          <span className="text-[10px] font-bold text-gray-500 mt-1">
            {t('auth.verify_otp')}
          </span>
        </div>
      </div>

      {/* Step 1: Account Type Selector */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-base font-extrabold text-gray-900 mb-1">
              {isRtl ? 'كيف ترغب في استخدام المنصة؟' : 'Choose Account Type'}
            </h3>
            <p className="text-xs text-gray-500">
              {isRtl ? 'حدد دورك لتخصيص تجربتك' : 'Select your primary role on FoodX'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Retailer Card */}
            <div
              onClick={() => setRole('retailer')}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col items-center text-center gap-3 ${
                role === 'retailer'
                  ? 'border-[#16A34A] bg-green-50/40 ring-2 ring-[#16A34A]/20'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  role === 'retailer'
                    ? 'bg-[#16A34A] text-white'
                    : 'bg-green-100 text-[#16A34A]'
                }`}
              >
                <FiShoppingBag className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-extrabold text-gray-900 text-sm">{t('auth.retailer')}</h4>
                <p className="text-[11px] text-gray-500 mt-1">
                  {isRtl ? 'شراء بضائع ومواد غذائية بسعر الجملة' : 'Buy wholesale goods for store'}
                </p>
              </div>
            </div>

            {/* Vendor Card */}
            <div
              onClick={() => setRole('vendor')}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col items-center text-center gap-3 ${
                role === 'vendor'
                  ? 'border-[#16A34A] bg-green-50/40 ring-2 ring-[#16A34A]/20'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  role === 'vendor'
                    ? 'bg-[#16A34A] text-white'
                    : 'bg-yellow-100 text-[#CA8A04]'
                }`}
              >
                <FiTruck className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-extrabold text-gray-900 text-sm">{t('auth.vendor')}</h4>
                <p className="text-[11px] text-gray-500 mt-1">
                  {isRtl ? 'عرض وتوريد المنتجات لتجار التجزئة' : 'Supply & sell wholesale stock'}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStep1Next}
            className="w-full py-4 bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-green-700/20 active:scale-[0.99] transition flex items-center justify-center gap-2"
          >
            <span>{t('common.next')}</span>
            {isRtl ? <FiArrowLeft className="w-4 h-4" /> : <FiArrowRight className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Step 2: Form Details */}
      {step === 2 && (
        <form onSubmit={handleStep2Submit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {t('auth.full_name')} *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="محمد عثمان"
                className="w-full bg-[#F9FAFB] border border-gray-300 rounded-2xl ps-4 pe-10 py-3 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#16A34A]"
              />
              <div className="absolute inset-y-0 end-0 pe-3.5 flex items-center pointer-events-none text-gray-400">
                <FiUser className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {t('auth.phone')} *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-gray-400 font-bold text-sm">
                +249
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="91 234 5678"
                className="w-full bg-[#F9FAFB] border border-gray-300 rounded-2xl ps-16 pe-4 py-3 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#16A34A]"
              />
              <div className="absolute inset-y-0 end-0 pe-3.5 flex items-center pointer-events-none text-gray-400">
                <FiPhone className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {t('auth.password')} *
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#F9FAFB] border border-gray-300 rounded-2xl ps-4 pe-10 py-3 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#16A34A]"
              />
              <div className="absolute inset-y-0 end-0 pe-3.5 flex items-center pointer-events-none text-gray-400">
                <FiLock className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Vendor specific fields */}
          {role === 'vendor' && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {t('auth.business_name')} (English) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Al-Baraka Wholesale"
                    className="w-full bg-[#F9FAFB] border border-gray-300 rounded-2xl ps-4 pe-10 py-3 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#16A34A]"
                  />
                  <div className="absolute inset-y-0 end-0 pe-3.5 flex items-center pointer-events-none text-gray-400">
                    <FiBriefcase className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {t('auth.business_name_ar')} (العربية) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={businessNameAr}
                    onChange={(e) => setBusinessNameAr(e.target.value)}
                    placeholder="مثال: مؤسسة البركة للمواد التموينية"
                    className="w-full bg-[#F9FAFB] border border-gray-300 rounded-2xl ps-4 pe-10 py-3 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#16A34A]"
                  />
                  <div className="absolute inset-y-0 end-0 pe-3.5 flex items-center pointer-events-none text-gray-400">
                    <FiBriefcase className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* City */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {t('auth.city')} *
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-gray-300 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#16A34A]"
            >
              <option value="Khartoum">{t('common.khartoum')}</option>
              <option value="Omdurman">{t('common.omdurman')}</option>
              <option value="Bahri">{t('common.bahri')}</option>
            </select>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {t('auth.address')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={isRtl ? 'المنطقة، الشارع، المعلم الرئيسي' : 'District, Street'}
                className="w-full bg-[#F9FAFB] border border-gray-300 rounded-2xl ps-4 pe-10 py-3 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#16A34A]"
              />
              <div className="absolute inset-y-0 end-0 pe-3.5 flex items-center pointer-events-none text-gray-400">
                <FiMapPin className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-1/3 py-3.5 border border-gray-300 rounded-2xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              {t('common.back')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-2/3 py-3.5 bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-sm rounded-2xl shadow-md transition disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('auth.create_account')}
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Verify OTP */}
      {step === 3 && (
        <form onSubmit={handleStep3VerifyOtp} className="space-y-5">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-green-100 text-[#16A34A] flex items-center justify-center mx-auto mb-2">
              <FiCheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-gray-900">
              {t('auth.enter_otp')}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {isRtl ? `تم إرسال رمز التحقق إلى الرقم +249 ${cleanPhone(phone)}` : `Code sent to +249 ${cleanPhone(phone)}`}
            </p>
          </div>

          <div>
            <input
              type="text"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="• • • • • •"
              className="w-full text-center tracking-widest text-2xl font-black bg-[#F9FAFB] border border-gray-300 rounded-2xl py-3.5 text-gray-900 focus:outline-none focus:border-[#16A34A]"
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length < 4}
            className="w-full py-4 bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-green-700/20 active:scale-[0.99] transition disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('auth.verify_otp')}
          </button>
        </form>
      )}

      {/* Footer Switch to Login */}
      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-500">
          {t('auth.already_have_account')}{' '}
          <Link
            to="/login"
            className="font-extrabold text-[#16A34A] hover:text-[#15803D] hover:underline"
          >
            {t('auth.login')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
