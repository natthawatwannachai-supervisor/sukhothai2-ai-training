import React, { useState } from 'react';
import { CourseManagementTab } from './tabs/CourseManagementTab';
import { RegistrationManagementTab } from './tabs/RegistrationManagementTab';
import { SurveyDashboardTab } from './tabs/SurveyDashboardTab';
import { PRManagementTab } from './tabs/PRManagementTab';
import { CertificateManagementTab } from './tabs/CertificateManagementTab';
import { ProfileTab } from './tabs/ProfileTab';
import { AdminUser } from '../../types';
import { 
  BookOpen, 
  Users, 
  FileCheck2, 
  Award, 
  Bell,
  User, 
  LogOut, 
  Globe, 
  ShieldCheck,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

interface AdminDashboardProps {
  adminUser: AdminUser;
  onLogout: () => void;
  onExitToWebsite: () => void;
  onUpdateAdmin: (user: AdminUser) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminUser,
  onLogout,
  onExitToWebsite,
  onUpdateAdmin
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<
    'courses' | 'registrations' | 'surveys' | 'pr' | 'certificates' | 'profile'
  >('registrations');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Separated PR news and Certificate management into distinct admin tabs
  const menuItems = [
    { id: 'courses', label: '1. จัดการหลักสูตร', icon: BookOpen, sub: 'Course Management' },
    { id: 'registrations', label: '2. จัดการข้อมูลการลงทะเบียน', icon: Users, sub: 'Registration & Charts' },
    { id: 'surveys', label: '3. แดชบอร์ดแบบสอบถาม', icon: FileCheck2, sub: 'Survey & Infographic' },
    { id: 'pr', label: '4. จัดการข่าวประชาสัมพันธ์', icon: Bell, sub: 'News & Photo Albums' },
    { id: 'certificates', label: '5. จัดการเกียรติบัตร', icon: Award, sub: 'Certificates & Template' },
    { id: 'profile', label: '6. ข้อมูลโปรไฟล์', icon: User, sub: 'Admin Profile & Security' },
  ];

  return (
    <div className="min-h-screen bg-orange-50/30 flex flex-col font-['Prompt'] overflow-x-hidden w-full">
      
      {/* Top Admin Bar - Matches the exact width and rounded-2xl style of the main site */}
      <header className="sticky top-2 z-40 w-full max-w-7xl mx-auto px-2 sm:px-4 mb-3">
        <div className="liquid-nav rounded-2xl px-3.5 py-2 sm:px-5 sm:py-2.5 transition-all duration-300 shadow-md border border-white/95">
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
            
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-1.5 rounded-xl text-slate-600 hover:bg-orange-50 cursor-pointer"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <X className="w-5 h-5 text-orange-600" /> : <Menu className="w-5 h-5 text-orange-600" />}
              </button>

              <img
                src="/assets/aistudio/LOGO_E-SPORT__18__733b26a9.png"
                alt="Logo"
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain shadow-2xs"
              />
              <div className="text-left">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-xs sm:text-sm text-slate-800 leading-tight">
                    ระบบบริหารจัดการ (Admin Dashboard)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-orange-100 text-orange-800 border border-orange-200">
                    สพป.สุโขทัย เขต 2
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 hidden sm:block">
                  กลุ่มนิเทศ ติดตามและประเมินผลการจัดการศึกษา
                </p>
              </div>
            </div>

            {/* Right Admin Controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              
              {/* Admin Badge with Avatar */}
              <button
                onClick={() => setActiveAdminTab('profile')}
                className="hidden md:flex items-center gap-2.5 bg-orange-50/90 hover:bg-orange-100/90 border border-orange-200/90 px-2.5 py-1.5 rounded-xl transition cursor-pointer text-left shadow-2xs group"
                title="คลิกเพื่อแก้ไขข้อมูลโปรไฟล์และเปลี่ยนรูปภาพ"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={adminUser.profilePic || '/assets/aistudio/ChatGPT_Image_8__._._2569_14_03_22_a7c958cc.png'}
                    alt={adminUser.name}
                    className="w-7 h-7 rounded-lg object-cover border border-orange-300 shadow-2xs group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/aistudio/ChatGPT_Image_8__._._2569_14_03_22_a7c958cc.png';
                    }}
                  />
                  <div className="w-2 h-2 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 ring-1 ring-white" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-orange-950 leading-tight group-hover:text-orange-600 transition-colors">
                    {adminUser.name}
                  </div>
                  <div className="text-[9px] text-orange-600 font-medium">
                    {adminUser.username} ({adminUser.role})
                  </div>
                </div>
              </button>

              {/* Back to Public Web */}
              <button
                onClick={onExitToWebsite}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-orange-50 text-slate-700 border border-orange-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Globe className="w-3.5 h-3.5 text-orange-600" />
                <span className="hidden sm:inline">ดูหน้าเว็บไซต์</span>
              </button>

              {/* Logout */}
              <button
                onClick={onLogout}
                className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="ออกจากระบบ"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">ออกจากระบบ</span>
              </button>

            </div>

          </div>
        </div>
      </header>

      {/* Mobile/Tablet Horizontal Tab Strip (Ensures all tabs are easily accessible without exceeding screen) */}
      <div className="lg:hidden max-w-7xl mx-auto w-full px-2 sm:px-4 mb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeAdminTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveAdminTab(item.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex-shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs font-black'
                    : 'bg-white text-slate-700 border border-orange-100 hover:bg-orange-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-orange-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Admin Body - Contained within max-w-7xl mx-auto and proper padding */}
      <div className="max-w-7xl mx-auto w-full flex-1 flex px-2 sm:px-4 pb-6 gap-4 sm:gap-6 overflow-hidden">
        
        {/* Desktop Sidebar Menu */}
        <aside className="hidden lg:block w-72 flex-shrink-0 space-y-2">
          <div className="p-4 rounded-2xl bg-white border border-orange-100 shadow-sm space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-3 mb-2 block">
              เมนูบริหารจัดการระบบ
            </span>

            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeAdminTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveAdminTab(item.id as any)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 text-white shadow-md shadow-orange-300/40'
                      : 'text-slate-700 hover:bg-orange-50/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-orange-500'}`} />
                    <div>
                      <div className="text-xs font-bold leading-tight">{item.label}</div>
                      <div className={`text-[10px] ${isActive ? 'text-orange-100' : 'text-slate-400'}`}>
                        {item.sub}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </button>
              );
            })}
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-200 text-xs text-orange-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-orange-600" />
              <span>ความปลอดภัยระบบ</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              เชื่อมต่อฐานข้อมูล Google Cloud Firestore แบบเข้ารหัส และแยกสิทธิ์ผู้ดูแลระบบอย่างปลอดภัย
            </p>
          </div>
        </aside>

        {/* Mobile Drawer Menu */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setSidebarOpen(false)} />
            <div className="relative w-72 bg-white h-full p-4 space-y-2 z-10 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <span className="font-extrabold text-sm text-slate-800">เมนูผู้ดูแลระบบ</span>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeAdminTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveAdminTab(item.id as any);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition ${
                      isActive
                        ? 'bg-orange-500 text-white shadow'
                        : 'text-slate-700 hover:bg-orange-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <div>
                        <div className="text-xs font-bold">{item.label}</div>
                        <div className="text-[10px] opacity-80">{item.sub}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic Admin View */}
        <main className="flex-1 min-w-0">
          {activeAdminTab === 'courses' && <CourseManagementTab />}
          {activeAdminTab === 'registrations' && <RegistrationManagementTab />}
          {activeAdminTab === 'surveys' && <SurveyDashboardTab />}
          {activeAdminTab === 'pr' && <PRManagementTab />}
          {activeAdminTab === 'certificates' && <CertificateManagementTab />}
          {activeAdminTab === 'profile' && (
            <ProfileTab 
              adminUser={adminUser} 
              onUpdateAdmin={onUpdateAdmin} 
            />
          )}
        </main>

      </div>

    </div>
  );
};
