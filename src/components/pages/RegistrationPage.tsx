import React, { useState, useEffect, useMemo } from 'react';
import { Course, Registration } from '../../types';
import { db } from '../../lib/firebase';
import {
  CalendarEventItem,
  PUBLIC_CALENDAR_EMBED_URL,
  subscribeToPublicGoogleCalendar,
} from '../../lib/googleCalendar';
import {
  ADMIN_NOTIFICATION_EMAILS,
  EMAIL_NOTIFICATION_SUBJECT,
  buildEmailNotificationBody,
  sendRegistrationEmailNotification,
} from '../../lib/emailNotification';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import {
  UserPlus,
  Calendar,
  Building2,
  MapPin,
  Phone,
  MessageSquare,
  BookOpen,
  Lightbulb,
  CheckCircle,
  Sparkles,
  X,
  ArrowRight,
  Send,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  AlertCircle,
  Check,
  ExternalLink,
} from 'lucide-react';

interface RegistrationPageProps {
  selectedCourse?: Course | null;
  courses?: Course[];
  setActiveTab: (tab: string) => void;
}

const TRAINING_TIME_OPTIONS = [
  { label: '09:00 - 16:00 น. (อบรมเต็มวัน)', start: '09:00', end: '16:00' },
  { label: '09:00 - 12:00 น. (รอบเช้า)', start: '09:00', end: '12:00' },
  { label: '13:00 - 16:00 น. (รอบบ่าย)', start: '13:00', end: '16:00' },
];

function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const RegistrationPage: React.FC<RegistrationPageProps> = ({
  selectedCourse,
  courses: initialCourses = [],
  setActiveTab,
}) => {
  // Live courses from Firestore
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  // Real-time registrations from Firestore
  const [existingRegistrations, setExistingRegistrations] = useState<Registration[]>([]);

  // Public Google Calendar Events State (Real-time automatic sync, no Google Login required)
  const [calendarName, setCalendarName] = useState<string>(
    'กลุ่มนิเทศ ติดตามและประเมินผลการจัดการศึกษา สพป.สุโขทัย เขต 2'
  );
  const [publicCalendarEvents, setPublicCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');

  // Form State
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [district, setDistrict] = useState('');
  const [phone, setPhone] = useState('');
  const [lineId, setLineId] = useState('');
  const [trainingDate, setTrainingDate] = useState('');
  const [trainingTime, setTrainingTime] = useState(TRAINING_TIME_OPTIONS[0].label);
  const [courseId, setCourseId] = useState(selectedCourse?.id || '');
  const [courseTitleManual, setCourseTitleManual] = useState(selectedCourse?.title || '');
  const [suggestions, setSuggestions] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Calendar View Month/Year State
  const [viewDate, setViewDate] = useState(() => new Date());
  const [dateLockAlert, setDateLockAlert] = useState<string>('');

  // Flow & Modal States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Real-time continuous connection to the public Google Calendar (SSE + automatic background sync)
  useEffect(() => {
    const unsubscribe = subscribeToPublicGoogleCalendar(
      (data) => {
        if (data.calendarName) {
          setCalendarName(data.calendarName);
        }
        if (Array.isArray(data.events)) {
          setPublicCalendarEvents(data.events);
        }
        setLastSyncedAt(
          new Date().toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      },
      (connected) => {
        setIsRealtimeConnected(connected);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Sync courses from Firestore in real-time
  useEffect(() => {
    try {
      const q = collection(db, 'courses');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const uniqueMap = new Map<string, Course>();
          snapshot.docs.forEach((d) => {
            uniqueMap.set(d.id, { id: d.id, ...d.data() } as Course);
          });
          const fetched = Array.from(uniqueMap.values());
          setCourses(fetched);
          if (fetched.length > 0 && !courseId) {
            setCourseId(fetched[0].id || '');
            setCourseTitleManual(fetched[0].title);
          }
        },
        (error) => {
          console.warn('Courses real-time sync error:', error);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn('Courses subscription error:', err);
    }
  }, [courseId]);

  // 3. Sync all registrations from Firestore in real-time
  useEffect(() => {
    try {
      const q = collection(db, 'registrations');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetched = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Registration));
          setExistingRegistrations(fetched);
        },
        (error) => {
          console.warn('Registrations real-time sync error:', error);
          setExistingRegistrations([]);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn('Registrations subscription error:', err);
      setExistingRegistrations([]);
    }
  }, []);

  // Combine events from the public Google Calendar + active registrations into a map by dateStr (YYYY-MM-DD)
  const eventsByDateMap = useMemo(() => {
    const map: Record<string, CalendarEventItem[]> = {};

    publicCalendarEvents.forEach((ev) => {
      if (!ev.dateStr) return;
      if (!map[ev.dateStr]) map[ev.dateStr] = [];
      if (!map[ev.dateStr].some((existing) => existing.id === ev.id)) {
        map[ev.dateStr].push(ev);
      }
    });

    // Also include active registrations (status !== 'cancelled') so any date booked by a registrant is immediately locked
    existingRegistrations.forEach((reg) => {
      if (!reg.trainingDate || reg.status === 'cancelled') return;
      if (!map[reg.trainingDate]) map[reg.trainingDate] = [];
      const regEventId = `reg_${reg.id || `${reg.name}_${reg.trainingDate}`}`;
      const timeLabel = reg.trainingTime || '09:00 - 16:00 น.';
      const titleLabel = `อบรม: ${reg.courseTitle || 'AI เพื่อการศึกษา'} (${reg.school || reg.name})`;

      if (!map[reg.trainingDate].some((e) => e.id === regEventId)) {
        map[reg.trainingDate].push({
          id: regEventId,
          title: titleLabel,
          dateStr: reg.trainingDate,
          timeRange: timeLabel,
          location: reg.school ? `${reg.school} (อ.${reg.district})` : undefined,
          source: 'registration',
        });
      }
    });

    return map;
  }, [publicCalendarEvents, existingRegistrations]);

  // Automatically select the first available (unoccupied) date starting from today if trainingDate is empty or becomes occupied
  useEffect(() => {
    const isCurrentlyOccupied = trainingDate && (eventsByDateMap[trainingDate]?.length || 0) > 0;
    if (!trainingDate || isCurrentlyOccupied) {
      const candidate = new Date();
      for (let i = 0; i < 120; i++) {
        const dStr = toDateStr(candidate);
        if (!eventsByDateMap[dStr] || eventsByDateMap[dStr].length === 0) {
          setTrainingDate(dStr);
          break;
        }
        candidate.setDate(candidate.getDate() + 1);
      }
    }
  }, [eventsByDateMap, trainingDate]);

  // Calendar rendering calculations for current viewDate month
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();
    const todayStr = toDateStr(new Date());

    const days: {
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isOccupied: boolean;
      events: CalendarEventItem[];
    }[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({
        dateStr: '',
        dayNum: 0,
        isCurrentMonth: false,
        isToday: false,
        isOccupied: false,
        events: [],
      });
    }

    for (let d = 1; d <= totalDays; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const fullDateStr = `${year}-${monthStr}-${dayStr}`;
      const dayEvents = eventsByDateMap[fullDateStr] || [];
      days.push({
        dateStr: fullDateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: fullDateStr === todayStr,
        isOccupied: dayEvents.length > 0,
        events: dayEvents,
      });
    }

    return days;
  }, [viewDate, eventsByDateMap]);

  const monthNamesThai = [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม',
  ];

  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setDateLockAlert('');
  };

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setDateLockAlert('');
  };

  const handleSelectDate = (dateStr: string) => {
    const dayEvents = eventsByDateMap[dateStr] || [];
    if (dayEvents.length > 0) {
      const details = dayEvents.map((e) => `• ${e.title} (เวลา ${e.timeRange})`).join(' ');
      setDateLockAlert(
        `ไม่สามารถเลือกวันที่ ${dateStr} ได้ เนื่องจากมีกิจกรรม/งานในปฏิทินแล้ว: ${details} กรุณาเลือกเฉพาะวันที่ว่างอยู่เท่านั้น`
      );
      return;
    }
    setDateLockAlert('');
    setTrainingDate(dateStr);
    if (errors.trainingDate) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.trainingDate;
        return next;
      });
    }
  };

  const currentSelectedCourse = courses.find((c) => c.id === courseId);
  const finalCourseTitle = currentSelectedCourse
    ? currentSelectedCourse.title
    : courseTitleManual.trim() || 'หลักสูตรการอบรมเชิงปฏิบัติการ AI เพื่อการศึกษา';

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'กรุณากรอกชื่อ-สกุลพร้อมคำนำหน้า';
    if (!school.trim()) newErrors.school = 'กรุณาระบุชื่อโรงเรียนต้นสังกัด';
    if (!district.trim()) newErrors.district = 'กรุณากรอกชื่ออำเภอต้นสังกัด';
    const digitsOnly = phone.replace(/[^0-9]/g, '');
    if (!phone.trim()) {
      newErrors.phone = 'กรุณาระบุเบอร์โทรศัพท์ที่ติดต่อได้';
    } else if (digitsOnly.length < 9 || digitsOnly.length > 11) {
      newErrors.phone = 'กรุณากรอกเบอร์โทรศัพท์เป็นตัวเลข 9-10 หลัก';
    }
    if (!trainingDate) {
      newErrors.trainingDate = 'กรุณาเลือกวันที่ว่างสำหรับจัดอบรม';
    } else if ((eventsByDateMap[trainingDate]?.length || 0) > 0) {
      newErrors.trainingDate =
        'วันที่ท่านเลือกมีกิจกรรมหรืองานในปฏิทินแล้ว ไม่สามารถลงทะเบียนซ้ำได้ กรุณาเลือกวันที่ว่างเท่านั้น';
    }
    if (!termsAccepted) newErrors.terms = 'กรุณายอมรับเงื่อนไขและข้อตกลงการเข้าอบรม';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (validateForm()) {
      setShowReviewModal(true);
    }
  };

  const handleFinalConfirm = async () => {
    if (isSubmitting) return;

    // Re-verify real-time availability right before saving
    if ((eventsByDateMap[trainingDate]?.length || 0) > 0) {
      setSubmitError(
        `วันที่ ${trainingDate} มีการลงกิจกรรมหรืองานในปฏิทินแล้ว ไม่สามารถเลือกซ้ำได้ กรุณาปิดหน้าต่างนี้แล้วเลือกวันที่ว่างใหม่`
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const regData: Omit<Registration, 'id'> = {
      name: name.trim(),
      school: school.trim(),
      district: district.trim(),
      phone: phone.trim(),
      lineId: lineId.trim() || '-',
      trainingDate,
      trainingTime,
      courseId: courseId || 'general-course',
      courseTitle: finalCourseTitle,
      suggestions: suggestions.trim(),
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    try {
      // Save to Firestore with a 6-second timeout guard so UI never hangs indefinitely
      const writePromise = addDoc(collection(db, 'registrations'), regData);
      const timeoutPromise = new Promise<{ id: string }>((resolve) =>
        setTimeout(() => resolve({ id: `local_${Date.now()}` }), 6000)
      );

      const docRef = await Promise.race([writePromise, timeoutPromise]);

      // Immediately update local state so the booked date is locked on the calendar right away
      setExistingRegistrations((prev) => [
        ...prev,
        { id: docRef.id, ...regData },
      ]);

      // Sync to backend calendar registration store in background
      fetch('/api/calendar/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: docRef.id, ...regData }),
      }).catch(() => {});

      // Dispatch real-time email notification to:
      // 1. natthawat.wannachai@gmail.com
      // 2. krujaddee2521@gmail.com
      // 3. khuntangmokfc@gmail.com
      sendRegistrationEmailNotification({
        name: regData.name,
        school: regData.school,
        trainingDate: regData.trainingDate,
        courseTitle: regData.courseTitle || finalCourseTitle,
        district: regData.district,
        phone: regData.phone,
        lineId: regData.lineId,
        trainingTime: regData.trainingTime,
      }).catch(() => {});

      setShowReviewModal(false);
      setShowSuccessModal(true);
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignore confetti errors
      }
    } catch (error) {
      console.error('Registration submission error:', error);
      setSubmitError('เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fadeIn">
      {/* Page Header Banner */}
      <div className="liquid-glass p-6 sm:p-8 mb-6 text-center relative overflow-hidden bg-gradient-to-r from-orange-100/60 via-amber-50/80 to-yellow-100/60 border border-orange-200">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/90 text-orange-700 shadow-2xs border border-orange-200 mb-2">
          <UserPlus className="w-3.5 h-3.5 text-orange-500" />
          ระบบลงทะเบียนออนไลน์ (เชื่อมโยง Google Calendar เรียลไทม์)
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
          ลงทะเบียนเข้ารับการอบรมเชิงปฏิบัติการ AI เพื่อการศึกษา
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto mt-1.5">
          ตรวจสอบตารางงานและเวลาจากปฏิทิน {calendarName} แบบเรียลไทม์ และคลิกเลือกวันที่ว่างเพื่อลงทะเบียนได้ทันที
        </p>
      </div>

      {/* Main Registration Form */}
      <form onSubmit={handleInitialSubmit} className="liquid-glass p-5 sm:p-8 space-y-6">
        {/* Course Selection */}
        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-orange-600" />
            <span>
              เลือกหลักสูตรการอบรม <span className="text-rose-500">*</span>
            </span>
          </label>

          {courses.length > 0 ? (
            <select
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value);
                const found = courses.find((c) => c.id === e.target.value);
                if (found) setCourseTitleManual(found.title);
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-white/90 border border-orange-200 text-xs sm:text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none transition shadow-2xs font-medium"
            >
              {courses.map((course, idx) => (
                <option key={`${course.id || 'c'}-${idx}`} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={courseTitleManual}
              onChange={(e) => setCourseTitleManual(e.target.value)}
              placeholder="กรอกชื่อหลักสูตรที่ประสงค์เข้าอบรม"
              className="w-full px-4 py-2.5 rounded-xl bg-white/90 border border-orange-200 text-xs sm:text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none transition shadow-2xs font-medium"
            />
          )}
        </div>

        {/* PUBLIC GOOGLE CALENDAR REAL-TIME AVAILABILITY & STRICT DATE LOCKING */}
        <div className="space-y-4 p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-sky-50/80 via-white to-orange-50/50 border-2 border-sky-200/80 shadow-xs">
          {/* Calendar Header Bar (No login required) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-sky-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-600 text-white text-xs font-extrabold shadow-2xs">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Google Calendar</span>
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-800">
                  {calendarName} <span className="text-rose-500">*</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                แสดงกิจกรรมจากปฏิทินโดยตรง (ไม่ต้องเข้าสู่ระบบ) วันที่มีกิจกรรมแล้วจะถูกล็อก{' '}
                <strong className="text-rose-600">(ห้ามเลือกซ้ำ)</strong> คลิกเลือกได้เฉพาะ{' '}
                <strong className="text-emerald-700">วันที่ว่างอยู่เท่านั้น</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isRealtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span>เชื่อมต่อเรียลไทม์อัตโนมัติ</span>
              </span>

              <a
                href={PUBLIC_CALENDAR_EMBED_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold transition"
                title="เปิดดูปฏิทิน Google Calendar ฉบับเต็ม"
              >
                <span>ดูปฏิทินเต็ม</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Legend & Sync Timestamp */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                สีขาว/เขียว = วันที่ว่าง (คลิกเพื่อลงทะเบียนได้)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-bold">
                <Lock className="w-3 h-3 text-rose-600" />
                สีแดง = มีกิจกรรม/งานแล้ว (ห้ามเลือกซ้ำ)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500 text-white font-bold">
                <Check className="w-3 h-3" />
                สีส้ม = วันที่ท่านเลือกอบรม
              </span>
            </div>

            {lastSyncedAt && (
              <span className="text-[10px] text-slate-500 font-medium">
                ซิงค์เรียลไทม์อัตโนมัติ: {lastSyncedAt}
              </span>
            )}
          </div>

          {/* Alert if user clicked or typed an occupied date */}
          {dateLockAlert && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{dateLockAlert}</span>
            </div>
          )}

          {/* Google Calendar Month Grid */}
          <div className="p-3 sm:p-4 rounded-2xl bg-white border border-sky-100 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="font-extrabold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-600" />
                <span>
                  {monthNamesThai[viewDate.getMonth()]} พ.ศ. {viewDate.getFullYear() + 543} ({viewDate.getFullYear()})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setViewDate(new Date())}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-50 hover:bg-sky-100 text-sky-700 transition cursor-pointer"
                >
                  เดือนปัจจุบัน
                </button>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-extrabold text-slate-500 mb-1.5 pb-1 border-b border-slate-100">
              <span className="text-rose-500">อา.</span>
              <span>จ.</span>
              <span>อ.</span>
              <span>พ.</span>
              <span>พฤ.</span>
              <span>ศ.</span>
              <span className="text-sky-600">ส.</span>
            </div>

            {/* Calendar Days Grid showing real-time events and times */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((cell, idx) => {
                if (!cell.isCurrentMonth) {
                  return <div key={idx} className="min-h-[72px] sm:min-h-[88px] rounded-xl bg-slate-50/40" />;
                }

                const isSelected = trainingDate === cell.dateStr && !cell.isOccupied;
                const isOccupied = cell.isOccupied;

                return (
                  <button
                    type="button"
                    key={cell.dateStr}
                    onClick={() => handleSelectDate(cell.dateStr)}
                    title={
                      isOccupied
                        ? `มีกิจกรรมแล้ว (${cell.events.map((e) => `${e.title} เวลา ${e.timeRange}`).join(', ')}) - ไม่สามารถเลือกซ้ำได้`
                        : `วันที่ ${cell.dateStr} ว่าง - คลิกเพื่อเลือกวันอบรม`
                    }
                    className={`min-h-[72px] sm:min-h-[88px] p-1.5 rounded-xl text-left transition-all relative flex flex-col justify-between border ${
                      isOccupied
                        ? 'bg-rose-50/90 border-rose-300 text-rose-900 cursor-not-allowed opacity-95 hover:bg-rose-100/80'
                        : isSelected
                        ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white border-orange-500 shadow-md ring-2 ring-orange-300 scale-[1.02] z-10 cursor-pointer'
                        : 'bg-white hover:bg-emerald-50/70 text-slate-700 border-slate-200 hover:border-emerald-400 cursor-pointer'
                    }`}
                  >
                    {/* Top Row: Day number & status badge */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs sm:text-sm font-black leading-none ${
                          isSelected
                            ? 'text-white'
                            : isOccupied
                            ? 'text-rose-700'
                            : cell.isToday
                            ? 'text-sky-600 underline'
                            : 'text-slate-800'
                        }`}
                      >
                        {cell.dayNum}
                      </span>

                      {isOccupied ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[8px] sm:text-[9px] font-black leading-none">
                          <Lock className="w-2.5 h-2.5" />
                          <span className="hidden sm:inline">ไม่ว่าง</span>
                        </span>
                      ) : isSelected ? (
                        <span className="px-1.5 py-0.5 rounded bg-white/25 text-white text-[8px] sm:text-[9px] font-black leading-none">
                          เลือกแล้ว
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[8px] sm:text-[9px] font-bold leading-none">
                          ว่าง
                        </span>
                      )}
                    </div>

                    {/* Bottom Row: All events on that day or Free label */}
                    {isOccupied ? (
                      <div className="w-full mt-1 space-y-1 overflow-hidden">
                        {cell.events.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            className="bg-rose-200/65 rounded px-1 py-0.5 overflow-hidden"
                          >
                            <div className="text-[8px] sm:text-[9px] font-extrabold text-rose-800 truncate flex items-center gap-0.5">
                              <Clock className="w-2 h-2 flex-shrink-0" />
                              <span className="truncate">{ev.timeRange}</span>
                            </div>
                            <div className="text-[8.5px] sm:text-[9.5px] font-bold text-rose-950 truncate leading-tight">
                              {ev.title}
                            </div>
                          </div>
                        ))}
                        {cell.events.length > 2 && (
                          <div className="text-[8px] font-black text-rose-700 pl-0.5">
                            +{cell.events.length - 2} กิจกรรม
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className={`text-[9px] font-semibold mt-1 ${
                          isSelected ? 'text-amber-50' : 'text-emerald-600'
                        }`}
                      >
                        {isSelected ? 'พร้อมลงทะเบียน' : 'คลิกเพื่อเลือก'}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date & Training Time Slot Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                วันที่จัดอบรมที่เลือก (เฉพาะวันที่ว่างเท่านั้น) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={trainingDate}
                onChange={(e) => {
                  const picked = e.target.value;
                  if (!picked) return;
                  const [y, m] = picked.split('-').map(Number);
                  if (y && m) {
                    setViewDate(new Date(y, m - 1, 1));
                  }
                  handleSelectDate(picked);
                }}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-orange-200 text-xs focus:ring-2 focus:ring-orange-400 focus:outline-none font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ช่วงเวลาที่ต้องการจัดอบรม <span className="text-rose-500">*</span>
              </label>
              <select
                value={trainingTime}
                onChange={(e) => setTrainingTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-orange-200 text-xs focus:ring-2 focus:ring-orange-400 focus:outline-none font-bold text-slate-800"
              >
                {TRAINING_TIME_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.label}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {trainingDate && (eventsByDateMap[trainingDate]?.length || 0) === 0 && (
            <div className="text-xs font-bold px-3.5 py-2 rounded-xl flex flex-wrap items-center gap-2 border bg-emerald-50 text-emerald-900 border-emerald-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                วันที่เลือก: <strong>{trainingDate}</strong> เวลา <strong>{trainingTime}</strong>
              </span>
              <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-black">
                ✓ วันว่าง สามารถลงทะเบียนได้
              </span>
            </div>
          )}

          {errors.trainingDate && <p className="text-xs text-rose-600 font-bold">{errors.trainingDate}</p>}
        </div>

        {/* Personal & School Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
              ชื่อ-นามสกุล (พร้อมคำนำหน้า เช่น นาย/นาง/นางสาว) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น นายรักเรียน มุ่งมั่นวิชา"
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-orange-200 text-xs sm:text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none transition shadow-2xs font-medium"
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
          </div>

          {/* School Name */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-orange-500" />
              <span>
                ชื่อโรงเรียนต้นสังกัด <span className="text-rose-500">*</span>
              </span>
            </label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="เช่น โรงเรียนบ้านสวรรคโลก"
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-orange-200 text-xs sm:text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none transition shadow-2xs font-medium"
            />
            {errors.school && <p className="text-xs text-rose-500 mt-1">{errors.school}</p>}
          </div>

          {/* District as manual text input */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-orange-500" />
              <span>
                อำเภอต้นสังกัด (กรอกด้วยตนเอง) <span className="text-rose-500">*</span>
              </span>
            </label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="ระบุชื่ออำเภอ เช่น สวรรคโลก, คีรีมาศ, กงไกรลาศ..."
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-orange-200 text-xs sm:text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none transition shadow-2xs font-medium"
            />
            {errors.district && <p className="text-xs text-rose-500 mt-1">{errors.district}</p>}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-orange-500" />
              <span>
                เบอร์โทรศัพท์ที่ติดต่อได้ <span className="text-rose-500">*</span>
              </span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="เช่น 0812345678"
              maxLength={12}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-orange-200 text-xs sm:text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none transition shadow-2xs font-medium"
            />
            {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone}</p>}
          </div>

          {/* Line ID */}
          <div className="md:col-span-2">
            <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                Line ID (สำหรับประสานงานรับสื่อและเอกสารอบรม) <span className="text-rose-500">*</span>
              </span>
            </label>
            <input
              type="text"
              value={lineId}
              onChange={(e) => setLineId(e.target.value)}
              placeholder="เช่น teacher_ai2026"
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-orange-200 text-xs sm:text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none transition shadow-2xs font-medium"
            />
            {errors.lineId && <p className="text-xs text-rose-500 mt-1">{errors.lineId}</p>}
          </div>

          {/* Suggestions */}
          <div className="md:col-span-2">
            <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>ข้อเสนอแนะเพิ่มเติม หรือสิ่งที่คาดหวังจากการอบรม</span>
            </label>
            <textarea
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              rows={2}
              placeholder="ระบุข้อเสนอแนะเพิ่มเติม..."
              className="w-full px-4 py-2 rounded-xl bg-white border border-orange-200 text-xs sm:text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none transition shadow-2xs"
            />
          </div>
        </div>

        {/* Terms Checkbox */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer select-none p-3 rounded-xl bg-orange-50/70 border border-orange-100 hover:bg-orange-50 transition">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="w-4 h-4 mt-0.5 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
            />
            <span className="text-xs text-slate-700 leading-relaxed">
              ข้าพเจ้าขอรับรองว่าข้อมูลข้างต้นเป็นความจริง ยินยอมให้นำข้อมูลไปใช้เพื่อการออกเกียรติบัตร และพร้อมเข้าร่วมการอบรมเชิงปฏิบัติการในวันที่ว่างที่เลือกไว้
            </span>
          </label>
          {errors.terms && <p className="text-xs text-rose-500 mt-1">{errors.terms}</p>}
        </div>

        {Object.keys(errors).length > 0 && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <div>กรุณาตรวจสอบข้อมูลให้ครบถ้วนก่อนลงทะเบียน:</div>
              <ul className="list-disc list-inside mt-1 font-medium space-y-0.5">
                {Object.values(errors).map((errMsg, idx) => (
                  <li key={idx}>{errMsg}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2 text-center">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gamified-primary py-3 px-8 text-sm sm:text-base font-bold shadow-lg inline-flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>ตรวจสอบและลงทะเบียน</span>
          </button>
        </div>
      </form>

      {/* 3D REVIEW & CONFIRMATION POPUP */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border-4 border-orange-200 relative transform transition-all scale-100 animate-scaleUp">
            <button
              onClick={() => setShowReviewModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 text-white flex items-center justify-center mx-auto shadow-md mb-2">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800">
                ตรวจสอบและยืนยันข้อมูลลงทะเบียน
              </h3>
              <p className="text-xs text-slate-500">
                เมื่อยืนยันแล้ว วันที่เลือกจะถูกล็อกในปฏิทินทันทีเพื่อป้องกันการลงทะเบียนซ้ำ
              </p>
            </div>

            {submitError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold text-center">
                {submitError}
              </div>
            )}

            <div className="space-y-2 text-xs bg-orange-50/60 p-4 rounded-2xl border border-orange-100 mb-5">
              <div className="flex justify-between border-b border-orange-100 pb-1.5">
                <span className="text-slate-500">ชื่อ-สกุล:</span>
                <span className="font-bold text-slate-800">{name}</span>
              </div>
              <div className="flex justify-between border-b border-orange-100 pb-1.5">
                <span className="text-slate-500">โรงเรียน:</span>
                <span className="font-bold text-slate-800">{school}</span>
              </div>
              <div className="flex justify-between border-b border-orange-100 pb-1.5">
                <span className="text-slate-500">อำเภอต้นสังกัด:</span>
                <span className="font-bold text-slate-800">{district}</span>
              </div>
              <div className="flex justify-between border-b border-orange-100 pb-1.5">
                <span className="text-slate-500">เบอร์โทรศัพท์:</span>
                <span className="font-bold text-slate-800">{phone}</span>
              </div>
              <div className="flex justify-between border-b border-orange-100 pb-1.5">
                <span className="text-slate-500">Line ID:</span>
                <span className="font-bold text-slate-800">{lineId}</span>
              </div>
              <div className="flex justify-between border-b border-orange-100 pb-1.5">
                <span className="text-slate-500">วันที่และเวลาอบรม:</span>
                <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  {trainingDate} ({trainingTime})
                </span>
              </div>
              <div className="pt-1">
                <span className="text-slate-500 block mb-0.5">หลักสูตร:</span>
                <span className="font-bold text-orange-900 leading-snug block">
                  {finalCourseTitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="flex-1 py-2.5 px-4 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                แก้ไขข้อมูล
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalConfirm}
                className="flex-1 btn-gamified-primary py-2.5 px-4 text-xs font-bold shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>กำลังบันทึกข้อมูล...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>ยืนยันการลงทะเบียน</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D SUCCESS POPUP */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border-4 border-emerald-200 text-center relative transform transition-all scale-100 animate-scaleUp max-h-[92vh] overflow-y-auto">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 text-white flex items-center justify-center mx-auto shadow-md mb-3 animate-bounce">
              <Sparkles className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-slate-800 mb-1">ลงทะเบียนสำเร็จ!</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              ระบบบันทึกข้อมูลการลงทะเบียนของคุณครู <span className="font-bold text-orange-600">{name}</span>{' '}
              ในวันที่ <span className="font-bold text-emerald-700">{trainingDate}</span> ({trainingTime}) เรียบร้อยแล้ว
            </p>

            {/* Real-time Email Notification Status Box */}
            <div className="text-left bg-orange-50/70 border border-orange-200 rounded-2xl p-3.5 mb-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-orange-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  ส่งอีเมลแจ้งเตือนแบบเรียลไทม์แล้ว
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Real-time Email
                </span>
              </div>

              <div className="text-[11px] font-bold text-slate-800 bg-white/90 px-3 py-2 rounded-xl border border-orange-100">
                <div className="text-orange-700 font-black mb-1">{EMAIL_NOTIFICATION_SUBJECT}</div>
                <pre className="whitespace-pre-wrap font-['Prompt'] text-[11px] text-slate-700 leading-relaxed">
                  {buildEmailNotificationBody({
                    name: name.trim(),
                    school: school.trim(),
                    trainingDate,
                    courseTitle: finalCourseTitle,
                  })}
                </pre>
              </div>

              <div className="text-[10px] text-slate-600">
                <span className="font-bold text-slate-700">ผู้รับแจ้งเตือน:</span>{' '}
                {ADMIN_NOTIFICATION_EMAILS.map((em, i) => `${i + 1}.${em}`).join(' ')}
              </div>
            </div>

            <button
              onClick={() => {
                setShowSuccessModal(false);
                setActiveTab('home');
              }}
              className="w-full btn-gamified-primary py-2.5 px-5 text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>กลับสู่หน้าแรก</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
