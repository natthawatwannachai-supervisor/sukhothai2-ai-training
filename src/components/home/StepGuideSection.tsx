import React from 'react';
import { STEPS } from '../../data/initialData';
import { 
  BookOpen, 
  Calendar, 
  UserCheck, 
  CheckCircle2, 
  Laptop, 
  UploadCloud, 
  HeartHandshake, 
  Award, 
  ArrowRight 
} from 'lucide-react';

interface StepGuideProps {
  setActiveTab: (tab: string) => void;
}

export const StepGuideSection: React.FC<StepGuideProps> = ({ setActiveTab }) => {
  const iconMap: Record<string, React.ElementType> = {
    BookOpen,
    Calendar,
    UserCheck,
    CheckCircle2,
    Laptop,
    UploadCloud,
    HeartHandshake,
    Award
  };

  const getStepTargetTab = (step: number) => {
    switch(step) {
      case 1: return 'courses';
      case 2: return 'register';
      case 3: return 'register';
      case 4: return 'register';
      case 5: return 'courses';
      case 6: return 'how-to';
      case 7: return 'survey';
      case 8: return 'pr';
      default: return 'how-to';
    }
  };

  return (
    <section className="my-12">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-800 border border-orange-200 shadow-2xs mb-2">
          Roadmap สู่ความสำเร็จ
        </span>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
          ขั้นตอนการใช้งานระบบ 8 ขั้นตอน
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
          กระบวนการเข้ารับการอบรมแบบครบวงจร ตั้งแต่ศึกษาหลักสูตรจนถึงการรับเกียรติบัตรออนไลน์
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STEPS.map((item) => {
          const Icon = iconMap[item.icon] || BookOpen;
          return (
            <div
              key={item.step}
              onClick={() => setActiveTab(getStepTargetTab(item.step))}
              className="liquid-glass liquid-glass-hover p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between group cursor-pointer border-t-4 border-t-orange-400"
            >
              {/* Background Step Watermark */}
              <div className="absolute -right-2 -bottom-4 text-7xl font-black text-orange-200/30 select-none group-hover:text-orange-200/50 transition-colors pointer-events-none">
                0{item.step}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-300/40 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-100 group-hover:bg-orange-100 transition">
                    ขั้นที่ {item.step}
                  </span>
                </div>

                <h3 className="font-bold text-slate-800 text-sm sm:text-base group-hover:text-orange-600 transition-colors mb-1">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  {item.desc}
                </p>
              </div>

              <div className="flex items-center text-xs font-bold text-orange-600 pt-2 border-t border-orange-100 group-hover:translate-x-1 transition-transform">
                <span>เข้าสู่เมนูนี้</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
