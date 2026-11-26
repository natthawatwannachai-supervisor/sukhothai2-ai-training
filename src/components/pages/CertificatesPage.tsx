import React, { useState, useEffect, useRef } from 'react';
import { CertificateBatch, CertificateRecipient } from '../../types';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  Award, 
  Search, 
  Printer, 
  Download,
  Sparkles, 
  ShieldCheck, 
  Building2, 
  BookOpen, 
  Calendar,
  CheckCircle,
  FileCheck2,
  Users,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  X
} from 'lucide-react';
import { downloadCertificatePdf, printCertificate } from '../../utils/pdfExport';
import { toArabicNumerals } from '../../utils/thaiNumerals';

interface CertificatesPageProps {
  setActiveTab?: (tab: string) => void;
}

export const CertificatesPage: React.FC<CertificatesPageProps> = ({ setActiveTab }) => {
  const [batches, setBatches] = useState<CertificateBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  
  // Search state
  const [searchName, setSearchName] = useState('');
  const [searchedRecipient, setSearchedRecipient] = useState<CertificateRecipient | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchNotFound, setSearchNotFound] = useState(false);

  // Roster inspection modal
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');

  const certRef = useRef<HTMLDivElement>(null);

  // Sync certificate batches created by Admin from Firestore in real-time
  useEffect(() => {
    try {
      const q = collection(db, 'certificates');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const uniqueMap = new Map<string, CertificateBatch>();
          snapshot.docs.forEach(doc => {
            const raw = doc.data() as CertificateBatch;
            const normalizedRecipients = (raw.recipients || []).map(r => ({
              ...r,
              certNumber: toArabicNumerals(r.certNumber)
            }));
            uniqueMap.set(doc.id, {
              ...raw,
              id: doc.id,
              certPrefix: toArabicNumerals(raw.certPrefix),
              recipients: normalizedRecipients
            });
          });
          const list = Array.from(uniqueMap.values());
          setBatches(list);
          if (list.length > 0 && !selectedBatchId) {
            setSelectedBatchId(list[0].id || '');
          }
          setLoading(false);
        },
        (err) => {
          console.warn('Error reading certificates from Firestore:', err);
          setBatches([]);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch {
      setBatches([]);
      setLoading(false);
    }
  }, []);

  // Currently selected batch
  const currentBatch = batches.find(b => b.id === selectedBatchId) || batches[0] || null;

  // Keep searchedRecipient synced if Admin updates recipient details in real-time
  useEffect(() => {
    if (searchedRecipient && currentBatch?.recipients) {
      const updated = currentBatch.recipients.find(r => r.id === searchedRecipient.id);
      if (updated) {
        setSearchedRecipient(updated);
      }
    }
  }, [currentBatch]);

  // Search certificate by name in the selected batch
  const handleSearchCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBatch || !searchName.trim()) return;

    setHasSearched(true);
    const query = searchName.trim().toLowerCase();

    // Search in currentBatch.recipients
    const found = currentBatch.recipients?.find(r => 
      r.name.toLowerCase().includes(query)
    );

    if (found) {
      setSearchedRecipient(found);
      setSearchNotFound(false);
    } else {
      setSearchedRecipient(null);
      setSearchNotFound(true);
    }
  };

  // Select a recipient directly from the roster modal
  const handleSelectFromRoster = (recipient: CertificateRecipient) => {
    setSearchedRecipient(recipient);
    setSearchName(recipient.name);
    setHasSearched(true);
    setSearchNotFound(false);
    setIsRosterModalOpen(false);
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (!searchedRecipient || !certRef.current) return;
    await downloadCertificatePdf(certRef.current, searchedRecipient.name, setIsDownloadingPdf);
  };

  const handlePrintCertificate = async () => {
    if (!searchedRecipient || !certRef.current) return;
    await printCertificate(certRef.current, searchedRecipient.name, setIsDownloadingPdf);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fadeIn font-['Prompt']">
      
      {/* Header Banner */}
      <div className="liquid-glass p-6 sm:p-8 mb-8 text-center relative overflow-hidden bg-gradient-to-r from-orange-100/70 via-amber-50/80 to-yellow-100/70 border border-orange-200 shadow-md">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-white/95 text-orange-800 shadow-2xs border border-orange-200 mb-2">
          <Award className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
          ระบบดาวน์โหลดเกียรติบัตรอิเล็กทรอนิกส์ (E-Certificate A4)
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
          ตรวจสอบและพิมพ์เกียรติบัตรออนไลน์
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto mt-1.5 leading-relaxed">
          แสดงผลเกียรติบัตรที่ผู้ดูแลระบบได้สร้างและอนุมัติแล้วเท่านั้น สามารถค้นหาตามชื่อ-นามสกุล และตรวจสอบรายชื่อผู้ผ่านการอบรม
        </p>
      </div>

      {loading ? (
        <div className="liquid-glass p-12 text-center text-xs text-slate-500 border border-orange-200">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-bold text-slate-700">กำลังโหลดข้อมูลเกียรติบัตร...</p>
        </div>
      ) : batches.length === 0 ? (
        /* Empty State: Admin has not created any certificates yet */
        <div className="liquid-glass p-12 sm:p-16 text-center border-2 border-orange-200/90 shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
            <Award className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800">
              ยังไม่มีเกียรติบัตรที่เปิดให้ดาวน์โหลดในขณะนี้
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
              หน้านี้จะแสดงผลเกียรติบัตรที่ผู้ดูแลระบบได้สร้างและอนุมัติแล้วเท่านั้น เมื่อแอดมินดำเนินการสร้างเสร็จ ท่านจะสามารถเข้ามาตรวจสอบรายชื่อและดาวน์โหลดเกียรติบัตรได้ทันที
            </p>
          </div>
        </div>
      ) : (
        /* Has Batches: Display Course Selector, Search, Roster Button, and Certificate */
        <div className="space-y-8">
          
          {/* STEP 1: Select Certificate Batch / Course */}
          <div className="liquid-glass p-5 sm:p-6 border border-orange-200 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-orange-100 flex-wrap gap-2">
              <span className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-orange-600" />
                <span>เลือกหลักสูตรและรุ่นที่ท่านเข้ารับการอบรม:</span>
              </span>
              <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-0.5 rounded-full">
                มี {batches.length} ชุดเกียรติบัตร
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {batches.map((batch, idx) => {
                const isSelected = batch.id === (currentBatch?.id);
                return (
                  <button
                    key={`${batch.id || 'batch'}-${idx}`}
                    onClick={() => {
                      setSelectedBatchId(batch.id || '');
                      setSearchedRecipient(null);
                      setHasSearched(false);
                      setSearchNotFound(false);
                      setSearchName('');
                    }}
                    className={`p-4 rounded-2xl text-left transition cursor-pointer border flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white border-orange-600 shadow-md scale-101'
                        : 'bg-white hover:bg-orange-50/60 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {batch.totalCount || batch.recipients?.length || 0} รายชื่อ
                        </span>
                        <span className={`text-[10px] font-mono ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                          {toArabicNumerals(batch.certPrefix)}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-xs sm:text-sm line-clamp-2 leading-snug">
                        {batch.courseTitle}
                      </h4>
                    </div>

                    <div className={`mt-3 pt-2 text-[10px] border-t ${
                      isSelected ? 'border-white/20 text-white/90' : 'border-slate-100 text-slate-500'
                    }`}>
                      <div>{batch.trainingDate}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: Search Box & View Full Roster Button */}
          {currentBatch && (
            <div className="liquid-glass p-5 sm:p-8 border border-orange-200/90 shadow-xl space-y-6">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-orange-100">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <Search className="w-5 h-5 text-orange-600" />
                    <span>ค้นหาเกียรติบัตรของท่าน</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    หลักสูตร: <strong className="text-orange-950 font-bold">{currentBatch.courseTitle}</strong>
                  </p>
                </div>

                {/* Inspect Roster Button */}
                <button
                  onClick={() => {
                    setIsRosterModalOpen(true);
                    setRosterSearch('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Users className="w-4 h-4 text-orange-600" />
                  <span>ตรวจสอบรายชื่อทั้งหมดในรุ่นนี้ ({currentBatch.recipients?.length || 0} ท่าน)</span>
                </button>
              </div>

              {/* Search Form */}
              <form onSubmit={handleSearchCertificate} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    required
                    placeholder="พิมพ์ชื่อ-นามสกุล ของท่าน (เช่น นายรักเรียน หรือ นางสาว...)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-orange-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-orange-400 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
                >
                  <Search className="w-4 h-4" />
                  <span>ค้นหาเกียรติบัตร</span>
                </button>
              </form>

              {/* Not Found Message */}
              {searchNotFound && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1 animate-fadeIn">
                  <div className="font-extrabold flex items-center gap-1.5 text-sm">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>ไม่พบรายชื่อ "{searchName}" ในชุดเกียรติบัตรนี้</span>
                  </div>
                  <p className="text-rose-700 leading-relaxed">
                    ระบบแสดงเฉพาะเกียรติบัตรที่แอดมินสร้างและอนุมัติแล้วเท่านั้น กรุณาตรวจสอบการสะกดชื่อ-นามสกุล หรือกดปุ่ม <strong>"ตรวจสอบรายชื่อทั้งหมดในรุ่นนี้"</strong> ด้านบนเพื่อดูรายชื่อที่ได้รับอนุมัติ
                  </p>
                </div>
              )}

              {/* FOUND CERTIFICATE - A4 LANDSCAPE PRINTABLE CANVAS */}
              {searchedRecipient && (
                <div className="mt-8 border-t border-orange-200/80 pt-6 animate-fadeIn space-y-4">
                  
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        เกียรติบัตรฉบับสมบูรณ์สำหรับ: <strong className="text-orange-950 font-black">{searchedRecipient.name}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={handleDownloadPdf}
                        disabled={isDownloadingPdf}
                        className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isDownloadingPdf ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                        className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white hover:bg-orange-50 text-slate-800 border border-slate-300 shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="สั่งพิมพ์ผ่านเครื่องพิมพ์ (Print)"
                      >
                        <Printer className="w-4 h-4 text-orange-600" />
                        <span>พิมพ์</span>
                      </button>
                    </div>
                  </div>

                  {/* A4 Landscape Printable Certificate (ขนาด A4 แนวนอน 840x594 พอดีกรอบ ไม่ล้นขอบ) */}
                  <div className="overflow-x-auto pb-4 flex justify-center">
                    <div 
                      ref={certRef}
                      id="certificate-print-area"
                      className="certificate-print-area w-[840px] h-[594px] min-w-[840px] min-h-[594px] max-w-[840px] max-h-[594px] shrink-0 bg-white rounded-2xl shadow-2xl border-8 border-amber-300 px-10 pt-2 pb-2 relative flex flex-col justify-between text-center select-none overflow-hidden box-border"
                      style={{
                        backgroundImage: currentBatch.bgImageUrl ? `url(${currentBatch.bgImageUrl})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      {/* Decorative Border Lines */}
                      <div className="absolute inset-2 border-2 border-amber-600/30 rounded-xl pointer-events-none" />
                      <div className="absolute inset-3 border border-orange-400/40 rounded-lg pointer-events-none" />

                      {/* RUNNING CERTIFICATE NUMBER AT TOP-RIGHT CORNER (เลขอารบิกทั้งหมด ขยาย +20%) */}
                      <div className="absolute top-6 right-8 z-20 cert-number-badge">
                        <span className="font-sarabun text-[19px] font-black text-slate-900 bg-white/95 border-2 border-amber-400 px-3.5 py-0.5 rounded-xl shadow-xs leading-none">
                          เลขที่: {toArabicNumerals(searchedRecipient.certNumber)}
                        </span>
                      </div>

                      {/* Top & Center Unified Flow so Recipient Name is strictly centered between Award line and School */}
                      <div className="relative z-10 flex flex-col items-center">
                        <img
                          src={currentBatch.logoUrl || '/assets/aistudio/LOGO_E-SPORT__18__733b26a9.png'}
                          alt="Official District Logo"
                          className="w-16 object-contain drop-shadow-sm cert-logo-img"
                          style={{ height: '66px', marginTop: '50.5827px', marginBottom: '0cm' }}
                        />
                        <h3 className="font-sarabun cert-header-org font-black text-[31.2px] text-slate-950 tracking-normal leading-[1.04]">
                          สำนักงานเขตพื้นที่การศึกษาประถมศึกษาสุโขทัย เขต 2
                        </h3>
                        <p className="font-sarabun cert-header-award text-[19.5px] font-bold text-slate-900 mt-1 mb-0 leading-[1.06]">
                          ขอมอบเกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า
                        </p>

                        {/* ชื่อ-สกุล: ขยายใหญ่ขึ้นอีก 15% (49.5px) และอยู่กึ่งกลางพอดีระหว่าง "ขอมอบเกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า" กับ "โรงเรียน" */}
                        <h2
                          className="font-sarabun cert-recipient-name text-[49.5px] font-black text-[#1909be] tracking-tight leading-[1.02] my-2"
                          style={{ color: '#1909be' }}
                        >
                          {searchedRecipient.name}
                        </h2>

                        <p className="font-sarabun cert-recipient-school text-[21.5px] font-bold text-[#162f56] mt-0 mb-1 leading-[1.06]">
                          {searchedRecipient.school || currentBatch.defaultSchool}
                        </p>

                        <div className="flex flex-col items-center justify-center space-y-0.5">
                          <p className="font-sarabun cert-course-desc cert-text-thai text-[20.4px] font-semibold text-slate-900 max-w-[790px] mx-auto leading-[1.05] text-center px-1">
                            ได้ผ่านการอบรมเชิงปฏิบัติการการพัฒนาทักษะทางด้านเทคโนโลยีดิจิทัล และปัญญาประดิษฐ์ (AI) เพื่อการศึกษา
                          </p>
                          <p className="font-sarabun cert-course-title text-[23.4px] font-bold text-[#0a2540] leading-[1.05]">
                            หลักสูตร{currentBatch.courseTitle}
                          </p>
                          
                          {/* Training Date (supports individual override) */}
                          <p className="font-sarabun cert-date-text text-[20.4px] font-semibold text-slate-900 leading-[1.05]">
                            {searchedRecipient.trainingDate || currentBatch.trainingDate}
                          </p>

                          {/* Issue Date (supports individual override) */}
                          <p className="font-sarabun cert-date-text text-[20.4px] font-semibold text-slate-900 leading-[1.05]">
                            {searchedRecipient.issueDate || currentBatch.issueDate}
                          </p>
                        </div>
                      </div>

                      {/* Bottom: Signatory (เพิ่มขนาดลายเซ็นต์ให้ใหญ่ขึ้นอีก 20% และขยายข้อความ +20% ลดระยะห่างบรรทัด) */}
                      <div
                        className="relative z-10 flex flex-col items-center justify-center cert-signatory-container"
                        style={{ fontStyle: 'normal', lineHeight: '39px', marginBottom: '23.2283px' }}
                      >
                        {currentBatch.signatureUrl ? (
                          <img 
                            src={currentBatch.signatureUrl} 
                            alt="ลายเซ็นต์ผู้ลงนาม" 
                            className="h-[105.6px] max-w-[372px] object-contain -mt-1.5 -mb-4 z-10 pointer-events-none drop-shadow-xs cert-signature-img"
                          />
                        ) : null}
                        <h4
                          className="font-sarabun cert-signatory-name font-black text-[19.5px] text-slate-950 mt-0"
                          style={{ lineHeight: '29.67px', height: '23.6667px' }}
                        >
                          ({currentBatch.directorName})
                        </h4>
                        <p
                          className="font-sarabun cert-signatory-pos text-[17px] font-semibold text-slate-800"
                          style={{ lineHeight: '26.02px', height: '45.0208px' }}
                        >
                          {currentBatch.directorPosition}
                        </p>
                      </div>

                      {/* Certificate Identification Footer (ขยาย +20%) */}
                      <div className="relative z-10 flex items-center justify-between text-[13.5px] text-slate-700 pt-0.5 border-t border-amber-300 font-sarabun cert-footer-info font-bold leading-none">
                        <span>เลขที่: {toArabicNumerals(searchedRecipient.certNumber)}</span>
                        <span>ระบบรับรองเกียรติบัตรอิเล็กทรอนิกส์ สพป.สุโขทัย เขต 2</span>
                      </div>

                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* ROSTER INSPECTION MODAL (Allows attendees to check all approved recipients and numbers) */}
      {isRosterModalOpen && currentBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border-4 border-orange-100 relative">
            
            <button
              onClick={() => setIsRosterModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 pb-3 border-b border-orange-100 mb-4">
              <Award className="w-6 h-6 text-orange-600" />
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">
                  รายชื่อผู้มีสิทธิ์ได้รับเกียรติบัตรทั้งหมด
                </h3>
                <p className="text-xs text-slate-500">
                  หลักสูตร: {currentBatch.courseTitle} ({currentBatch.recipients?.length || 0} ท่าน)
                </p>
              </div>
            </div>

            {/* Modal Search */}
            <div className="mb-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="ค้นหารายชื่อในตาราง..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* List */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">ลำดับ</th>
                    <th className="p-3">เลขที่เกียรติบัตร</th>
                    <th className="p-3">ชื่อ-นามสกุล</th>
                    <th className="p-3 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(currentBatch.recipients || [])
                    .filter(r => r.name.toLowerCase().includes(rosterSearch.toLowerCase()) || toArabicNumerals(r.certNumber).includes(rosterSearch))
                    .map((r, idx) => (
                      <tr key={`${r.id || 'recip'}-${idx}`} className="hover:bg-orange-50/50 transition">
                        <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-orange-700">{toArabicNumerals(r.certNumber)}</td>
                        <td className="p-3 font-bold text-slate-800">
                          <div>{r.name}</div>
                          {r.school && <div className="text-[10px] text-slate-500 font-normal">{r.school}</div>}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleSelectFromRoster(r)}
                            className="px-3 py-1 rounded-lg text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-2xs transition cursor-pointer"
                          >
                            ดูเกียรติบัตร
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setIsRosterModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
