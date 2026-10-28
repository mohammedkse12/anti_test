import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  FiPhone,
  FiLock,
  FiKey,
  FiArrowRight,
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import { setCredentials } from '../store/slices/authSlice';
import AuthLayout from '../layouts/AuthLayout';

export default function Login() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isRtl = i18n.language?.startsWith('ar');

  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes (300 seconds)
  const [canResend, setCanResend] = useState(false);

  // Timer countdown
  useEffect(() => {
    let timer;
    if (otpSent && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpSent, timeLeft]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const cleanPhone = (raw) => {
    let p = raw.replace(/\s+/g, '').replace(/[-()]/g, '');
    if (p.startsWith('+249')) {
      p = p.substring(4);
    } else if (p.startsWith('00249')) {
      p = p.substring(5);
    } else if (p.startsWith('249')) {
      p = p.substring(3);
    } else if (p.startsWith('0')) {
      p = p.substring(1);
    }
    return p;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const cleaned = cleanPhone(phone);
    if (!cleaned || cleaned.length < 9) {
      toast.error(
        isRtl
          ? 'يرجى إدخال رقم هاتف سوداني صحيح (9 أرقام)'
          : 'Please enter a valid 9-digit Sudanese phone number'
      );
      return;
    }

    try {
      setLoading(true);
      // Calls /api/auth/login which initiates OTP sending
      const res = await api.post('/auth/login', {
        phone: `+249${cleaned}`,
      });

      setOtpSent(true);
      setTimeLeft(300);
      setCanResend(false);

      const msg = res.data?.message || t('auth.otp_sent');
      toast.success(msg);
    } catch (err) {
      console.error('Login OTP request error:', err);
      // Fallback try /auth/send-otp if login is password-based in backend
      try {
        await api.post('/auth/send-otp', { phone: `+249${cleaned}` });
        setOtpSent(true);
        setTimeLeft(300);
        setCanResend(false);
        toast.success(t('auth.otp_sent'));
      } catch (fallbackErr) {
        const errorMsg =
          fallbackErr.response?.data?.message ||
          err.response?.data?.message ||
          err.message ||
          'Failed to send OTP';
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleaned = cleanPhone(phone);
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length < 4) {
      toast.error(
        isRtl ? 'يرجى إدخال رمز التحقق كاملاً' : 'Please enter the verification code'
      );
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/verify-otp', {
        phone: `+249${cleaned}`,
        otp: cleanOtp,
      });

      const data = res.data?.data || res.data;
      const token = data?.token || data?.accessToken;
      const refreshToken = data?.refreshToken;
      const user = data?.user || { phone: `+249${cleaned}`, role: 'retailer' };

      if (token) {
        dispatch(
          setCredentials({
            token,
            refreshToken,
            user,
          })
        );
        toast.success(isRtl ? 'تم تسجيل الدخول بنجاح!' : 'Logged in successfully!');

        const redirect = searchParams.get('redirect') || '/';
        navigate(redirect);
      } else {
        throw new Error('No authentication token received');
      }
    } catch (err) {
      console.error('Verify OTP failed:', err);
      const msg = err.response?.data?.message || err.message || 'Invalid or expired OTP';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.login')}
      subtitle={isRtl ? 'سوق الجملة الذكي للتجار والموردين بالسودان' : 'Wholesale grocery portal for Sudanese business'}
    >
      {!otpSent ? (
        <form onSubmit={handleSendOtp} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              {t('auth.phone')}
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
                className="w-full bg-[#F9FAFB] border border-gray-300 rounded-2xl ps-16 pe-4 py-3.5 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] transition"
              />
              <div className="absolute inset-y-0 end-0 pe-3.5 flex items-center pointer-events-none text-gray-400">
                <FiPhone className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-gray-400">
              {isRtl ? 'مثال: 912345678 أو 123456789' : 'Format: 9XXXXXXXX or 1XXXXXXXX'}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-green-700/20 active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>{t('common.loading')}</span>
            ) : (
              <>
                <span>{t('auth.send_otp')}</span>
                {isRtl ? <FiArrowLeft className="w-4 h-4" /> : <FiArrowRight className="w-4 h-4" />}
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div className="p-3.5 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#16A34A] font-semibold">
              <FiCheckCircle className="w-4 h-4 shrink-0" />
              <span>+249 {cleanPhone(phone)}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtp('');
              }}
              className="text-xs font-bold text-gray-500 hover:text-gray-900 underline"
            >
              {t('common.edit')}
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              {t('auth.enter_otp')}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full text-center tracking-widest text-2xl font-black bg-[#F9FAFB] border border-gray-300 rounded-2xl py-3.5 text-gray-900 focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] transition"
              />
              <div className="absolute inset-y-0 end-0 pe-3.5 flex items-center pointer-events-none text-gray-400">
                <FiKey className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Countdown & Resend */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-gray-500">
              <FiClock className="w-3.5 h-3.5 text-amber-500" />
              <span>{formatTimer(timeLeft)}</span>
            </div>

            {canResend ? (
              <button
                type="button"
                onClick={handleSendOtp}
                className="font-bold text-[#16A34A] hover:underline flex items-center gap-1"
              >
                <FiRefreshCw className="w-3.5 h-3.5" />
                <span>{t('auth.resend_otp')}</span>
              </button>
            ) : (
              <span className="text-gray-400">
                {isRtl ? 'انتظر لإعادة الإرسال' : 'Resend available soon'}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || otp.length < 4}
            className="w-full py-4 bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-green-700/20 active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>{t('common.loading')}</span>
            ) : (
              <span>{t('auth.verify_otp')}</span>
            )}
          </button>
        </form>
      )}

      {/* Footer Switch to Register */}
      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-500">
          {t('auth.no_account')}{' '}
          <Link
            to="/register"
            className="font-extrabold text-[#16A34A] hover:text-[#15803D] hover:underline"
          >
            {t('auth.register')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
