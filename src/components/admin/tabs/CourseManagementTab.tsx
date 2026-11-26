import React, { useState, useEffect } from 'react';
import { Course } from '../../../types';
import { db } from '../../../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { 
  BookOpen, 
  Plus, 
  Edit3, 
  Trash2, 
  Calendar, 
  Clock, 
  Users, 
  X, 
  Layers
} from 'lucide-react';
import { ConfirmModal } from '../../common/ConfirmModal';

export const CourseManagementTab: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  // Form states (Removed trainingDate, duration, maxSeats per user request)
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [tools, setTools] = useState('');
  const [benefits, setBenefits] = useState('');
  const [location, setLocation] = useState('ห้องประชุม สพป.สุโขทัย เขต 2 หรือระบบออนไลน์');
  const [status, setStatus] = useState<'open' | 'closed' | 'draft'>('open');

  // Real-time Firestore sync (Clean production state - Requirement 10)
  useEffect(() => {
    try {
      const q = collection(db, 'courses');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: Course[] = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          } as Course));
          setCourses(list);
          setLoading(false);
        },
        () => {
          setCourses([]);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch {
      setCourses([]);
      setLoading(false);
    }
  }, []);

  const openCreateModal = () => {
    setEditingCourse(null);
    setTitle('');
    setDetails('');
    setTools('ChatGPT, Google Gemini, Canva Magic Studio');
    setBenefits('สามารถนำความรู้และเครื่องมือ AI ไปประยุกต์ใช้ในการจัดการเรียนรู้ในชั้นเรียนได้จริง');
    setLocation('ห้องประชุม สพป.สุโขทัย เขต 2 หรือระบบออนไลน์');
    setStatus('open');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Course) => {
    setEditingCourse(c);
    setTitle(c.title);
    setDetails(c.details);
    setTools(c.tools);
    setBenefits(c.benefits);
    setLocation(c.location || 'ห้องประชุม สพป.สุโขทัย เขต 2 หรือระบบออนไลน์');
    setStatus(c.status);
    setIsModalOpen(true);
  };

  const [toastMsg, setToastMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !details.trim()) {
      alert('กรุณากรอกชื่อและรายละเอียดหลักสูตร');
      return;
    }

    setIsSaving(true);
    const payload = {
      title: title.trim(),
      details: details.trim(),
      tools: tools.trim(),
      benefits: benefits.trim(),
      location: location.trim(),
      status,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingCourse?.id) {
        const docRef = doc(db, 'courses', editingCourse.id);
        await updateDoc(docRef, payload);
        showToast('อัปเดตข้อมูลหลักสูตรเรียบร้อยแล้ว');
      } else {
        await addDoc(collection(db, 'courses'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        showToast('เพิ่มหลักสูตรใหม่ลงในระบบเรียบร้อยแล้ว');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Firestore course save error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกหลักสูตร กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestDeleteCourse = (course: Course) => {
    setCourseToDelete(course);
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete?.id) return;
    const targetId = courseToDelete.id;
    setCourseToDelete(null);
    if (editingCourse?.id === targetId) {
      setIsModalOpen(false);
      setEditingCourse(null);
    }

    // Optimistic UI update
    setCourses(prev => prev.filter(c => c.id !== targetId));

    try {
      await deleteDoc(doc(db, 'courses', targetId));
      showToast('ลบหลักสูตรเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Firestore delete error:', err);
      showToast('เกิดข้อผิดพลาดในการลบหลักสูตรจากเซิร์ฟเวอร์');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-orange-100 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-orange-600" />
            <span>จัดการหลักสูตรการอบรม (Course Management)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            เพิ่ม ลบ แก้ไข ข้อมูลหลักสูตร ซึ่งจะอัปเดตไปยังหน้าแรกและหน้ารับสมัครแบบ Real-time
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-gamified-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ เพิ่มหลักสูตรใหม่</span>
        </button>
      </div>

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 font-bold flex items-center gap-2 shadow-xs animate-fadeIn">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Courses List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
          กำลังโหลดข้อมูลหลักสูตร...
        </div>
      ) : courses.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-2">
          <Layers className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-700 text-sm">ยังไม่มีหลักสูตรในฐานข้อมูล</h4>
          <p className="text-slate-400">คลิกที่ปุ่ม "+ เพิ่มหลักสูตรใหม่" ด้านบนเพื่อเริ่มสร้างหลักสูตรจริง</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {courses.map((course, idx) => (
            <div 
              key={`${course.id || course.title}-${idx}`}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-orange-300 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    course.status === 'open' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : course.status === 'closed'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {course.status === 'open' ? '● เปิดรับสมัคร' : course.status === 'closed' ? '● ปิดรับสมัคร' : 'ร่างแบบ'}
                  </span>
                  
                  {course.location && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      📍 {course.location}
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-slate-800 text-base">
                  {course.title}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2">
                  {course.details}
                </p>
                
                {course.tools && (
                  <div className="text-[11px] text-orange-600 font-medium">
                    เครื่องมือ: {course.tools}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => openEditModal(course)}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-orange-50 text-slate-600 hover:text-orange-600 transition cursor-pointer"
                  title="แก้ไขหลักสูตร"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRequestDeleteCourse(course)}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition cursor-pointer"
                  title="ลบหลักสูตร"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT COURSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-4 border-orange-100 relative">
            
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-orange-600" />
              <span>{editingCourse ? 'แก้ไขข้อมูลหลักสูตร' : 'เพิ่มหลักสูตรการอบรมใหม่'}</span>
            </h3>

            <form onSubmit={handleSaveCourse} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ชื่อหลักสูตร *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น หลักสูตรการประยุกต์ใช้ AI เพื่อพัฒนาบทเรียน..."
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  รายละเอียดและเนื้อหาหลักสูตร *
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  required
                  placeholder="สรุปเนื้อหา วัตถุประสงค์ และกิจกรรม..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  เครื่องมือ AI ที่ใช้ (Tools)
                </label>
                <input
                  type="text"
                  value={tools}
                  onChange={(e) => setTools(e.target.value)}
                  placeholder="เช่น ChatGPT, Gemini, Canva AI, Claude"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ประโยชน์ที่ได้รับ (Benefits)
                </label>
                <input
                  type="text"
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                  placeholder="ความรู้ ทักษะ ชิ้นงานที่ได้รับ..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  สถานที่จัดอบรม
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="เช่น ห้องประชุม สพป.สุโขทัย เขต 2 หรือ Zoom"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  สถานะการเปิดรับสมัคร
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-orange-400 focus:outline-none font-bold"
                >
                  <option value="open">เปิดรับสมัคร (Open)</option>
                  <option value="closed">ปิดรับสมัคร (Closed)</option>
                  <option value="draft">ร่างแบบ (Draft)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100">
                {editingCourse ? (
                  <button
                    type="button"
                    onClick={() => handleRequestDeleteCourse(editingCourse)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบหลักสูตรนี้</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="btn-gamified-primary px-6 py-2 rounded-xl font-bold text-white shadow cursor-pointer"
                  >
                    บันทึกข้อมูลหลักสูตร
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Confirmation Modal for Course Deletion */}
      <ConfirmModal
        isOpen={!!courseToDelete}
        title="ยืนยันการลบหลักสูตร"
        message={`คุณต้องการลบหลักสูตร "${courseToDelete?.title || ''}" ใช่หรือไม่? ข้อมูลจะถูกลบออกจากฐานข้อมูลทันที`}
        confirmText="ยืนยันลบหลักสูตร"
        cancelText="ยกเลิก"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setCourseToDelete(null)}
      />

    </div>
  );
};
