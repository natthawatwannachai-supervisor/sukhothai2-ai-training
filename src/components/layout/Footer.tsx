import React from 'react';
import { Sparkles, Heart } from 'lucide-react';

interface FooterProps {
  setActiveTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab }) => {
  return (
    <footer className="mt-8 border-t border-orange-200/50 bg-white/60 backdrop-blur-md py-2 sm:py-2.5">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          
          {/* Logo & Official Citation in compact form */}
          <div className="flex items-center gap-2">
            <img 
              src="/assets/aistudio/LOGO_E-SPORT__18__733b26a9.png" 
              alt="สพป.สุโขทัย เขต 2" 
              className="w-5 h-5 sm:w-6 sm:h-6 object-contain shadow-2xs flex-shrink-0"
            />
            <p className="text-[10px] text-slate-600 leading-tight font-medium">
              เว็บไซต์พัฒนาโดย ศึกษานิเทศก์ กลุ่มงานส่งเสริมพัฒนาสื่อ นวัตกรรมและเทคโนโลยีทางการศึกษา กลุ่มนิเทศ ติดตาม และประเมินผลการจัดการศึกษา สพป.สุโขทัย เขต 2
            </p>
          </div>

          {/* Compact Mini Links */}
          <div className="flex items-center gap-2.5 text-[10px] text-slate-500 font-semibold flex-shrink-0">
            <button 
              onClick={() => setActiveTab('how-to')} 
              className="hover:text-orange-600 transition cursor-pointer"
            >
              คู่มือ
            </button>
            <span>•</span>
            <button 
              onClick={() => setActiveTab('courses')} 
              className="hover:text-orange-600 transition cursor-pointer"
            >
              หลักสูตร
            </button>
            <span>•</span>
            <button 
              onClick={() => setActiveTab('register')} 
              className="hover:text-orange-600 transition cursor-pointer"
            >
              ลงทะเบียน
            </button>
            <span>•</span>
            <button 
              onClick={() => setActiveTab('survey')} 
              className="hover:text-orange-600 transition cursor-pointer"
            >
              แบบประเมิน
            </button>
            <span>•</span>
            <button 
              onClick={() => setActiveTab('pr')} 
              className="hover:text-orange-600 transition cursor-pointer"
            >
              ข่าวสาร
            </button>
            <span>•</span>
            <button 
              onClick={() => setActiveTab('certificates')} 
              className="hover:text-orange-600 transition cursor-pointer"
            >
              เกียรติบัตร
            </button>
          </div>

        </div>
      </div>
    </footer>
  );
};
