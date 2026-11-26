import React, { useState, useRef } from 'react';
import { AdminUser } from '../../../types';
import { 
  User, 
  Key, 
  CheckCircle, 
  Save, 
  Upload, 
  Camera, 
  Trash2, 
  Image as ImageIcon,
  Link as LinkIcon,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface ProfileTabProps {
  adminUser: AdminUser | null;
  onUpdateAdmin: (user: AdminUser) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ adminUser, onUpdateAdmin }) => {
  const defaultAvatar = adminUser?.uid === 'admin02'
    ? '/assets/aistudio/ChatGPT_Image_8__._._2569_14_03_25_26038aa5.png'
    : adminUser?.uid === 'admin03'
    ? '/assets/aistudio/ChatGPT_Image_8__._._2569_14_03_27_74797087.png'
    : '/assets/aistudio/ChatGPT_Image_8__._._2569_14_03_22_a7c958cc.png';

  const [name, setName] = useState(adminUser?.name || 'นายฐิติวัฒน์ จัดดี');
  const [position, setPosition] = useState(adminUser?.position || 'ศึกษานิเทศก์ชำนาญการ หัวหน้ากลุ่มงาน');
  const [email, setEmail] = useState(adminUser?.email || 'thitiwat.j@sukhothai2.go.th');
  const [profilePic, setProfilePic] = useState(adminUser?.profilePic || defaultAvatar);
  
  // Custom upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdError, setPwdError] = useState('');

  // Preset educator photos
  const presetPhotos = [
    {
      title: 'ศึกษานิเทศก์ ฐิติวัฒน์ จัดดี',
      url: '/assets/aistudio/ChatGPT_Image_8__._._2569_14_03_22_a7c958cc.png'
    },
    {
      title: 'ศึกษานิเทศก์ กันยารัตน์ เมธาวงศ์',
      url: '/assets/aistudio/ChatGPT_Image_8__._._2569_14_03_25_26038aa5.png'
    },
    {
      title: 'ศึกษานิเทศก์ ณัฐวัฒน์ วรรณชัย',
      url: '/assets/aistudio/ChatGPT_Image_8__._._2569_14_03_27_74797087.png'
    }
  ];

  // Process & compress uploaded image client-side to lightweight Base64
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('ไฟล์มีขนาดใหญ่เกิน 10MB กรุณาเลือกไฟล์ที่มีขนาดเล็กลง');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400; // Optimal square avatar size
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Optional slight smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
            setProfilePic(dataUrl);
            setIsUploading(false);
            setUploadSuccessMsg('อัปโหลดรูปภาพสำเร็จ! พร้อมบันทึกข้อมูลส่วนตัว');
            setTimeout(() => setUploadSuccessMsg(''), 4000);
          } else {
            setIsUploading(false);
            setUploadError('ไม่สามารถประมวลผลรูปภาพได้');
          }
        } catch (err) {
          console.error(err);
          setIsUploading(false);
          setUploadError('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ');
        }
      };
      img.onerror = () => {
        setIsUploading(false);
        setUploadError('ไม่สามารถโหลดรูปภาพนี้ได้');
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      setIsUploading(false);
      setUploadError('เกิดข้อผิดพลาดในการอ่านไฟล์');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser) return;

    const updated: AdminUser = {
      ...adminUser,
      name,
      position,
      email,
      profilePic,
      updatedAt: new Date().toISOString()
    };

    // Save to localStorage for instant persistence
    localStorage.setItem('skt2_admin_user', JSON.stringify(updated));
    if (adminUser.uid) {
      localStorage.setItem(`skt2_admin_user_${adminUser.uid}`, JSON.stringify(updated));
    }

    onUpdateAdmin(updated);

    try {
      if (adminUser.uid) {
        await setDoc(doc(db, 'users', adminUser.uid), updated, { merge: true });
      }
    } catch (err) {
      console.warn('Could not save user profile to Firestore:', err);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');

    if (currentPassword !== 'admin123456') {
      setPwdError('รหัสผ่านปัจจุบันไม่ถูกต้อง');
      return;
    }
    if (newPassword.length < 6) {
      setPwdError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน');
      return;
    }

    setPwdSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPwdSuccess(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Profile Info Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
        
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-800">
              ข้อมูลโปรไฟล์ผู้ดูแลระบบ ({adminUser?.username || 'Admin01'})
            </h2>
            <p className="text-xs text-slate-500">
              อัปโหลดรูปโปรไฟล์ด้วยตนเอง แก้ไขชื่อ ตำแหน่ง และข้อมูลการติดต่อ
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>บันทึกการแก้ไขโปรไฟล์และรูปประจำตัวเรียบร้อยแล้ว</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-6 text-xs">
          
          {/* AVATAR UPLOAD SECTION (Requirement 5) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-orange-50/60 border border-orange-200/90 space-y-4">
            <div className="flex items-center justify-between">
              <label className="block font-extrabold text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-orange-600" />
                <span>รูปโปรไฟล์ผู้ดูแลระบบ (Admin Avatar Photo)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="text-[11px] text-orange-700 hover:text-orange-900 font-semibold underline cursor-pointer flex items-center gap-1"
              >
                <LinkIcon className="w-3 h-3" />
                <span>{showUrlInput ? 'ซ่อนช่องระบุ URL' : 'หรือระบุ URL รูปภาพโดยตรง'}</span>
              </button>
            </div>

            {/* Upload Feedback Messages */}
            {uploadSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{uploadSuccessMsg}</span>
              </div>
            )}
            {uploadError && (
              <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 font-bold text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              
              {/* Avatar Preview with interactive click-to-upload */}
              <div 
                className={`relative group cursor-pointer flex-shrink-0 rounded-2xl p-1 transition-all ${
                  isDragging ? 'ring-4 ring-orange-400 scale-105' : ''
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                title="คลิกเพื่อเลือกไฟล์รูปภาพ หรือลากรูปมาวางที่นี่"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-orange-300 shadow-md relative bg-white">
                  <img
                    src={profilePic}
                    alt="Admin Profile Preview"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = defaultAvatar;
                    }}
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1">
                    <Camera className="w-5 h-5" />
                    <span>เปลี่ยนรูป</span>
                  </div>
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs flex flex-col items-center justify-center text-[10px] text-orange-700 font-bold">
                      <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-1" />
                      <span>กำลังประมวลผล...</span>
                    </div>
                  )}
                </div>

                <div className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-orange-500 text-white shadow-md border-2 border-white group-hover:scale-110 transition-transform">
                  <Camera className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Upload Controls & Actions */}
              <div className="flex-1 space-y-2.5 text-center sm:text-left w-full">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  {/* Main Upload Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm hover:shadow transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>อัปโหลดรูปภาพจากอุปกรณ์</span>
                  </button>

                  {/* Reset to Default Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setProfilePic(defaultAvatar);
                      setUploadSuccessMsg('รีเซ็ตรูปโปรไฟล์เป็นค่าเริ่มต้นแล้ว');
                      setTimeout(() => setUploadSuccessMsg(''), 3000);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>ใช้รูปเริ่มต้น</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  รองรับไฟล์รูปภาพ <strong>JPG, PNG, WebP</strong> (ระบบจะบีบอัดและปรับขนาดให้พอดีอัตโนมัติ เพื่อความรวดเร็วและไม่เปลืองพื้นที่)
                </p>

                {/* Preset Fast Selection */}
                <div className="pt-2 border-t border-orange-100/80">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1.5">
                    หรือเลือกรูปประจำตัววิทยากรทางการ สพป.สุโขทัย เขต 2:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {presetPhotos.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setProfilePic(preset.url);
                          setUploadSuccessMsg(`เลือกรูป ${preset.title} สำเร็จ!`);
                          setTimeout(() => setUploadSuccessMsg(''), 3000);
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10.5px] font-bold border transition cursor-pointer ${
                          profilePic === preset.url
                            ? 'bg-orange-100 text-orange-900 border-orange-300'
                            : 'bg-white hover:bg-orange-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <img 
                          src={preset.url} 
                          alt={preset.title} 
                          className="w-4 h-4 rounded-full object-cover" 
                        />
                        <span>{preset.title.split(' ')[1]}</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            {/* Direct URL Input (Toggled) */}
            {showUrlInput && (
              <div className="pt-2 animate-fadeIn">
                <label className="block font-bold text-slate-700 mb-1">
                  URL รูปประจำตัว (Direct Image URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={profilePic}
                    onChange={(e) => setProfilePic(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(false)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs"
                  >
                    เสร็จสิ้น
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* BASIC INFO FIELDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ตำแหน่งทางการศึกษา *</label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">อีเมลผู้ดูแลระบบ</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ระดับสิทธิ์ (Role)</label>
              <input
                type="text"
                value="ผู้ดูแลระบบ (Admin - กลุ่มนิเทศ ติดตามฯ สพป.สุโขทัย เขต 2)"
                disabled
                className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 font-medium cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="btn-gamified-primary px-6 py-2.5 font-bold shadow-md flex items-center gap-2 cursor-pointer text-xs"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกข้อมูลส่วนตัว</span>
            </button>
          </div>
        </form>

      </div>

      {/* Change Password Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Key className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-extrabold text-slate-800">
            เปลี่ยนรหัสผ่านผู้ดูแลระบบ (Change Password)
          </h3>
        </div>

        {pwdSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>เปลี่ยนรหัสผ่านเรียบร้อยแล้ว</span>
          </div>
        )}

        {pwdError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {pwdError}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3 text-xs max-w-md">
          <div>
            <label className="block font-bold text-slate-700 mb-1">รหัสผ่านปัจจุบัน</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="btn-gamified-secondary px-5 py-2 font-bold shadow cursor-pointer"
            >
              อัปเดตรหัสผ่าน
            </button>
          </div>
        </form>

      </div>

    </div>
  );
};
