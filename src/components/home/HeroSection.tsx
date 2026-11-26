import React from 'react';
import { PixarCanvas3D } from './PixarCanvas3D';
import { 
  UserPlus, 
  FileCheck2, 
  CalendarDays, 
  Award, 
  ShieldCheck,
  CheckCircle,
  Zap,
  Flame
} from 'lucide-react';

interface HeroSectionProps {
  setActiveTab: (tab: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ setActiveTab }) => {
  return (
    <section className="relative pt-2 pb-10 sm:pb-14 overflow-hidden">
      
      {/* Background Decorative Warm Liquid Glow Orbs */}
      <div className="absolute top-8 left-1/4 w-96 h-96 bg-amber-200/50 rounded-full blur-3xl pointer-events-none -z-10 animate-liquid-glow" />
      <div className="absolute top-16 right-10 w-80 h-80 bg-orange-200/45 rounded-full blur-3xl pointer-events-none -z-10 animate-liquid-glow" />
      <div className="absolute -bottom-8 left-10 w-72 h-72 bg-yellow-200/40 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          
          {/* Left Content (Col 7) */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-5">
            
            {/* Gamified Liquid Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 shadow-sm border border-orange-200 backdrop-blur-md">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
              <span className="text-xs font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 inline" />
                สพป.สุโขทัย เขต 2 • Gamified AI Platform
              </span>
            </div>

            {/* Large Prominent Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] font-black text-slate-900 leading-[1.25] tracking-tight">
              ระบบลงทะเบียนเพื่อรับการอบรมเชิงปฏิบัติการ{' '}
              <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
                เกี่ยวกับการพัฒนาทักษะทางด้านเทคโนโลยีดิจิทัลและปัญญาประดิษฐ์ AI เพื่อการศึกษา
              </span>
            </h1>

            {/* Subtitle citing the organization */}
            <div className="p-3.5 rounded-2xl bg-orange-50/80 border border-orange-200/80 text-xs sm:text-sm font-semibold text-orange-950 leading-relaxed shadow-2xs backdrop-blur-xs">
              <div className="flex items-center justify-center lg:justify-start gap-1.5 text-orange-700 mb-0.5">
                <ShieldCheck className="w-4 h-4 text-orange-600 inline" />
                <span className="font-bold">หน่วยงานผู้จัด:</span>
              </div>
              กลุ่มงานส่งเสริมพัฒนาสื่อ นวัตกรรมและเทคโนโลยีทางการศึกษา กลุ่มนิเทศ ติดตาม และประเมินผลการจัดการศึกษา สำนักงานเขตพื้นที่การศึกษาประถมศึกษาสุโขทัย เขต 2
            </div>

            {/* 2 lines of site description */}
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              แพลตฟอร์มบริการลงทะเบียนอบรมเชิงปฏิบัติการออนไลน์สำหรับผู้บริหาร ครู และบุคลากรทางการศึกษา 
              เพื่อเสริมสร้างศักยภาพด้านปัญญาประดิษฐ์ (AI) และเทคโนโลยีดิจิทัลสู่การจัดการเรียนรู้ในชั้นเรียนยุคใหม่
            </p>

            {/* Highlights */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 text-xs font-bold text-slate-700 pt-0.5">
              <span className="flex items-center gap-1 bg-white/90 px-3 py-1 rounded-full shadow-2xs border border-orange-200">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> อบรมฟรี พร้อมเกียรติบัตร A4
              </span>
              <span className="flex items-center gap-1 bg-white/90 px-3 py-1 rounded-full shadow-2xs border border-orange-200">
                <CheckCircle className="w-3.5 h-3.5 text-orange-500" /> ปฏิบัติการจริงกับวิทยากร
              </span>
              <span className="flex items-center gap-1 bg-white/90 px-3 py-1 rounded-full shadow-2xs border border-orange-200">
                <CheckCircle className="w-3.5 h-3.5 text-amber-500" /> ประเมินออนไลน์รับผลทันที
              </span>
            </div>

            {/* 4 Themed Gamified 3D Motion Buttons */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5 max-w-xl mx-auto lg:mx-0">
              
              <button
                onClick={() => setActiveTab('register')}
                className="btn-gamified-primary py-3.5 px-5 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-lg cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>ลงทะเบียนเพื่อเข้ารับการอบรม</span>
              </button>

              <button
                onClick={() => setActiveTab('survey')}
                className="btn-gamified-accent py-3.5 px-5 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-lg cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>ตอบแบบสอบถามความพึงพอใจ</span>
              </button>

              <button
                onClick={() => setActiveTab('courses')}
                className="btn-gamified-secondary py-3.5 px-5 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-lg cursor-pointer"
              >
                <CalendarDays className="w-4 h-4" />
                <span>ตรวจสอบตารางการอบรม</span>
              </button>

              <button
                onClick={() => setActiveTab('pr')}
                className="btn-gamified-soft py-3.5 px-5 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-md cursor-pointer"
              >
                <Award className="w-4 h-4 text-orange-600" />
                <span>ดาวน์โหลดรูปภาพและเกียรติบัตร</span>
              </button>

            </div>

          </div>

          {/* Right: Embedded 3D Mascot Object (Col 5) */}
          <div className="lg:col-span-5 flex justify-center">
            <PixarCanvas3D />
          </div>

        </div>
      </div>

    </section>
  );
};
