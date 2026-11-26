import React, { useState, useEffect } from 'react';
import { Course } from '../../types';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Wrench, 
  Award, 
  Sparkles, 
  Search
} from 'lucide-react';

interface CoursesPageProps {
  onSelectCourse: (course: Course) => void;
  setActiveTab: (tab: string) => void;
}

export const CoursesPage: React.FC<CoursesPageProps> = ({ onSelectCourse, setActiveTab }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Real-time Firestore sync for courses (Clean production state - Requirement 10)
  useEffect(() => {
    try {
      const q = collection(db, 'courses');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const uniqueMap = new Map<string, Course>();
          snapshot.docs.forEach((doc) => {
            uniqueMap.set(doc.id, {
              id: doc.id,
              ...doc.data(),
            } as Course);
          });
          setCourses(Array.from(uniqueMap.values()));
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

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.tools && c.tools.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.details && c.details.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleRegister = (course: Course) => {
    onSelectCourse(course);
    setActiveTab('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="liquid-glass p-6 sm:p-8 mb-6 text-center relative overflow-hidden bg-gradient-to-r from-orange-100/60 via-amber-50/80 to-yellow-100/60 border border-orange-200">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/90 text-orange-700 shadow-2xs border border-orange-200 mb-2">
          <BookOpen className="w-3.5 h-3.5 text-orange-500" />
          หลักสูตรการอบรมเชิงปฏิบัติการ
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
          ข้อมูลหลักสูตร AI & ดิจิทัลเพื่อการศึกษา
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto mt-1.5">
          หลักสูตรพัฒนาทักษะดิจิทัลและปัญญาประดิษฐ์ AI สำหรับครูและบุคลากรทางการศึกษา สพป.สุโขทัย เขต 2
        </p>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mt-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อหลักสูตร หรือเครื่องมือ AI..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-orange-200 shadow-inner text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
          />
        </div>
      </div>

      {/* Courses List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 liquid-glass">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-bold">กำลังโหลดข้อมูลหลักสูตร...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-16 liquid-glass">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">
              {searchTerm ? 'ไม่พบหลักสูตรที่ตรงกับคำค้นหา' : 'ยังไม่มีหลักสูตรเปิดรับสมัครในขณะนี้'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {searchTerm ? 'ลองค้นหาด้วยคำอื่น หรือคลิกล้างคำค้นหา' : 'ผู้ดูแลระบบสามารถสร้างและเปิดรับสมัครหลักสูตรใหม่ได้ที่แดชบอร์ด'}
            </p>
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 px-4 py-1.5 rounded-xl text-xs font-bold bg-orange-100 text-orange-700 hover:bg-orange-200 transition"
              >
                แสดงหลักสูตรทั้งหมด
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('register')}
                className="mt-4 btn-gamified-primary py-2 px-5 text-xs font-bold shadow"
              >
                ไปที่หน้าลงทะเบียน
              </button>
            )}
          </div>
        ) : (
          filteredCourses.map((course, idx) => {
            const seatsLeft = (course.maxSeats || 80) - (course.currentSeats || 0);
            const isFull = seatsLeft <= 0;

            return (
              <div 
                key={`${course.id || course.title}-${idx}`}
                className="liquid-glass p-5 sm:p-6 relative border border-white hover:border-orange-200 transition-all shadow-md"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  
                  {/* Left Main Content */}
                  <div className="flex-1 space-y-3">
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isFull 
                          ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {isFull ? '● ที่นั่งเต็มแล้ว' : '● เปิดรับสมัคร'}
                      </span>

                      {course.trainingDate && (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <Calendar className="w-3 h-3 text-amber-600" />
                          {course.trainingDate}
                        </span>
                      )}

                      {course.duration && (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200">
                          <Clock className="w-3 h-3 text-orange-600" />
                          {course.duration}
                        </span>
                      )}
                    </div>

                    <h2 className="text-base sm:text-lg font-extrabold text-slate-800 leading-snug">
                      {course.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {course.details}
                    </p>

                    {course.tools && (
                      <div className="p-3 rounded-xl bg-orange-50/60 border border-orange-100 space-y-1">
                        <div className="flex items-center gap-1 text-xs font-bold text-orange-900">
                          <Wrench className="w-3.5 h-3.5 text-orange-600" />
                          <span>เครื่องมือและปัญญาประดิษฐ์ (AI Tools) ที่ฝึกปฏิบัติ:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {course.tools.split(',').map((t, i) => (
                            <span
                              key={i}
                              className="text-xs font-medium px-2.5 py-0.5 rounded-lg bg-white text-orange-800 border border-orange-200 shadow-2xs"
                            >
                              ✨ {t.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {course.benefits && (
                      <div className="flex items-start gap-2 text-xs text-slate-700">
                        <Award className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-800">ประโยชน์ที่ได้รับ: </span>
                          <span>{course.benefits}</span>
                        </div>
                      </div>
                    )}

                    {course.location && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>สถานที่: {course.location}</span>
                      </div>
                    )}

                  </div>

                  {/* Right CTA */}
                  <div className="lg:w-60 flex-shrink-0 flex flex-col justify-between p-4 rounded-2xl bg-gradient-to-b from-white to-orange-50/50 border border-orange-100 text-center space-y-3">
                    <div>
                      {course.maxSeats ? (
                        <>
                          <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mb-1">
                            <Users className="w-3.5 h-3.5" />
                            <span>สถานะที่นั่งอบรม</span>
                          </div>
                          <div className="text-2xl font-black text-orange-600">
                            {course.currentSeats || 0} / {course.maxSeats}
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-1.5">
                            <div 
                              className="bg-gradient-to-r from-orange-400 to-amber-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (((course.currentSeats || 0) / course.maxSeats) * 100))}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            คงเหลือ {Math.max(0, seatsLeft)} ที่นั่ง
                          </span>
                        </>
                      ) : (
                        <div className="py-2 space-y-1">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ● เปิดรับสมัคร
                          </span>
                          <p className="text-[10.5px] text-slate-500 leading-snug">
                            เลือกรอบวันที่จัดอบรมได้ตามสะดวกในหน้าลงทะเบียน
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleRegister(course)}
                      disabled={isFull}
                      className={`w-full py-2.5 px-4 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        isFull
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'btn-gamified-primary shadow-md'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isFull ? 'ที่นั่งเต็มแล้ว' : 'ลงทะเบียนเข้ารับการอบรม'}</span>
                    </button>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
