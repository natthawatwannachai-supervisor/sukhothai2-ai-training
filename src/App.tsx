/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HeroSection } from './components/home/HeroSection';
import { StepGuideSection } from './components/home/StepGuideSection';
import { SpeakerCard } from './components/home/SpeakerCard';
import { HowToPage } from './components/pages/HowToPage';
import { CoursesPage } from './components/pages/CoursesPage';
import { RegistrationPage } from './components/pages/RegistrationPage';
import { SurveyPage } from './components/pages/SurveyPage';
import { PRNewsPage } from './components/pages/PRNewsPage';
import { CertificatesPage } from './components/pages/CertificatesPage';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { BackgroundMusicPlayer } from './components/common/BackgroundMusicPlayer';
import { INITIAL_SPEAKERS } from './data/initialData';
import { testConnection, db } from './lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Course, AdminUser } from './types';
import { Sparkles, Flame } from 'lucide-react';

export default function App() {
  const [viewMode, setViewMode] = useState<'site' | 'admin'>('site');
  const [activeTab, setActiveTab] = useState<string>('home');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseForReg, setSelectedCourseForReg] = useState<Course | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  // Validate Firestore connection on boot as required by Firebase skill
  useEffect(() => {
    testConnection();

    // Check remembered admin
    const saved = localStorage.getItem('skt2_admin_user');
    if (saved) {
      try {
        setAdminUser(JSON.parse(saved));
      } catch (e) {
        // Ignore JSON error
      }
    }

    // Sync live courses for the whole app
    try {
      const q = collection(db, 'courses');
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const uniqueMap = new Map<string, Course>();
        snapshot.docs.forEach(doc => {
          uniqueMap.set(doc.id, { id: doc.id, ...doc.data() } as Course);
        });
        setCourses(Array.from(uniqueMap.values()));
      });
      return () => unsubscribe();
    } catch {
      // Ignore
    }
  }, []);

  const handleSelectCourse = (course: Course) => {
    setSelectedCourseForReg(course);
  };

  const handleOpenAdmin = () => {
    if (adminUser) {
      setViewMode('admin');
    } else {
      setIsAdminModalOpen(true);
    }
  };

  const handleAdminLoginSuccess = (user: AdminUser) => {
    setAdminUser(user);
    setViewMode('admin');
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('skt2_admin_user');
    setAdminUser(null);
    setViewMode('site');
  };

  return (
    <>
      {viewMode === 'admin' && adminUser ? (
        <AdminDashboard
          adminUser={adminUser}
          onLogout={handleAdminLogout}
          onExitToWebsite={() => setViewMode('site')}
          onUpdateAdmin={(updated) => setAdminUser(updated)}
        />
      ) : (
        <div className="min-h-screen flex flex-col liquid-bg-mesh">
          
          {/* 1. Header & Navigation (Sleek, Elongated, Semi-Transparent Liquid Glass) */}
          <Header 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            openAdminLogin={handleOpenAdmin}
            isAdminLoggedIn={!!adminUser}
          />

          {/* Main Content Sections */}
          <main className="flex-1">
            
            {/* TAB 1: HOME PAGE */}
            {activeTab === 'home' && (
              <div className="animate-fadeIn">
                
                {/* Hero Section */}
                <HeroSection setActiveTab={setActiveTab} />

                {/* 8-Step Guide Section */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <StepGuideSection setActiveTab={setActiveTab} />
                </div>

                {/* Speaker Profile Section (Requirement 3: 3 Speakers with vertical 3:4 untouched images) */}
                <section className="my-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center max-w-2xl mx-auto mb-8">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-800 border border-orange-200 shadow-2xs mb-2">
                      <Flame className="w-3.5 h-3.5 text-orange-600 fill-orange-500" />
                      คณะวิทยากรผู้เชี่ยวชาญ
                    </span>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                      ทีมวิทยากรศึกษานิเทศก์ สพป.สุโขทัย เขต 2
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      ผู้เชี่ยวชาญด้านการส่งเสริม พัฒนานวัตกรรม และการจัดการเรียนรู้ด้วยปัญญาประดิษฐ์ AI เพื่อการศึกษา
                    </p>
                  </div>

                  {/* 3 Speakers Grid with 3:4 Portrait Ratio (100% Untouched) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                    {INITIAL_SPEAKERS.map((speaker, index) => (
                      <SpeakerCard key={speaker.id} speaker={speaker} index={index} />
                    ))}
                  </div>
                </section>

              </div>
            )}

            {/* TAB 2: HOW-TO PAGE */}
            {activeTab === 'how-to' && (
              <HowToPage setActiveTab={setActiveTab} />
            )}

            {/* TAB 3: COURSE INFO PAGE */}
            {activeTab === 'courses' && (
              <CoursesPage 
                onSelectCourse={handleSelectCourse}
                setActiveTab={setActiveTab}
              />
            )}

            {/* TAB 4: REGISTRATION PAGE */}
            {activeTab === 'register' && (
              <RegistrationPage 
                selectedCourse={selectedCourseForReg}
                courses={courses}
                setActiveTab={setActiveTab}
              />
            )}

            {/* TAB 5: SURVEY PAGE */}
            {activeTab === 'survey' && (
              <SurveyPage 
                courses={courses}
                setActiveTab={setActiveTab}
              />
            )}

            {/* TAB 6: PR NEWS PAGE */}
            {activeTab === 'pr' && (
              <PRNewsPage 
                setActiveTab={setActiveTab}
              />
            )}

            {/* TAB 7: DOWNLOAD CERTIFICATES PAGE */}
            {activeTab === 'certificates' && (
              <CertificatesPage 
                setActiveTab={setActiveTab}
              />
            )}

          </main>

          {/* Compact Sleek Footer */}
          <Footer setActiveTab={setActiveTab} />

          {/* Admin Login 3D Popup Modal (No demo password box) */}
          <AdminLoginModal
            isOpen={isAdminModalOpen}
            onClose={() => setIsAdminModalOpen(false)}
            onLoginSuccess={handleAdminLoginSuccess}
          />

        </div>
      )}

      {/* Persistent Looping Background Music Player */}
      <BackgroundMusicPlayer />
    </>
  );
}
