import React, { useState } from 'react';
import { Lock, User, Key, Eye, EyeOff, X, ShieldAlert } from 'lucide-react';
import { AdminUser } from '../../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AdminUser) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      // Validate credentials: ID Admin01-03, Pass: admin123456
      const validAdmins = ['admin01', 'admin02', 'admin03'];
      const normalizedUser = username.trim().toLowerCase();

      if (validAdmins.includes(normalizedUser) && password === 'admin123456') {
        const adminNames: Record<string, string> = {
          admin01: 'นายฐิติวัฒน์ จัดดี (หัวหน้ากลุ่มงาน)',
          admin02: 'นางสาวกันยารัตน์ เมธาวงศ์ (ศึกษานิเทศก์ชำนาญการ)',
          admin03: 'นายณัฐวัฒน์ วรรณชัย (ศึกษานิเทศก์ชำนาญการ)',
        };

        // Default avatar images for Admin 01, 02, 03
        const defaultAvatars: Record<string, string> = {
          admin01: '/assets/aistudio/ChatGPT_Image_8__._._2569_14_03_22_a7c958cc.png',
          admin02: '/assets/aistudio/ChatGPT_Image_8__._._2569_14_03_25_26038aa5.png',
          admin03: '/assets/aistudio/ChatGPT_Image_8__._._2569_14_03_27_74797087.png',
        };

        // Check if custom profile data was previously saved
        let savedData: Partial<AdminUser> = {};
        const localKey = `skt2_admin_user_${normalizedUser}`;
        const stored = localStorage.getItem(localKey) || localStorage.getItem('skt2_admin_user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.uid === normalizedUser || parsed.username?.toLowerCase() === normalizedUser) {
              savedData = parsed;
            }
          } catch {
            // Ignore
          }
        }

        const loggedInAdmin: AdminUser = {
          uid: normalizedUser,
          username: username.trim(),
          name: savedData.name || adminNames[normalizedUser] || 'ผู้ดูแลระบบ สพป.สุโขทัย เขต 2',
          position: savedData.position || 'ศึกษานิเทศก์ชำนาญการ',
          role: 'admin',
          email: savedData.email || `${normalizedUser}@sukhothai2.go.th`,
          profilePic: savedData.profilePic || defaultAvatars[normalizedUser] || '/assets/aistudio/ChatGPT_Image_8__._._2569_14_03_22_a7c958cc.png',
          ...savedData
        };

        if (rememberMe) {
          localStorage.setItem('skt2_admin_user', JSON.stringify(loggedInAdmin));
          localStorage.setItem(localKey, JSON.stringify(loggedInAdmin));
        }

        onLoginSuccess(loggedInAdmin);
        onClose();
      } else {
        setErrorMsg('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white/95 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-4 border-orange-200 relative transform transition-all scale-100 animate-scaleUp">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-400 text-white flex items-center justify-center mx-auto shadow-lg shadow-orange-300/50 mb-3">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-800">
            ลงชื่อเข้าใช้งานผู้ดูแลระบบ
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            กลุ่มงานส่งเสริมพัฒนาสื่อ นวัตกรรมและเทคโนโลยีทางการศึกษา สพป.สุโขทัย เขต 2
          </p>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Username */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-orange-500" />
              <span>ชื่อผู้ใช้ (Admin ID)</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="กรอกชื่อผู้ใช้..."
              required
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-orange-200 text-xs sm:text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none transition shadow-2xs font-medium"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-orange-500" />
              <span>รหัสผ่าน</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน..."
                required
                className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-white border border-orange-200 text-xs sm:text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none transition shadow-2xs font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember me checkbox */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
              />
              <span>จดจำการเข้าสู่ระบบ (Remember me)</span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-gamified-primary py-3 px-6 text-xs sm:text-sm font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <span>กำลังเข้าสู่ระบบ...</span>
              ) : (
                <span>เข้าสู่ระบบแดชบอร์ด</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
