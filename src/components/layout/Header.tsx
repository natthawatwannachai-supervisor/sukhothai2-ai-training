import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  Menu, 
  X, 
  ChevronDown, 
  BookOpen, 
  UserPlus, 
  FileCheck2, 
  Bell, 
  Home, 
  HelpCircle,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Award
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openAdminLogin: () => void;
  isAdminLoggedIn?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  setActiveTab, 
  openAdminLogin,
  isAdminLoggedIn 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { 
      id: 'home', 
      label: 'หน้าแรก', 
      desc: 'ภาพรวมระบบ & คณะวิทยากร',
      icon: Home,
      tag: 'หลัก'
    },
    { 
      id: 'how-to', 
      label: 'ขั้นตอนการใช้งาน', 
      desc: 'คู่มือและขั้นตอนเข้ารับการอบรม',
      icon: HelpCircle,
      tag: 'คู่มือ'
    },
    { 
      id: 'courses', 
      label: 'ข้อมูลหลักสูตร', 
      desc: 'เนื้อหาหลักสูตรและเครื่องมือ AI',
      icon: BookOpen,
      tag: 'หลักสูตร'
    },
    { 
      id: 'register', 
      label: 'ลงทะเบียน', 
      desc: 'เลือกรอบวันที่และสมัครเข้าร่วม',
      icon: UserPlus,
      tag: 'เปิดรับ'
    },
    { 
      id: 'survey', 
      label: 'ตอบแบบสอบถาม', 
      desc: 'ประเมินความพึงพอใจการอบรม',
      icon: FileCheck2,
      tag: 'ประเมิน'
    },
    { 
      id: 'pr', 
      label: 'ข่าวประชาสัมพันธ์', 
      desc: 'ข่าวสารและภาพกิจกรรมการอบรม',
      icon: Bell,
      tag: 'ข่าวสาร'
    },
    { 
      id: 'certificates', 
      label: 'ดาวน์โหลดเกียรติบัตร', 
      desc: 'ค้นหาและพิมพ์เกียรติบัตรออนไลน์',
      icon: Award,
      tag: 'วุฒิบัตร'
    },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setIsOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminClick = () => {
    setIsOpen(false);
    openAdminLogin();
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeItem = navItems.find(item => item.id === activeTab);

  return (
    <>
      {/* Background overlay when dropdown is open for mobile/touch friendly dismissal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-35 bg-slate-900/10 backdrop-blur-[1px] transition-opacity duration-200"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <header className="sticky top-2 z-40 w-full max-w-7xl mx-auto px-2 sm:px-4 mb-3">
        {/* Strictly One-Line Liquid Glassmorphism Navigation Bar */}
        <div className="liquid-nav rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 transition-all duration-300 shadow-md border border-white/95">
          <div className="flex flex-row items-center justify-between gap-2 sm:gap-4 w-full">
            
            {/* Left: District Logo + Dual Header Text (Future of Education... & กลุ่มนิเทศ...) */}
            <div 
              onClick={() => handleNavClick('home')}
              className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none min-w-0"
              title="กลับสู่หน้าแรก"
            >
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 to-amber-300 rounded-xl blur opacity-40 group-hover:opacity-80 transition duration-300"></div>
                <img 
                  src="/assets/aistudio/LOGO_E-SPORT__18__733b26a9.png" 
                  alt="ตราสัญลักษณ์ สพป.สุโขทัย เขต 2" 
                  className="relative w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow-sm rounded-lg transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              <div className="flex flex-col justify-center min-w-0">
                {/* Title Line */}
                <span className="font-black text-xs sm:text-sm md:text-base bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent tracking-tight leading-tight truncate">
                  Future of Education: AI & Digital Tech Platform
                </span>
                {/* Subtitle Line */}
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold leading-tight truncate">
                  กลุ่มนิเทศ ติดตาม และประเมินผลการจัดการศึกษา
                </span>
              </div>
            </div>

            {/* Right: Quick Admin Lock Icon + Dropdown Menu Trigger (Strictly 1 Row) */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              
              {/* Admin Login Button - Lock Icon Only (ตามความต้องการของผู้ใช้) */}
              <button
                onClick={openAdminLogin}
                title={isAdminLoggedIn ? "แดชบอร์ดผู้ดูแลระบบ" : "ลงชื่อเข้าใช้งานสำหรับเจ้าหน้าที่"}
                aria-label="เข้าสู่ระบบผู้ดูแล"
                className={`p-2 sm:p-2.5 rounded-xl transition-all duration-200 cursor-pointer shadow-xs flex items-center justify-center flex-shrink-0 ${
                  isAdminLoggedIn
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-200 ring-2 ring-amber-300 hover:scale-105'
                    : 'bg-white/80 hover:bg-orange-50 text-orange-600 border border-orange-200/80 hover:border-orange-400 hover:scale-105'
                }`}
              >
                <Lock className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isAdminLoggedIn ? 'text-white' : 'text-orange-600'}`} />
              </button>

              {/* Dropdown Menu Trigger Button */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  aria-expanded={isOpen}
                  aria-label="เปิดเมนูการใช้งาน"
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 cursor-pointer shadow-xs flex-shrink-0 select-none ${
                    isOpen 
                      ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 text-white shadow-md ring-2 ring-orange-300' 
                      : 'bg-gradient-to-r from-orange-500/10 via-amber-500/15 to-yellow-500/15 hover:bg-orange-100/90 text-orange-950 border border-orange-200/90'
                  }`}
                >
                  {isOpen ? (
                    <X className="w-4 h-4 text-white" />
                  ) : (
                    <Menu className="w-4 h-4 text-orange-600" />
                  )}
                  <span>เมนู</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : 'text-orange-600'}`} />
                </button>

                {/* Dropdown Menu Panel: Beautiful, Organized, Gamified Liquid Glassmorphism */}
                {isOpen && (
                  <div className="absolute right-0 mt-2.5 w-[310px] sm:w-[360px] bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-orange-200/90 p-3 sm:p-3.5 z-50 animate-fadeIn divide-y divide-orange-100/80 origin-top-right">
                    
                    {/* Header inside dropdown */}
                    <div className="pb-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-black text-slate-800">
                          เมนูนำทาง (Navigation)
                        </span>
                      </div>
                      {activeItem && (
                        <span className="text-[11px] font-bold text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-orange-600" />
                          {activeItem.label}
                        </span>
                      )}
                    </div>

                    {/* Nav Items List */}
                    <div className="py-2 space-y-1">
                      {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavClick(item.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer group ${
                              isActive
                                ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 text-white font-black shadow-sm ring-1 ring-orange-300'
                                : 'text-slate-700 hover:text-orange-700 hover:bg-orange-50/80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                                isActive 
                                  ? 'bg-white/20 text-white' 
                                  : 'bg-orange-100 text-orange-600'
                              }`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className={`text-xs sm:text-sm leading-tight truncate ${isActive ? 'text-white font-black' : 'font-bold'}`}>
                                  {item.label}
                                </div>
                                <div className={`text-[10px] leading-tight mt-0.5 truncate ${isActive ? 'text-white/85' : 'text-slate-400'}`}>
                                  {item.desc}
                                </div>
                              </div>
                            </div>

                            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md flex-shrink-0 ml-2 ${
                              isActive
                                ? 'bg-white/25 text-white'
                                : 'bg-slate-100 text-slate-500 group-hover:bg-orange-100 group-hover:text-orange-700'
                            }`}>
                              {item.tag}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Footer inside dropdown: Admin Access */}
                    <div className="pt-2">
                      <button
                        onClick={handleAdminClick}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                          isAdminLoggedIn
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-orange-800 border border-slate-200/70 hover:border-orange-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isAdminLoggedIn ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {isAdminLoggedIn ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold leading-tight">
                              {isAdminLoggedIn ? 'แดชบอร์ดผู้ดูแลระบบ' : 'เข้าสู่ระบบแอดมิน'}
                            </div>
                            <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                              {isAdminLoggedIn ? 'กำลังเข้าสู่ระบบอยู่' : 'สำหรับศึกษานิเทศก์/เจ้าหน้าที่'}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                          isAdminLoggedIn ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {isAdminLoggedIn ? 'ONLINE' : 'AUTH'}
                        </span>
                      </button>
                    </div>

                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      </header>
    </>
  );
};
