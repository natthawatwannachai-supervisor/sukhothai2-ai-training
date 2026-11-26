import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Survey } from '../../../types';
import { db } from '../../../lib/firebase';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { 
  FileCheck2, 
  BarChart3, 
  Printer, 
  Download,
  Calendar, 
  Heart, 
  MessageSquare, 
  TrendingUp, 
  Trash2,
  Eye,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { ConfirmModal } from '../../common/ConfirmModal';
import { downloadSurveyReportPdf, printSurveyReport } from '../../../utils/pdfExport';

export const SurveyDashboardTab: React.FC = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [filterDate, setFilterDate] = useState('all');
  const [showInfographicModal, setShowInfographicModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState<Survey | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const reportSheetRef = useRef<HTMLDivElement>(null);
  const hiddenReportSheetRef = useRef<HTMLDivElement>(null);

  // Sync surveys from Firestore
  useEffect(() => {
    try {
      const q = collection(db, 'surveys');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: Survey[] = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          } as Survey));
          setSurveys(list);
          setLoading(false);
        },
        () => {
          setSurveys([]);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch {
      setSurveys([]);
      setLoading(false);
    }
  }, []);

  // 10 Content-focused Questions
  const questionsMeta = [
    { key: 'q1', name: 'ข้อ 1: ความทันสมัยเนื้อหา AI' },
    { key: 'q2', name: 'ข้อ 2: ลำดับขั้นตอนเข้าใจง่าย' },
    { key: 'q3', name: 'ข้อ 3: การถ่ายทอดของวิทยากร' },
    { key: 'q4', name: 'ข้อ 4: การฝึกปฏิบัติการจริง' },
    { key: 'q5', name: 'ข้อ 5: การประยุกต์ใช้ในวิชาสอน' },
    { key: 'q6', name: 'ข้อ 6: เสริมสร้างสื่อและ Active Learning' },
    { key: 'q7', name: 'ข้อ 7: ลดเวลาและเพิ่มประสิทธิภาพสอน' },
    { key: 'q8', name: 'ข้อ 8: จริยธรรมการใช้ AI' },
    { key: 'q9', name: 'ข้อ 9: ประโยชน์ต่อวิชาชีพครู' },
    { key: 'q10', name: 'ข้อ 10: ภาพรวมคุณภาพเนื้อหา' },
  ];

  // Filtered surveys by selected date
  const filteredFeedback = useMemo(() => {
    if (filterDate === 'all') return surveys;
    return surveys.filter(s => s.trainingDate === filterDate);
  }, [surveys, filterDate]);

  // Compute Likert Averages (always returns all 10 items even if 0 surveys so report is complete)
  const questionAverages = useMemo(() => {
    const sourceList = filteredFeedback;
    if (sourceList.length === 0) {
      return questionsMeta.map(q => ({
        question: q.name,
        คะแนนเฉลี่ย: 0
      }));
    }

    return questionsMeta.map(q => {
      const total = sourceList.reduce((acc, curr) => acc + (Number((curr as any)[q.key]) || 5), 0);
      const avg = Number((total / sourceList.length).toFixed(2));
      return {
        question: q.name,
        คะแนนเฉลี่ย: avg
      };
    });
  }, [filteredFeedback]);

  // Overall Average Score
  const overallAvg = useMemo(() => {
    if (filteredFeedback.length === 0 || questionAverages.length === 0) return '0.00';
    const sum = questionAverages.reduce((acc, curr) => acc + curr.คะแนนเฉลี่ย, 0);
    return (sum / questionAverages.length).toFixed(2);
  }, [filteredFeedback, questionAverages]);

  // Distinct training dates
  const uniqueDates = useMemo(() => {
    const set = new Set<string>();
    surveys.forEach(s => {
      if (s.trainingDate) set.add(s.trainingDate);
    });
    return Array.from(set);
  }, [surveys]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleDownloadPdf = async () => {
    const targetEl = reportSheetRef.current || hiddenReportSheetRef.current;
    if (!targetEl) return;

    const dateSuffix = filterDate === 'all' ? 'ทั้งหมด' : filterDate.replace(/\s+/g, '_');
    const ok = await downloadSurveyReportPdf(
      targetEl,
      `รายงานสรุปผลแบบสอบถาม_${dateSuffix}_สพป_สุโขทัย_เขต2`,
      setIsExportingPdf
    );
    if (ok) {
      showToast('ดาวน์โหลดไฟล์ PDF รายงานสรุปผลแบบสอบถามเรียบร้อยแล้ว');
    }
  };

  const handlePrintPdf = async () => {
    const targetEl = reportSheetRef.current || hiddenReportSheetRef.current;
    if (!targetEl) return;

    const dateSuffix = filterDate === 'all' ? 'ทั้งหมด' : filterDate.replace(/\s+/g, '_');
    await printSurveyReport(
      targetEl,
      `รายงานสรุปผลแบบสอบถาม_${dateSuffix}_สพป_สุโขทัย_เขต2`,
      setIsExportingPdf
    );
  };

  const handleConfirmDeleteSurvey = async () => {
    if (!surveyToDelete?.id) return;
    const targetId = surveyToDelete.id;
    setSurveyToDelete(null);
    setSurveys(prev => prev.filter(s => s.id !== targetId));

    try {
      await deleteDoc(doc(db, 'surveys', targetId));
      showToast('ลบรายการแบบสอบถามเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Error deleting survey:', err);
      showToast('เกิดข้อผิดพลาดในการลบแบบสอบถาม');
    }
  };

  const handleConfirmClearAll = async () => {
    setIsClearingAll(false);
    const oldList = [...surveys];
    setSurveys([]);

    try {
      await Promise.all(oldList.map(s => s.id ? deleteDoc(doc(db, 'surveys', s.id)) : Promise.resolve()));
      showToast('ล้างข้อมูลแบบสอบถามทั้งหมดเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Error clearing surveys:', err);
      showToast('เกิดข้อผิดพลาดในการล้างข้อมูล');
    }
  };

  // Reusable Infographic Report Content (rendered both in offscreen container for 1-click PDF download and in preview modal)
  const renderInfographicSheet = (refProp: React.RefObject<HTMLDivElement | null>) => (
    <div
      ref={refProp}
      style={{
        width: '760px',
        backgroundColor: '#fffbeb',
        border: '2px solid #fed7aa',
        borderRadius: '16px',
        padding: '28px 32px',
        color: '#1e293b',
        fontFamily: "'Prompt', 'Sarabun', sans-serif",
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: 'center',
          borderBottom: '2px solid #fdba74',
          paddingBottom: '16px',
          marginBottom: '18px',
        }}
      >
        <img
          src="/assets/aistudio/LOGO_E-SPORT__18__733b26a9.png"
          alt="สพป.สุโขทัย เขต 2"
          style={{ width: '60px', height: '60px', objectFit: 'contain', margin: '0 auto 8px auto', display: 'block' }}
        />
        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#431407', margin: '0 0 4px 0' }}>
          รายงานผลการประเมินความพึงพอใจด้านเนื้อหาการอบรม AI เพื่อการศึกษา
        </h1>
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#9a3412', margin: 0 }}>
          กลุ่มนิเทศ ติดตาม และประเมินผลการจัดการศึกษา สำนักงานเขตพื้นที่การศึกษาประถมศึกษาสุโขทัย เขต 2
        </p>
        <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
          รอบการอบรม: {filterDate === 'all' ? 'รวมทุกรอบการอบรม' : filterDate} • ข้อมูล ณ วันที่ {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '18px', textAlign: 'center' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #fed7aa', borderRadius: '12px', padding: '12px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>คะแนนความพึงพอใจเฉลี่ยรวม</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#ea580c', margin: '2px 0' }}>{overallAvg} / 5.00</div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#059669' }}>
            {Number(overallAvg) >= 4.51
              ? 'ระดับความพึงพอใจ: มากที่สุด'
              : Number(overallAvg) >= 3.51
              ? 'ระดับความพึงพอใจ: มาก'
              : Number(overallAvg) > 0
              ? 'ระดับความพึงพอใจ: ปานกลาง'
              : 'ยังไม่มีข้อมูลการประเมิน'}
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #fed7aa', borderRadius: '12px', padding: '12px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>จำนวนผู้ตอบแบบสอบถาม</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#b45309', margin: '2px 0' }}>{filteredFeedback.length} ท่าน</div>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>ผู้บริหาร ครู และบุคลากรทางการศึกษา</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #fed7aa', borderRadius: '12px', padding: '12px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>ข้อคิดเห็นและข้อเสนอแนะ</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#c2410c', margin: '2px 0' }}>
            {filteredFeedback.filter(s => s.impression || s.suggestion).length} รายการ
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>เพื่อพัฒนาคุณภาพหลักสูตรอบรม</div>
        </div>
      </div>

      {/* All 10 Likert Questions Breakdown Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b' }}>
            ตารางสรุปผลการประเมินความพึงพอใจด้านเนื้อหาการอบรมทั้ง 10 ข้อ (คะแนนเต็ม 5.00)
          </span>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#c2410c' }}>
            เกณฑ์ 4.51 - 5.00 = มากที่สุด
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {questionAverages.map((q, idx) => {
            const pct = Math.min(100, Math.max(0, (q.คะแนนเฉลี่ย / 5) * 100));
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px' }}>
                <div style={{ width: '240px', fontWeight: 600, color: '#334155', flexShrink: 0 }}>
                  {q.question}
                </div>
                <div style={{ flex: 1, height: '10px', backgroundColor: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      backgroundColor: '#f59e0b',
                      borderRadius: '999px',
                    }}
                  />
                </div>
                <div style={{ width: '75px', textAlign: 'right', fontWeight: 800, color: '#ea580c', flexShrink: 0 }}>
                  {q.คะแนนเฉลี่ย.toFixed(2)} / 5.00
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Feedback Highlights (Up to 4 items to fit A4 cleanly) */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
          ตัวอย่างความประทับใจและข้อเสนอแนะจากผู้เข้ารับการอบรม
        </div>
        {filteredFeedback.filter(s => s.impression || s.suggestion).length === 0 ? (
          <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
            - ยังไม่มีข้อความข้อเสนอแนะเพิ่มเติมในรอบนี้ -
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {filteredFeedback
              .filter(s => s.impression || s.suggestion)
              .slice(0, 4)
              .map((s, i) => (
                <div
                  key={s.id || i}
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '10.5px',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#c2410c', marginBottom: '2px' }}>
                    อ.{s.district} ({s.gender}) • {s.trainingDate}
                  </div>
                  {s.impression && (
                    <div style={{ color: '#334155' }}>
                      <strong>ประทับใจ:</strong> "{s.impression}"
                    </div>
                  )}
                  {s.suggestion && (
                    <div style={{ color: '#475569', marginTop: '2px' }}>
                      <strong>ข้อเสนอแนะ:</strong> "{s.suggestion}"
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Footer Signature Line */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10px',
          color: '#64748b',
          paddingTop: '8px',
          borderTop: '1px solid #fed7aa',
        }}
      >
        <span>ออกรายงานโดย: ระบบสารสนเทศการอบรม AI เพื่อการศึกษา สพป.สุโขทัย เขต 2</span>
        <span style={{ fontWeight: 700, color: '#9a3412' }}>
          รับรองข้อมูลโดย: นายเดชา ลุนาวงค์ ผู้อำนวยการ สพป.สุโขทัย เขต 2
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Offscreen A4 Report Sheet so direct 1-click PDF download always works immediately */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none opacity-0 overflow-hidden" aria-hidden="true">
        {renderInfographicSheet(hiddenReportSheetRef)}
      </div>
      
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 font-bold flex items-center gap-2 shadow-xs animate-fadeIn">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner & Export Buttons (Always accessible) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-orange-100 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-orange-600" />
            <span>แดชบอร์ดสรุปผลแบบสอบถามความพึงพอใจ (ด้านเนื้อหาการอบรม)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            สถิติคะแนนความพึงพอใจ 10 ด้าน Likert Scale และข้อคิดเห็นข้อเสนอแนะของผู้เข้าอบรม
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {surveys.length > 0 && (
            <button
              onClick={() => setIsClearingAll(true)}
              className="px-3.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ล้างข้อมูลทั้งหมด</span>
            </button>
          )}

          <button
            onClick={() => setShowInfographicModal(true)}
            className="px-3.5 py-2 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl border border-orange-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>ดูตัวอย่างรายงาน A4</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="btn-gamified-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-60"
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isExportingPdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลดไฟล์ PDF'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md">
          <span className="text-xs opacity-90 font-medium">คะแนนความพึงพอใจเฉลี่ยรวม</span>
          <div className="text-3xl font-black mt-1 flex items-baseline gap-1">
            <span>{overallAvg}</span>
            <span className="text-sm font-normal opacity-80">/ 5.00</span>
          </div>
          <div className="text-[11px] opacity-95 mt-1 font-bold">
            {Number(overallAvg) >= 4.51 ? 'ระดับ: มากที่สุด (ระดับยอดเยี่ยม)' : Number(overallAvg) >= 3.51 ? 'ระดับ: มาก' : Number(overallAvg) > 0 ? 'ระดับ: ปานกลาง' : 'รอข้อมูลประเมิน'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">จำนวนผู้ตอบแบบสอบถาม</span>
          <div className="text-3xl font-black text-slate-800 mt-1">
            {filteredFeedback.length} ชุด
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>ข้อมูล Real-time จากฐานข้อมูล</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">ข้อคิดเห็นและข้อเสนอแนะ</span>
          <div className="text-3xl font-black text-orange-600 mt-1">
            {filteredFeedback.filter(s => s.impression || s.suggestion).length} รายการ
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            รวบรวมเพื่อการพัฒนาเนื้อหาหลักสูตร
          </div>
        </div>
      </div>

      {surveys.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
          <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700">ยังไม่มีผู้ตอบแบบสอบถามในระบบ</p>
          <p className="text-[11px] text-slate-400 mt-0.5">เมื่อมีผู้ทำแบบประเมินผ่านหน้าเว็บ คะแนนและกราฟวิเคราะห์จะแสดงผลที่นี่ทันที (สามารถกดปุ่มดาวน์โหลดไฟล์ PDF ด้านบนเพื่อดูแบบฟอร์มรายงานได้)</p>
        </div>
      ) : (
        <>
          {/* LIKERT 10-QUESTION BAR CHART */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-orange-600" />
                <span>ผลการประเมินความพึงพอใจด้านเนื้อหารายข้อ (คะแนนเต็ม 5.00)</span>
              </h3>
              <span className="text-xs font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                เกณฑ์ 4.51 - 5.00 = มากที่สุด
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={questionAverages} margin={{ top: 10, right: 10, left: -20, bottom: 45 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                  <XAxis dataKey="question" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="คะแนนเฉลี่ย" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* OPEN-ENDED QUALITATIVE FEEDBACK */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-orange-500" />
                <span>ความคิดเห็น ข้อเสนอแนะ และความประทับใจในเนื้อหา</span>
              </h3>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">รอบวันที่:</span>
                <select
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none font-bold"
                >
                  <option value="all">ทุกรอบวันที่ ({surveys.length})</option>
                  {uniqueDates.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFeedback.map((s, idx) => (
                <div key={s.id || idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-slate-200">
                    <span className="font-bold text-orange-700">
                      อ.{s.district} ({s.gender}, {s.ageRange})
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {s.trainingDate}
                      </span>
                      <button
                        onClick={() => setSurveyToDelete(s)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="ลบแบบประเมินนี้"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {s.impression && (
                    <div className="text-xs">
                      <span className="font-bold text-amber-800 block mb-0.5 flex items-center gap-1">
                        <Heart className="w-3 h-3 text-orange-500 inline fill-orange-500" />
                        สิ่งที่ประทับใจในเนื้อหา:
                      </span>
                      <p className="text-slate-700 italic bg-white p-2.5 rounded-lg border border-orange-100">
                        "{s.impression}"
                      </p>
                    </div>
                  )}

                  {s.suggestion && (
                    <div className="text-xs">
                      <span className="font-bold text-orange-800 block mb-0.5">
                        ข้อเสนอแนะพัฒนาเนื้อหา:
                      </span>
                      <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-amber-100">
                        "{s.suggestion}"
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* EXPORT INFOGRAPHIC PDF REPORT MODAL */}
      {showInfographicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-4xl w-full shadow-2xl border-4 border-orange-100 my-8 max-h-[92vh] flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 mb-4">
              <div>
                <span className="font-extrabold text-slate-800 text-sm sm:text-base block">
                  รายงาน Infographic ผลการประเมินความพึงพอใจการอบรม (ขนาด A4)
                </span>
                <span className="text-xs text-slate-500">
                  สามารถกดดาวน์โหลดเป็นไฟล์ PDF ลงเครื่อง หรือสั่งพิมพ์ออกเครื่องพิมพ์ได้ทันที
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="btn-gamified-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-60"
                >
                  {isExportingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>{isExportingPdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลดไฟล์ PDF'}</span>
                </button>
                <button
                  onClick={handlePrintPdf}
                  disabled={isExportingPdf}
                  className="px-4 py-2 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-xl border border-amber-300 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์รายงาน</span>
                </button>
                <button
                  onClick={() => setShowInfographicModal(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>

            {/* Scrollable Preview Container */}
            <div className="flex-1 overflow-auto bg-slate-100 p-4 rounded-2xl flex justify-center">
              {renderInfographicSheet(reportSheetRef)}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Single Survey Deletion */}
      <ConfirmModal
        isOpen={!!surveyToDelete}
        title="ยืนยันการลบแบบสอบถาม"
        message={`ต้องการลบผลแบบสอบถามของ อ.${surveyToDelete?.district || ''} (${surveyToDelete?.gender || ''}, ${surveyToDelete?.trainingDate || ''}) ใช่หรือไม่?`}
        confirmText="ยืนยันลบแบบสอบถาม"
        cancelText="ยกเลิก"
        isDanger={true}
        onConfirm={handleConfirmDeleteSurvey}
        onCancel={() => setSurveyToDelete(null)}
      />

      {/* Confirmation Modal for Clearing All Surveys */}
      <ConfirmModal
        isOpen={isClearingAll}
        title="ยืนยันการล้างข้อมูลแบบสอบถามทั้งหมด"
        message={`ต้องการลบข้อมูลแบบสอบถามทั้งหมดจำนวน ${surveys.length} ชุด หรือไม่? ข้อมูลการประเมินทั้งหมดจะถูกล้างออกจากฐานข้อมูล`}
        confirmText="ยืนยันล้างทั้งหมด"
        cancelText="ยกเลิก"
        isDanger={true}
        onConfirm={handleConfirmClearAll}
        onCancel={() => setIsClearingAll(false)}
      />

    </div>
  );
};
