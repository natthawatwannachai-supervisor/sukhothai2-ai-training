import React, { useState, useEffect, useRef } from 'react';
import { PRNews, Course } from '../../types';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  Bell, 
  Award, 
  Search, 
  FolderDown, 
  ExternalLink, 
  Printer, 
  Download,
  Sparkles, 
  CheckCircle, 
  Calendar, 
  Building2
} from 'lucide-react';
import { downloadCertificatePdf, printCertificate } from '../../utils/pdfExport';
import { toArabicNumerals } from '../../utils/thaiNumerals';

interface PRCertificatesPageProps {
  courses?: Course[];
}

export const PRCertificatesPage: React.FC<PRCertificatesPageProps> = ({ 
  courses: initialCourses = [] 
}) => {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [news, setNews] = useState<PRNews[]>([]);
  const [searchName, setSearchName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('หลักสูตรการพัฒนาทักษะดิจิทัลและปัญญาประดิษฐ์ AI เพื่อการศึกษา');
  const [certDate, setCertDate] = useState(() => {
    const today = new Date();
    return `${today.getDate()} พฤศจิกายน ${today.getFullYear() + 543}`;
  });
  const [generatedName, setGeneratedName] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Certificate template settings from localStorage / defaults
  const [directorName, setDirectorName] = useState('นายเดชา ลุนาวงค์');
  const [directorPos, setDirectorPos] = useState('ผู้อำนวยการสำนักงานเขตพื้นที่การศึกษาประถมศึกษาสุโขทัย เขต 2');
  const [customCertBg, setCustomCertBg] = useState('');
  const [certPrefix, setCertPrefix] = useState('สพป.สท.2-AI-2569');

  const certRef = useRef<HTMLDivElement>(null);

  // Load certificate settings if configured by admin
  useEffect(() => {
    const savedBg = localStorage.getItem('skt2_cert_bg');
    if (savedBg) setCustomCertBg(savedBg);
    const savedDir = localStorage.getItem('skt2_cert_director');
    if (savedDir) setDirectorName(savedDir);
    const savedPos = localStorage.getItem('skt2_cert_pos');
    if (savedPos) setDirectorPos(savedPos);
    const savedPrefix = localStorage.getItem('skt2_cert_prefix');
    if (savedPrefix) setCertPrefix(toArabicNumerals(savedPrefix));
  }, []);

  // Sync courses
  useEffect(() => {
    try {
      const q = collection(db, 'courses');
      const unsubscribe = onSnapshot(
        q, 
        (snapshot) => {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
          setCourses(list);
          if (list.length > 0) setSelectedCourse(list[0].title);
        },
        (error) => {
          console.warn('Courses sync error:', error);
          setCourses([]);
        }
      );
      return () => unsubscribe();
    } catch {
      setCourses([]);
    }
  }, []);

  // Sync PR News from Firestore (Requirement 10: Clean production state)
  useEffect(() => {
    try {
      const q = collection(db, 'pr_news');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetched = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as PRNews));
          setNews(fetched);
        },
        () => setNews([])
      );
      return () => unsubscribe();
    } catch {
      setNews([]);
    }
  }, []);

  const handleSearchCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchName.trim()) return;
    setGeneratedName(searchName.trim());
    setHasSearched(true);
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (!generatedName || !certRef.current) return;
    await downloadCertificatePdf(certRef.current, generatedName, setIsDownloadingPdf);
  };

  const handlePrintCertificate = async () => {
    if (!generatedName || !certRef.current) return;
    await printCertificate(certRef.current, generatedName, setIsDownloadingPdf);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="liquid-glass p-6 sm:p-8 mb-8 text-center relative overflow-hidden bg-gradient-to-r from-orange-100/60 via-amber-50/80 to-yellow-100/60 border border-orange-200">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/90 text-orange-700 shadow-2xs border border-orange-200 mb-2">
          <Award className="w-3.5 h-3.5 text-amber-500" />
          ศูนย์บริการประชาสัมพันธ์และเกียรติบัตรออนไลน์
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
          ข่าวสาร ภาพกิจกรรม และดาวน์โหลดเกียรติบัตร
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto mt-1.5">
          ค้นหาเกียรติบัตรอิเล็กทรอนิกส์พร้อมรับรองโดยผู้อำนวยการ สพป.สุโขทัย เขต 2 และติดตามภาพกิจกรรม
        </p>
      </div>

      {/* SECTION 1: CERTIFICATE GENERATOR & SEARCH */}
      <div className="liquid-glass p-5 sm:p-8 mb-10 border border-orange-200/90 shadow-xl">
        <div className="flex items-center gap-3 pb-4 border-b border-orange-100 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-800">
              ระบบตรวจสอบและพิมพ์เกียรติบัตรออนไลน์ (E-Certificate A4)
            </h2>
            <p className="text-xs text-slate-500">
              พิมพ์ชื่อ-นามสกุลของท่านเพื่อสร้างและพิมพ์เกียรติบัตรฉบับจริง
            </p>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearchCertificate} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              พิมพ์ชื่อ-นามสกุล (พร้อมคำนำหน้า) *
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                required
                placeholder="เช่น นายรักเรียน มุ่งมั่นวิชา"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-orange-200 text-xs focus:ring-2 focus:ring-orange-400 focus:outline-none font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ชื่อโรงเรียน (ถ้ามี)
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="เช่น โรงเรียนบ้านสวรรคโลก"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-orange-200 text-xs focus:ring-2 focus:ring-orange-400 focus:outline-none font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              เลือกหลักสูตรที่ผ่านการอบรม
            </label>
            {courses.length > 0 ? (
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-orange-200 text-xs focus:ring-2 focus:ring-orange-400 focus:outline-none font-medium truncate"
              >
                {courses.map(c => (
                  <option key={c.id || c.title} value={c.title}>
                    {c.title}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-orange-200 text-xs focus:ring-2 focus:ring-orange-400 focus:outline-none font-medium truncate"
              />
            )}
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full btn-gamified-primary py-2 px-4 text-xs font-bold shadow-md flex items-center justify-center gap-1.5 cursor-pointer h-[38px]"
            >
              <Sparkles className="w-4 h-4" />
              <span>ค้นหาและสร้างเกียรติบัตร</span>
            </button>
          </div>
        </form>

        {/* LIVE A4 LANDSCAPE CERTIFICATE PREVIEW */}
        {hasSearched && generatedName && (
          <div className="space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                พบข้อมูลเกียรติบัตร: {generatedName}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="btn-gamified-primary py-2 px-4 text-xs font-bold shadow-md inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDownloadingPdf ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>กำลังสร้างไฟล์ PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>พิมพ์ / บันทึกไฟล์ PDF (A4 แนวนอน)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrintCertificate}
                  disabled={isDownloadingPdf}
                  className="btn-gamified-secondary py-2 px-3 text-xs font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="สั่งพิมพ์ผ่านเครื่องพิมพ์ (Print)"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>พิมพ์</span>
                </button>
              </div>
            </div>

            {/* A4 Landscape Document Frame */}
            <div className="overflow-x-auto p-2 bg-slate-100/90 rounded-2xl border border-slate-200 flex justify-center">
              <div 
                ref={certRef}
                className="certificate-print-area w-[840px] h-[594px] min-w-[840px] min-h-[594px] max-w-[840px] max-h-[594px] shrink-0 px-10 pt-2 pb-2 relative flex flex-col justify-between text-center shadow-2xl border-[10px] border-[#9a3412] rounded-lg select-none bg-cover bg-center overflow-hidden box-border"
                style={{
                  backgroundColor: '#ffffff',
                  backgroundImage: customCertBg ? `url(${customCertBg})` : `radial-gradient(circle at 50% 50%, rgba(254, 243, 199, 0.4) 0%, #ffffff 80%)`
                }}
              >
                {/* Decorative Inner Golden Double Border */}
                <div className="absolute inset-2 border-2 border-amber-600/80 rounded pointer-events-none" />
                <div className="absolute inset-3 border border-amber-400/50 rounded pointer-events-none" />

                {/* Top & Middle Unified Flow */}
                <div className="relative z-10 flex flex-col items-center">
                  <img 
                    src="/assets/aistudio/LOGO_E-SPORT__18__733b26a9.png" 
                    alt="Logo Sukhothai 2" 
                    className="w-16 h-16 object-contain drop-shadow-sm cert-logo-img"
                    style={{ marginTop: '1.55cm', marginBottom: '0cm' }}
                  />
                  <h3 className="font-sarabun cert-header-org text-[31.2px] font-black text-slate-950 leading-[1.04]">
                    สำนักงานเขตพื้นที่การศึกษาประถมศึกษาสุโขทัย เขต 2
                  </h3>
                  <p className="font-sarabun cert-header-award text-[19.5px] font-bold text-slate-900 mt-1 mb-0 leading-[1.06]">
                    ขอมอบเกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า
                  </p>

                  {/* ชื่อ-สกุล: ขยายใหญ่ขึ้นอีก 15% (49.5px) และอยู่กึ่งกลางระหว่างบรรทัดบนกับโรงเรียน */}
                  <div className="text-[49.5px] font-black text-[#0a2540] font-sarabun tracking-tight leading-[1.02] my-2 cert-recipient-name">
                    {generatedName}
                  </div>
                  {schoolName && (
                    <div className="text-[21.5px] font-bold text-[#162f56] font-sarabun mt-0 mb-1 leading-[1.06] cert-recipient-school">
                      {schoolName}
                    </div>
                  )}

                  <div className="space-y-0.5 py-0">
                    <p className="text-[20.4px] font-semibold text-slate-900 max-w-[790px] mx-auto leading-[1.05] font-sarabun cert-course-desc cert-text-thai px-1">
                      ได้ผ่านการอบรมเชิงปฏิบัติการตามโครงการพัฒนาทักษะทางด้านเทคโนโลยีดิจิทัลและปัญญาประดิษฐ์ AI เพื่อการศึกษา
                    </p>
                    <p className="text-[23.4px] font-bold text-[#0a2540] max-w-[790px] mx-auto px-1 leading-[1.05] font-sarabun cert-course-title">
                      "{selectedCourse}"
                    </p>
                    <p className="text-[20.4px] font-semibold text-slate-800 font-sarabun leading-[1.05] cert-date-text">
                      ให้ไว้ ณ วันที่ {certDate}
                    </p>
                  </div>
                </div>

                {/* ONLY ONE SIGNATORY (นายเดชา ลุนาวงค์ ผอ.เขต) */}
                <div className="relative z-10 flex flex-col items-center justify-center cert-signatory-container" style={{ marginBottom: '0.35cm' }}>
                  <p className="text-[19.5px] font-black text-slate-950 font-sarabun leading-[1.06] cert-signatory-name">
                    ({directorName})
                  </p>
                  <p className="text-[17px] font-semibold text-slate-800 font-sarabun leading-[1.06] cert-signatory-pos">
                    {directorPos}
                  </p>
                </div>

                {/* Certificate Identification Serial (เลขอารบิกทั้งหมด ขยาย +20%) */}
                <div className="relative z-10 flex items-center justify-between text-[13.5px] text-slate-700 pt-0.5 border-t border-amber-200/50 font-sarabun cert-footer-info font-bold leading-none">
                  <span>เลขที่เกียรติบัตร: {toArabicNumerals(certPrefix)}-{Math.abs(generatedName.split('').reduce((a, b) => a + b.charCodeAt(0), 1000))}</span>
                  <span>ระบบรับรองเกียรติบัตรอิเล็กทรอนิกส์ สพป.สุโขทัย เขต 2</span>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: PR NEWS FEED */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-xs">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-800">
              ข่าวสารและภาพกิจกรรมการอบรม
            </h2>
            <p className="text-xs text-slate-500">
              ภาพบรรยากาศการจัดอบรมและดาวน์โหลดรูปภาพจาก Google Drive
            </p>
          </div>
        </div>

        {news.length === 0 ? (
          <div className="liquid-glass p-8 text-center text-xs text-slate-500">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">ยังไม่มีข่าวประชาสัมพันธ์ในขณะนี้</p>
            <p className="text-[11px] mt-0.5">ผู้ดูแลระบบสามารถเพิ่มข่าวสารและอัลบั้ม Google Drive ได้จากหน้าแดชบอร์ด</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {news.map((item) => (
              <div 
                key={item.id}
                className="liquid-glass p-4 overflow-hidden flex flex-col justify-between group hover:border-orange-300 transition-all"
              >
                <div>
                  {item.imageUrl && (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-3">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <h3 className="font-extrabold text-slate-800 text-sm mb-1.5 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-3 mb-3">
                    {item.content}
                  </p>
                </div>

                <div className="pt-2 border-t border-orange-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">{item.publishedDate}</span>
                  {item.driveUrl && (
                    <a
                      href={item.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition"
                    >
                      <FolderDown className="w-3.5 h-3.5" />
                      <span>อัลบั้มภาพ</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
