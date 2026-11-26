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
  HelpCircle,
  Lightbulb,
  ArrowRight
} from 'lucide-react';

interface HowToPageProps {
  setActiveTab: (tab: string) => void;
}

export const HowToPage: React.FC<HowToPageProps> = ({ setActiveTab }) => {
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

  const detailedGuides = [
    {
      step: 1,
      title: 'เลือกและศึกษาข้อมูลหลักสูตรที่สนใจ',
      desc: 'เข้าสู่หน้า "ข้อมูลหลักสูตร" เพื่อศึกษารายละเอียด วัตถุประสงค์การอบรม เครื่องมือ AI ที่ใช้ในการสอน เช่น ChatGPT, Google Gemini, Canva AI, Claude พร้อมทั้งคุณสมบัติผู้เข้าอบรม',
      tips: 'แนะนำให้เลือกหลักสูตรที่ตรงกับระดับชั้นหรือกลุ่มสาระการเรียนรู้ที่ท่านสอนเพื่อการประยุกต์ใช้สูงสุด',
      actionLabel: 'ดูรายการหลักสูตรทั้งหมด',
      actionTab: 'courses'
    },
    {
      step: 2,
      title: 'ตรวจสอบปฏิทิน Google Calendar และเลือกวันที่ยังว่าง',
      desc: 'ระบบเชื่อมโยงกับปฏิทิน Google Calendar แสดงวันที่และเวลาที่มีการลงกิจกรรมหรืองานไว้แบบเรียลไทม์ โดยวันที่มีกิจกรรมแล้วจะถูกล็อกไม่สามารถเลือกซ้ำได้ ให้เลือกเฉพาะวันที่ว่างอยู่เท่านั้น',
      tips: 'สามารถคลิกเลือกวันที่ว่างบนปฏิทินได้โดยตรง พร้อมระบุช่วงเวลาที่ต้องการจัดอบรม',
      actionLabel: 'ตรวจสอบปฏิทินวันว่าง',
      actionTab: 'register'
    },
    {
      step: 3,
      title: 'กรอกข้อมูลลงทะเบียนเข้ารับการอบรม',
      desc: 'กรอกข้อมูลส่วนบุคคลให้ครบถ้วน ได้แก่ คำนำหน้า ชื่อ-นามสกุล, โรงเรียนต้นสังกัด, อำเภอสังกัด, หมายเลขโทรศัพท์ที่ติดต่อได้จริง และ Line ID สำหรับเข้ากลุ่มรับสื่อ',
      tips: 'โปรดตรวจสอบชื่อและนามสกุลให้ถูกต้อง เนื่องจากระบบจะใช้ข้อมูลนี้ไปพิมพ์ลงบนเกียรติบัตร',
      actionLabel: 'กรอกแบบฟอร์มลงทะเบียน',
      actionTab: 'register'
    },
    {
      step: 4,
      title: 'ตรวจสอบข้อมูลและกดยืนยันผ่านระบบ 3D Popup',
      desc: 'เมื่อกดปุ่ม "ลงทะเบียน" ระบบจะแสดงหน้าต่าง 3D Dialog สรุปข้อมูลทั้งหมดของท่าน ให้ตรวจสอบความถูกต้องอีกครั้ง จากนั้นกด "ยืนยันการลงทะเบียน"',
      tips: 'ระบบจะบันทึกข้อมูลเข้าสู่ฐานข้อมูล Firestore ทันทีและแสดงกล่องข้อความสำเร็จ',
      actionLabel: 'ไปยังหน้าลงทะเบียน',
      actionTab: 'register'
    },
    {
      step: 5,
      title: 'เข้าร่วมการอบรมเชิงปฏิบัติการ (Workshop)',
      desc: 'เข้ารับการอบรมตามวัน เวลา และสถานที่ หรือระบบห้องเรียนออนไลน์ Zoom ที่กำหนด มีวิทยากรศึกษานิเทศก์คอยดูแลและให้คำแนะนำอย่างใกล้ชิดแบบ Hands-on',
      tips: 'เตรียมอุปกรณ์โน้ตบุ๊กหรือแท็บเล็ต พร้อมสัญญาณอินเทอร์เน็ตที่เสถียรเพื่อการลงมือปฏิบัติ',
      actionLabel: 'ดูข้อมูลวิทยากร',
      actionTab: 'home'
    },
    {
      step: 6,
      title: 'จัดทำและส่งชิ้นงาน/ผลการปฏิบัติการด้วย AI',
      desc: 'ระหว่างการอบรม ผู้เข้ารับการอบรมจะได้ลงมือสร้างผลงานจริง เช่น แผนการสอนเชิงรุก, สื่อ Canva AI หรือแบบทดสอบอัจฉริยะ และส่งมอบผ่านระบบตามกำหนด',
      tips: 'ผลงานที่ผ่านเกณฑ์จะได้รับสิทธิ์การออกเกียรติบัตรรับรองจาก สพป.สุโขทัย เขต 2',
      actionLabel: 'ดูตัวอย่างผลงานและภาพกิจกรรม',
      actionTab: 'pr'
    },
    {
      step: 7,
      title: 'ตอบแบบสอบถามความพึงพอใจการอบรม',
      desc: 'หลังสิ้นสุดการอบรม ผู้เข้าอบรมต้องทำแบบประเมินความพึงพอใจ 10 ข้อด้านเนื้อหาหลักสูตรในรูปแบบ Likert Scale (1-5) พร้อมระบุความประทับใจและข้อเสนอแนะเพื่อพัฒนาโครงการต่อไป',
      tips: 'แบบประเมินใช้เวลาประมาณ 2-3 นาที ข้อมูลของท่านช่วยพัฒนางานการศึกษาได้อย่างมีคุณค่ายิ่ง',
      actionLabel: 'ทำแบบประเมินความพึงพอใจ',
      actionTab: 'survey'
    },
    {
      step: 8,
      title: 'ค้นหาและดาวน์โหลดเกียรติบัตรอิเล็กทรอนิกส์ (PDF A4)',
      desc: 'เข้าสู่หน้า "ประชาสัมพันธ์และเกียรติบัตร" พิมพ์ชื่อ-สกุลของท่านในช่องค้นหา ระบบจะตรวจสอบรายชื่อที่ผ่านการอบรมและสร้างไฟล์เกียรติบัตร A4 แนวนอนความละเอียดสูงให้ดาวน์โหลดทันที',
      tips: 'ลงนามรับรองโดย ผู้อำนวยการ สพป.สุโขทัย เขต ๒ (นายเดชา ลุนาวงค์) สามารถบันทึกเป็น PDF หรือสั่งพิมพ์ประกอบ วPA ได้',
      actionLabel: 'ค้นหาเกียรติบัตรของคุณ',
      actionTab: 'pr'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="liquid-glass p-6 sm:p-8 mb-8 text-center relative overflow-hidden bg-gradient-to-r from-orange-100/60 via-amber-50/80 to-yellow-100/60 border border-orange-200">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/90 text-orange-700 shadow-2xs border border-orange-200 mb-2">
          <HelpCircle className="w-3.5 h-3.5 text-orange-500" />
          คู่มือการใช้งานระบบ
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
          ขั้นตอนการใช้งานระบบ 8 ขั้นตอนอย่างละเอียด
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto mt-1.5">
          คำแนะนำทีละขั้นตอนสำหรับคุณครูและบุคลากรทางการศึกษาในการลงทะเบียน เข้ารับการอบรม จนถึงการรับเกียรติบัตรออนไลน์
        </p>
      </div>

      {/* Step by step timeline */}
      <div className="space-y-4">
        {detailedGuides.map((item, idx) => {
          const stepMeta = STEPS[idx];
          const Icon = iconMap[stepMeta.icon] || BookOpen;

          return (
            <div 
              key={item.step}
              className="liquid-glass p-5 sm:p-6 relative transition-all duration-300 hover:shadow-xl hover:border-orange-300"
            >
              <div className="flex flex-col md:flex-row gap-4 items-start">
                
                <div className="flex items-center md:flex-col gap-2.5 flex-shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 flex items-center justify-center text-white shadow-md shadow-orange-300/40">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-orange-50 text-orange-800 border border-orange-200 text-center">
                    ขั้นที่ 0{item.step}
                  </span>
                </div>

                <div className="flex-1 space-y-2.5">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {item.desc}
                  </p>

                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">ข้อแนะนำ: </span>
                      <span>{item.tips}</span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={() => setActiveTab(item.actionTab)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 hover:text-orange-900 bg-orange-100/70 hover:bg-orange-100 px-3.5 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="mt-10 text-center p-6 sm:p-8 liquid-glass bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 text-white">
        <h3 className="text-lg sm:text-xl font-black mb-1.5">พร้อมพัฒนาทักษะ AI เพื่อการศึกษาแล้วหรือยัง?</h3>
        <p className="text-xs sm:text-sm text-amber-50 mb-5 max-w-xl mx-auto font-medium">
          เริ่มต้นด้วยการเลือกหลักสูตรที่เหมาะสมกับท่าน หรือกดลงทะเบียนเพื่อจับจองที่นั่งได้ทันที
        </p>
        <button
          onClick={() => setActiveTab('register')}
          className="btn-gamified-accent py-2.5 px-7 text-xs sm:text-sm font-bold shadow-xl inline-flex items-center gap-2"
        >
          <span>ลงทะเบียนเข้ารับการอบรมตอนนี้</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
