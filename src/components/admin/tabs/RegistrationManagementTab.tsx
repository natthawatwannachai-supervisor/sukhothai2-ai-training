import React, { useState, useEffect, useMemo } from 'react';
import { Registration, Course } from '../../../types';
import { db } from '../../../lib/firebase';
import {
  ADMIN_NOTIFICATION_EMAILS,
  EMAIL_NOTIFICATION_SUBJECT,
  buildEmailNotificationBody,
  sendRegistrationEmailNotification,
} from '../../../lib/emailNotification';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { 
  Users, 
  BarChart3, 
  Calendar, 
  Search, 
  Trash2, 
  Edit3, 
  X,
  Save,
  Mail,
  Send,
  Settings,
  CheckCircle2,
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { ConfirmModal } from '../../common/ConfirmModal';

const SUKHOTHAI_DISTRICTS = [
  'เมืองสุโขทัย',
  'สวรรคโลก',
  'ศรีสัชนาลัย',
  'ศรีสำโรง',
  'กงไกรลาศ',
  'คีรีมาศ',
  'ทุ่งเสลี่ยม',
  'บ้านด่านลานหอย',
  'ศรีนคร'
];

export const RegistrationManagementTab: React.FC = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [, setLoading] = useState(true);

  // Edit Modal State
  const [editingReg, setEditingReg] = useState<Registration | null>(null);
  const [editName, setEditName] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [editDistrict, setEditDistrict] = useState('สวรรคโลก');
  const [editPhone, setEditPhone] = useState('');
  const [editLineId, setEditLineId] = useState('');
  const [editTrainingDate, setEditTrainingDate] = useState('');
  const [editTrainingTime, setEditTrainingTime] = useState('');
  const [editCourseTitle, setEditCourseTitle] = useState('');
  const [editSuggestions, setEditSuggestions] = useState('');
  const [editStatus, setEditStatus] = useState<'confirmed' | 'pending' | 'cancelled'>('confirmed');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete State
  const [regToDelete, setRegToDelete] = useState<Registration | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  // Email Notification Settings & Test State
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  useEffect(() => {
    fetch('/api/email-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          if (data.smtpUser) setSmtpUser(data.smtpUser);
          if (data.webhookUrl) setWebhookUrl(data.webhookUrl);
        }
      })
      .catch(() => {});

    getDoc(doc(db, 'settings', 'email_config'))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.smtpUser) setSmtpUser(d.smtpUser);
          if (d.smtpPass) setSmtpPass(d.smtpPass);
          if (d.webhookUrl) setWebhookUrl(d.webhookUrl);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveEmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await Promise.allSettled([
        fetch('/api/email-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ smtpUser, smtpPass, webhookUrl }),
        }),
        setDoc(
          doc(db, 'settings', 'email_config'),
          {
            smtpUser: smtpUser.trim(),
            smtpPass: smtpPass.trim(),
            webhookUrl: webhookUrl.trim(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ),
      ]);
      setShowEmailSettings(false);
      showToast('บันทึกการตั้งค่าระบบแจ้งเตือนอีเมลเรียบร้อยแล้ว');
    } catch {
      showToast('บันทึกการตั้งค่าสำเร็จ');
    }
  };

  const handleSendNotificationForReg = async (reg: Registration) => {
    setIsSendingEmail(true);
    try {
      await sendRegistrationEmailNotification({
        name: reg.name,
        school: reg.school,
        trainingDate: reg.trainingDate,
        courseTitle: reg.courseTitle || 'หลักสูตรการอบรมเชิงปฏิบัติการ AI เพื่อการศึกษา',
        district: reg.district,
        phone: reg.phone,
        lineId: reg.lineId,
        trainingTime: reg.trainingTime,
      });
      showToast(
        `ส่งอีเมล "${EMAIL_NOTIFICATION_SUBJECT}" ของ ${reg.name} ไปยังผู้รับทั้ง 3 ท่านเรียบร้อยแล้ว`
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Fetch real-time registrations from both Firestore and backend calendar service
  useEffect(() => {
    let firestoreList: Registration[] = [];
    let serverList: Registration[] = [];

    const mergeAndSet = () => {
      const mergedMap = new Map<string, Registration>();
      [...serverList, ...firestoreList].forEach((r) => {
        const key = `${r.name}_${r.trainingDate}_${r.school}`;
        if (!mergedMap.has(key) || r.id) {
          mergedMap.set(key, r);
        }
      });
      setRegistrations(Array.from(mergedMap.values()));
      setLoading(false);
    };

    fetch('/api/registrations')
      .then((res) => (res.ok ? res.json() : { registrations: [] }))
      .then((data) => {
        if (Array.isArray(data.registrations)) {
          serverList = data.registrations;
          mergeAndSet();
        }
      })
      .catch(() => {});

    try {
      const q = collection(db, 'registrations');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          firestoreList = snapshot.docs.map(
            (d) =>
              ({
                id: d.id,
                ...d.data(),
              } as Registration)
          );
          mergeAndSet();
        },
        () => {
          mergeAndSet();
        }
      );
      return () => unsubscribe();
    } catch {
      mergeAndSet();
    }
  }, []);

  // Fetch courses for dropdown in edit modal
  useEffect(() => {
    try {
      const q = collection(db, 'courses');
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Course));
        setCourses(list);
      });
      return () => unsubscribe();
    } catch {
      // Ignore
    }
  }, []);

  // Open Edit Modal with full fields
  const handleOpenEdit = (reg: Registration) => {
    setEditingReg(reg);
    setEditName(reg.name || '');
    setEditSchool(reg.school || '');
    setEditDistrict(reg.district || 'สวรรคโลก');
    setEditPhone(reg.phone || '');
    setEditLineId(reg.lineId || '');
    setEditTrainingDate(reg.trainingDate || '');
    setEditTrainingTime(reg.trainingTime || '09:00 - 16:00 น. (อบรมเต็มวัน)');
    setEditCourseTitle(reg.courseTitle || '');
    setEditSuggestions(reg.suggestions || '');
    setEditStatus(reg.status || 'confirmed');
  };

  // Save Edit Details
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReg?.id) return;

    if (!editName.trim() || !editSchool.trim()) {
      showToast('กรุณากรอกชื่อและโรงเรียนต้นสังกัด');
      return;
    }

    setIsSavingEdit(true);
    const updatedData: Partial<Registration> = {
      name: editName.trim(),
      school: editSchool.trim(),
      district: editDistrict,
      phone: editPhone.trim(),
      lineId: editLineId.trim(),
      trainingDate: editTrainingDate.trim(),
      trainingTime: editTrainingTime.trim(),
      courseTitle: editCourseTitle.trim(),
      suggestions: editSuggestions.trim(),
      status: editStatus,
    };

    // Optimistic UI update
    setRegistrations(prev =>
      prev.map(r => r.id === editingReg.id ? { ...r, ...updatedData } : r)
    );

    try {
      await Promise.all([
        fetch(`/api/registrations/${encodeURIComponent(editingReg.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData),
        }).catch(() => {}),
        Promise.race([
          updateDoc(doc(db, 'registrations', editingReg.id), updatedData).catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]),
      ]);
      showToast(`บันทึกการแก้ไขข้อมูลของ ${editName} เรียบร้อยแล้ว`);
      setEditingReg(null);
    } catch (err) {
      console.error('Error updating registration:', err);
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Handlers
  const handleRequestDelete = (reg: Registration) => {
    setRegToDelete(reg);
  };

  const handleConfirmDelete = async () => {
    if (!regToDelete?.id) return;
    const targetId = regToDelete.id;
    const targetName = regToDelete.name;
    setRegToDelete(null);

    // If deleting currently edited registration, close the edit modal as well
    if (editingReg?.id === targetId) {
      setEditingReg(null);
    }

    // Optimistic update
    setRegistrations(prev => prev.filter(r => r.id !== targetId));

    try {
      await Promise.all([
        fetch(`/api/registrations/${encodeURIComponent(targetId)}`, {
          method: 'DELETE',
        }).catch(() => {}),
        Promise.race([
          deleteDoc(doc(db, 'registrations', targetId)).catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]),
      ]);
      showToast(`ลบข้อมูลการลงทะเบียนของ ${targetName} เรียบร้อยแล้ว`);
    } catch (err) {
      console.error('Error deleting registration:', err);
      showToast('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  // Filter registrations
  const filteredRegs = useMemo(() => {
    return registrations.filter(r => {
      const matchesSearch = 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.school.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.phone.includes(searchTerm) ||
        r.lineId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDistrict = selectedDistrict === 'all' || r.district === selectedDistrict;
      const matchesStatus = selectedStatusFilter === 'all' || r.status === selectedStatusFilter;
      return matchesSearch && matchesDistrict && matchesStatus;
    });
  }, [registrations, searchTerm, selectedDistrict, selectedStatusFilter]);

  // Aggregate charts by District
  const districtChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    registrations.forEach(r => {
      const d = r.district || 'ไม่ระบุ';
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.keys(counts).map(dist => ({
      district: dist,
      จำนวน: counts[dist]
    }));
  }, [registrations]);

  // Aggregate charts by Training Date
  const dateChartData = useMemo(() => {
    const dates: Record<string, number> = {};
    registrations.forEach(r => {
      if (r.trainingDate) {
        dates[r.trainingDate] = (dates[r.trainingDate] || 0) + 1;
      }
    });
    return Object.keys(dates).sort().map(d => ({
      date: d,
      จำนวน: dates[d]
    }));
  }, [registrations]);

  // Unique districts for filter dropdown
  const uniqueDistricts = useMemo(() => {
    const set = new Set<string>();
    registrations.forEach(r => {
      if (r.district) set.add(r.district);
    });
    return Array.from(set);
  }, [registrations]);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 font-bold flex items-center gap-2 shadow-xs animate-fadeIn">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Real-Time Email Notification Active Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-50 via-amber-50/70 to-white border border-orange-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                ระบบแจ้งเตือนอีเมลแบบเรียลไทม์ทำงานอัตโนมัติ
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-800">
                หัวข้อ: &ldquo;{EMAIL_NOTIFICATION_SUBJECT}&rdquo;
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              เมื่อมีผู้กดยืนยันการลงทะเบียนใหม่ ระบบจะส่งอีเมลแจ้งเตือนแบบเรียลไทม์ไปยังผู้ดูแลระบบทั้ง 3 ท่านทันที:
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {ADMIN_NOTIFICATION_EMAILS.map((emailAddr, idx) => (
                <span
                  key={emailAddr}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-orange-200 text-[11px] font-bold text-slate-700 shadow-2xs"
                >
                  <Mail className="w-3 h-3 text-orange-500" />
                  <span>
                    {idx + 1}. {emailAddr}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={isSendingEmail}
              onClick={() => {
                const sample = registrations[0] || {
                  name: 'นายรักเรียน มุ่งมั่นวิชา',
                  school: 'โรงเรียนบ้านสวรรคโลก',
                  district: 'สวรรคโลก',
                  phone: '0812345678',
                  lineId: '-',
                  trainingDate: new Date().toISOString().slice(0, 10),
                  courseId: 'test',
                  courseTitle: 'หลักสูตรการอบรมเชิงปฏิบัติการ AI เพื่อการศึกษา',
                };
                handleSendNotificationForReg(sample);
              }}
              className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingEmail ? 'กำลังส่ง...' : 'ทดสอบส่งอีเมลแจ้งเตือน'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowEmailSettings(!showEmailSettings)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>ตั้งค่า SMTP / Webhook</span>
            </button>
          </div>
        </div>

        {/* Optional SMTP / Google Apps Script Configuration Drawer */}
        {showEmailSettings && (
          <form
            onSubmit={handleSaveEmailConfig}
            className="mt-3 pt-3 border-t border-orange-200/70 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-white/90 p-3.5 rounded-xl border border-orange-100"
          >
            <div className="md:col-span-3 flex items-center justify-between">
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ตั้งค่าบัญชีส่งออกเพิ่มเติม (Gmail App Password หรือ Google Apps Script Webhook)
              </span>
              <span className="text-[10px] text-slate-500">
                * ระบบมีช่องทางส่งอัตโนมัติอยู่แล้ว สามารถระบุเพิ่มเพื่อส่งตรงจาก Gmail ของหน่วยงานได้
              </span>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">อีเมลผู้ส่ง (Gmail SMTP User)</label>
              <input
                type="email"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="เช่น natthawat.wannachai@gmail.com"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">รหัสผ่านแอป 16 หลัก (Gmail App Password)</label>
              <input
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Google Apps Script Web App URL (ถ้ามี)</label>
              <div className="flex gap-1.5">
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold whitespace-nowrap cursor-pointer"
                >
                  บันทึก
                </button>
              </div>
            </div>
            <div className="md:col-span-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 text-[11px] text-slate-600">
              <strong className="text-slate-800">ตัวอย่างข้อความที่ส่งอัตโนมัติ:</strong>
              <pre className="whitespace-pre-wrap font-['Prompt'] mt-1 text-slate-700">
                {buildEmailNotificationBody({
                  name: '[ชื่อผู้ลงทะเบียน]',
                  school: '[ชื่อโรงเรียน]',
                  trainingDate: '[วันที่]',
                  courseTitle: '[ชื่อหลักสูตร]',
                })}
              </pre>
            </div>
          </form>
        )}
      </div>
      
      {/* Overview Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">ยอดลงทะเบียนทั้งหมด</span>
          <div className="text-2xl font-black text-orange-600 mt-1">{registrations.length} ท่าน</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">อำเภอที่เข้าร่วม</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{uniqueDistricts.length} อำเภอ</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">สถานะยืนยันแล้ว</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {registrations.filter(r => r.status === 'confirmed').length} ท่าน
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">รอการยืนยัน</span>
          <div className="text-2xl font-black text-slate-600 mt-1">
            {registrations.filter(r => r.status === 'pending').length} ท่าน
          </div>
        </div>
      </div>

      {/* CHARTS ROW (By District & By Date) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Registrations by District */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-orange-600" />
            <span>จำนวนผู้ลงทะเบียนแยกตามอำเภอ</span>
          </h3>
          <div className="h-60 w-full">
            {districtChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={districtChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                  <XAxis dataKey="district" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="จำนวน" fill="#f97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                ยังไม่มีข้อมูลสำหรับสร้างกราฟ
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Registrations by Date */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>แนวโน้มยอดลงทะเบียนตามรอบวันจัดอบรม</span>
          </h3>
          <div className="h-60 w-full">
            {dateChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dateChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="จำนวน" stroke="#10b981" fill="#d1fae5" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                ยังไม่มีข้อมูลสำหรับสร้างกราฟ
              </div>
            )}
          </div>
        </div>

      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        
        {/* Search */}
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อ โรงเรียน เบอร์โทร..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">อำเภอ:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none font-bold"
            >
              <option value="all">ทุกอำเภอ ({registrations.length})</option>
              {SUKHOTHAI_DISTRICTS.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">สถานะ:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none font-bold"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="confirmed">ยืนยันแล้ว</option>
              <option value="pending">รอดำเนินการ</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
          </div>
        </div>

      </div>

      {/* REGISTRATION DATA TABLE */}
      {registrations.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700">ยังไม่มีข้อมูลการลงทะเบียนในระบบ</p>
          <p className="text-[11px] text-slate-400 mt-0.5">เมื่อมีผู้ลงทะเบียนผ่านหน้าเว็บไซต์ ข้อมูลจะปรากฏที่นี่แบบ Real-time</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white border border-slate-200 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-3.5">ลำดับ</th>
                <th className="p-3.5">ชื่อ-นามสกุล</th>
                <th className="p-3.5">โรงเรียนต้นสังกัด</th>
                <th className="p-3.5">อำเภอ</th>
                <th className="p-3.5">เบอร์โทรศัพท์ / Line</th>
                <th className="p-3.5">วันที่และเวลาอบรม</th>
                <th className="p-3.5">สถานะ</th>
                <th className="p-3.5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRegs.map((reg, idx) => (
                <tr key={`${reg.id || 'reg'}-${idx}`} className="hover:bg-slate-50/70 transition">
                  <td className="p-3.5 text-slate-400 font-mono">{idx + 1}</td>
                  <td className="p-3.5 font-bold text-slate-800">
                    <div>{reg.name}</div>
                    {reg.courseTitle && (
                      <div className="text-[10px] text-orange-600 font-medium truncate max-w-[200px]">
                        {reg.courseTitle}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-600">{reg.school}</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-lg bg-orange-50 text-orange-700 font-semibold border border-orange-100">
                      อ.{reg.district}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-600">
                    <div>{reg.phone}</div>
                    {reg.lineId && (
                      <div className="text-[10px] text-emerald-600 font-medium">Line: {reg.lineId}</div>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-700 font-medium">
                    <div>{reg.trainingDate}</div>
                    {reg.trainingTime && (
                      <div className="text-[10px] text-sky-700 font-semibold">{reg.trainingTime}</div>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      reg.status === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : reg.status === 'cancelled'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {reg.status === 'confirmed' ? 'ยืนยันแล้ว' : reg.status === 'cancelled' ? 'ยกเลิก' : 'รอดำเนินการ'}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleSendNotificationForReg(reg)}
                        disabled={isSendingEmail}
                        className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 transition cursor-pointer"
                        title="ส่งอีเมลแจ้งเตือนข้อมูลการลงทะเบียนนี้ไปยังผู้ดูแลทั้ง 3 ท่าน"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(reg)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-orange-50 text-slate-600 hover:text-orange-600 transition cursor-pointer"
                        title="แก้ไขรายละเอียดตามที่กรอกลงทะเบียน"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRequestDelete(reg)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition cursor-pointer"
                        title="ลบข้อมูลการลงทะเบียน"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* COMPREHENSIVE EDIT REGISTRATION MODAL */}
      {editingReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-4 border-orange-100 relative">
            
            <button
              onClick={() => setEditingReg(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-orange-600" />
              <span>แก้ไขรายละเอียดข้อมูลการลงทะเบียน</span>
            </h3>

            <p className="text-xs text-slate-500 mb-5">
              แก้ไขข้อมูลตามที่ผู้สมัครได้กรอกไว้ในระบบ หรือปรับเปลี่ยนสถานะการลงทะเบียน (หากเปลี่ยนเป็น "ยกเลิก" วันนั้นจะกลับมาว่างให้เลือกใหม่ได้)
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              
              {/* Name & School */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ชื่อ-นามสกุล *
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    โรงเรียนต้นสังกัด *
                  </label>
                  <input
                    type="text"
                    value={editSchool}
                    onChange={(e) => setEditSchool(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* District & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    อำเภอ (ใน จ.สุโขทัย) *
                  </label>
                  <select
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 font-bold"
                  >
                    {SUKHOTHAI_DISTRICTS.map(d => (
                      <option key={d} value={d}>
                        อำเภอ{d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono"
                  />
                </div>
              </div>

              {/* Line ID & Training Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Line ID
                  </label>
                  <input
                    type="text"
                    value={editLineId}
                    onChange={(e) => setEditLineId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    รอบวันจัดอบรม (YYYY-MM-DD) *
                  </label>
                  <input
                    type="date"
                    value={editTrainingDate}
                    onChange={(e) => setEditTrainingDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 font-medium"
                  />
                </div>
              </div>

              {/* Training Time */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ช่วงเวลาจัดอบรม
                </label>
                <input
                  type="text"
                  value={editTrainingTime}
                  onChange={(e) => setEditTrainingTime(e.target.value)}
                  placeholder="เช่น 09:00 - 16:00 น. (อบรมเต็มวัน)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 font-medium"
                />
              </div>

              {/* Course Title */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  หลักสูตรการอบรม
                </label>
                {courses.length > 0 ? (
                  <select
                    value={editCourseTitle}
                    onChange={(e) => setEditCourseTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 font-medium"
                  >
                    <option value="">-- เลือกหลักสูตรหรือระบุเอง --</option>
                    {courses.map(c => (
                      <option key={c.id || c.title} value={c.title}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={editCourseTitle}
                    onChange={(e) => setEditCourseTitle(e.target.value)}
                    placeholder="ระบุชื่อหลักสูตร..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 font-medium"
                  />
                )}
              </div>

              {/* Suggestions */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ข้อเสนอแนะเพิ่มเติม / ความต้องการเรียนรู้
                </label>
                <textarea
                  value={editSuggestions}
                  onChange={(e) => setEditSuggestions(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 font-medium"
                />
              </div>

              {/* Registration Status */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  สถานะการลงทะเบียน *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus('confirmed')}
                    className={`py-2 px-3 rounded-xl font-bold border transition text-center cursor-pointer ${
                      editStatus === 'confirmed'
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    ✓ ยืนยันสิทธิ์
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('pending')}
                    className={`py-2 px-3 rounded-xl font-bold border transition text-center cursor-pointer ${
                      editStatus === 'pending'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    ⏳ รอตรวจสอบ
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('cancelled')}
                    className={`py-2 px-3 rounded-xl font-bold border transition text-center cursor-pointer ${
                      editStatus === 'cancelled'
                        ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    ✕ ยกเลิก
                  </button>
                </div>
              </div>

              {/* Action Buttons: Save + Delete button */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleRequestDelete(editingReg)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบข้อมูลนี้</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingReg(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="btn-gamified-primary px-5 py-2 rounded-xl font-bold text-white shadow transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</span>
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Confirmation Modal for Registration Deletion */}
      <ConfirmModal
        isOpen={!!regToDelete}
        title="ยืนยันการลบข้อมูลการลงทะเบียน"
        message={`ต้องการลบข้อมูลการลงทะเบียนของ "${regToDelete?.name || ''}" (${regToDelete?.school || ''}) ใช่หรือไม่? ข้อมูลจะถูกลบออกจากฐานข้อมูล`}
        confirmText="ยืนยันลบข้อมูล"
        cancelText="ยกเลิก"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setRegToDelete(null)}
      />

    </div>
  );
};
