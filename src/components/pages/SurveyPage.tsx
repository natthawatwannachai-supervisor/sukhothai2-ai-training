import React, { useState, useEffect } from 'react';
import { Course, Survey } from '../../types';
import { db } from '../../lib/firebase';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { 
  FileCheck2, 
  Sparkles, 
  Heart, 
  Send, 
  MapPin, 
  Calendar, 
  BookOpen, 
  ArrowRight,
  MessageSquareHeart,
  Lightbulb
} from 'lucide-react';

interface SurveyPageProps {
  courses?: Course[];
  setActiveTab: (tab: string) => void;
}

export const SurveyPage: React.FC<SurveyPageProps> = ({ 
  courses: initialCourses = [],
  setActiveTab 
}) => {
  const [courses, setCourses] = useState<Course[]>(initialCourses);

  // Sync courses
  useEffect(() => {
    try {
      const q = collection(db, 'courses');
      const unsubscribe = onSnapshot(
        q, 
        (snapshot) => {
          const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
          setCourses(fetched);
          if (fetched.length > 0 && !courseId) {
            setCourseId(fetched[0].id || '');
            setCourseTitleManual(fetched[0].title);
          }
        },
        (error) => {
          console.warn('Courses sync error in survey:', error);
          setCourses([]);
        }
      );
      return () => unsubscribe();
    } catch {
      setCourses([]);
    }
  }, []);

  // Part 1: Demographics (No position field, manual district input)
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [courseTitleManual, setCourseTitleManual] = useState(courses[0]?.title || '');
  const [trainingDate, setTrainingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [gender, setGender] = useState('หญิง');
  const [ageRange, setAgeRange] = useState('31 - 40 ปี');
  const [district, setDistrict] = useState(''); // Text input per Requirement 6

  // Part 2: 10 Likert questions focused strictly on training content & learning outcomes
  const [ratings, setRatings] = useState<Record<string, number>>({
    q1: 5, q2: 5, q3: 5, q4: 5, q5: 5, q6: 5, q7: 5, q8: 5, q9: 5, q10: 5,
  });

  // Open-ended questions
  const [impression, setImpression] = useState('');
  const [suggestion, setSuggestion] = useState('');

  // Flow State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // 10 Content-focused Questions (No location, no equipment)
  const likertQuestions = [
    { key: 'q1', text: '1. เนื้อหาหลักสูตรมีความทันสมัย สอดคล้องกับการพัฒนาทักษะปัญญาประดิษฐ์ (AI) เพื่อการศึกษาในยุคปัจจุบัน' },
    { key: 'q2', text: '2. เนื้อหาการอบรมมีความชัดเจน เข้าใจง่าย และมีการจัดลำดับขั้นตอนจากพื้นฐานสู่ขั้นประยุกต์' },
    { key: 'q3', text: '3. การอธิบายและถ่ายทอดเนื้อหาของวิทยากรมีความถูกต้อง ชัดเจน และตรงประเด็น' },
    { key: 'q4', text: '4. กิจกรรมการฝึกปฏิบัติ (Workshop) มุ่งเน้นการลงมือทำจริงสอดคล้องกับเนื้อหาบทเรียน' },
    { key: 'q5', text: '5. ตัวอย่างการใช้งานเครื่องมือ AI และกรณีศึกษาที่นำเสนอ สามารถนำไปปรับใช้ในวิชาที่สอนได้จริง' },
    { key: 'q6', text: '6. เนื้อหาช่วยเสริมสร้างทักษะการสร้างสรรค์สื่อนวัตกรรมและแผนการจัดการเรียนรู้เชิงรุก (Active Learning)' },
    { key: 'q7', text: '7. เนื้อหาการอบรมช่วยลดระยะเวลาและเพิ่มประสิทธิภาพในการปฏิบัติงานสอนของคุณครู' },
    { key: 'q8', text: '8. การสอดแทรกเนื้อหาด้านจริยธรรม ความปลอดภัย และข้อควรระวังในการใช้ปัญญาประดิษฐ์ (AI Ethics)' },
    { key: 'q9', text: '9. ความรู้และเทคนิคที่ได้รับตรงตามความต้องการและเกิดประโยชน์ต่อการพัฒนาวิชาชีพครู' },
    { key: 'q10', text: '10. ภาพรวมของเนื้อหาหลักสูตรการอบรมมีคุณภาพและคุ้มค่าต่อการเข้าร่วม' },
  ];

  const likertLabels: Record<number, { text: string; emoji: string; color: string }> = {
    5: { text: 'มากที่สุด', emoji: '🤩', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
    4: { text: 'มาก', emoji: '😊', color: 'bg-amber-50 text-amber-800 border-amber-300' },
    3: { text: 'ปานกลาง', emoji: '😐', color: 'bg-yellow-50 text-yellow-800 border-yellow-300' },
    2: { text: 'น้อย', emoji: '🙁', color: 'bg-orange-50 text-orange-800 border-orange-300' },
    1: { text: 'น้อยที่สุด', emoji: '😣', color: 'bg-rose-50 text-rose-800 border-rose-300' },
  };

  const handleRatingChange = (key: string, value: number) => {
    setRatings(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!district.trim()) {
      alert('กรุณากรอกชื่ออำเภอต้นสังกัด');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCourseObj = courses.find(c => c.id === courseId);
      const surveyData: Omit<Survey, 'id'> = {
        courseId: courseId || 'general-course',
        courseTitle: selectedCourseObj?.title || courseTitleManual || 'หลักสูตรอบรม AI เพื่อการศึกษา',
        trainingDate,
        gender,
        ageRange,
        district: district.trim(),
        position: 'ครู/บุคลากรทางการศึกษา',
        q1: ratings.q1,
        q2: ratings.q2,
        q3: ratings.q3,
        q4: ratings.q4,
        q5: ratings.q5,
        q6: ratings.q6,
        q7: ratings.q7,
        q8: ratings.q8,
        q9: ratings.q9,
        q10: ratings.q10,
        impression: impression.trim(),
        suggestion: suggestion.trim(),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'surveys'), surveyData);

      setShowSuccessModal(true);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error('Survey submission error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกแบบสอบถาม กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="liquid-glass p-6 sm:p-8 mb-6 text-center relative overflow-hidden bg-gradient-to-r from-orange-100/60 via-amber-50/80 to-yellow-100/60 border border-orange-200">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/90 text-orange-700 shadow-2xs border border-orange-200 mb-2">
          <Heart className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
          แบบประเมินความพึงพอใจด้านเนื้อหาการอบรม
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
          แบบสอบถามความพึงพอใจการอบรมเชิงปฏิบัติการ
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto mt-1.5">
          ประเมินคุณภาพด้านเนื้อหาหลักสูตรและประโยชน์ที่ได้รับ เพื่อนำไปพัฒนาการจัดการเรียนรู้ของ สพป.สุโขทัย เขต 2
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* PART 1: Demographics (No position field, manual district) */}
        <div className="liquid-glass p-5 sm:p-7 space-y-4">
          <div className="flex items-center gap-2 pb-2.5 border-b border-orange-100">
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white font-black text-xs flex items-center justify-center">
              1
            </span>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800">
              ตอนที่ 1: ข้อมูลทั่วไปของผู้ตอบแบบสอบถาม
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            
            {/* Course Evaluated */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-orange-500" />
                <span>หลักสูตรที่ท่านเข้ารับการอบรม *</span>
              </label>
              {courses.length > 0 ? (
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-400 font-medium"
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
                  placeholder="ระบุชื่อหลักสูตรที่เข้าอบรม"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-400 font-medium"
                />
              )}
            </div>

            {/* Training Date */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-orange-500" />
                <span>วันที่เข้ารับการอบรม *</span>
              </label>
              <input
                type="date"
                value={trainingDate}
                onChange={(e) => setTrainingDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-400 font-bold"
              />
            </div>

            {/* District as Manual Text Input (Requirement 6) */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-orange-500" />
                <span>อำเภอต้นสังกัด (กรอกด้วยตนเอง) *</span>
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                required
                placeholder="ระบุชื่ออำเภอ เช่น สวรรคโลก, คีรีมาศ, กงไกรลาศ..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-400 font-medium"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                เพศ *
              </label>
              <div className="flex items-center gap-4 pt-1">
                {['หญิง', 'ชาย', 'ไม่ระบุ'].map((g) => (
                  <label key={g} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={gender === g}
                      onChange={() => setGender(g)}
                      className="text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <span>{g}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Age Range */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                ช่วงอายุ *
              </label>
              <select
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-400 font-medium"
              >
                <option value="ต่ำกว่า 30 ปี">ต่ำกว่า 30 ปี</option>
                <option value="31 - 40 ปี">31 - 40 ปี</option>
                <option value="41 - 50 ปี">41 - 50 ปี</option>
                <option value="51 ปีขึ้นไป">51 ปีขึ้นไป</option>
              </select>
            </div>

          </div>
        </div>

        {/* PART 2: 10 Content-Focused Likert Scale Questions */}
        <div className="liquid-glass p-5 sm:p-7 space-y-5">
          <div className="flex items-center justify-between pb-2.5 border-b border-orange-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white font-black text-xs flex items-center justify-center">
                2
              </span>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-800">
                ตอนที่ 2: ระดับความพึงพอใจต่อเนื้อหาและการนำไปใช้ (เกณฑ์ 5 ระดับ)
              </h2>
            </div>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              5 = มากที่สุด, 1 = น้อยที่สุด
            </span>
          </div>

          <div className="space-y-4">
            {likertQuestions.map((q) => (
              <div 
                key={q.key} 
                className="p-3.5 rounded-xl bg-white/80 border border-orange-100 hover:border-orange-200 transition"
              >
                <p className="text-xs sm:text-sm font-bold text-slate-800 mb-2.5 leading-relaxed">
                  {q.text}
                </p>

                {/* Likert Scale 1 - 5 buttons */}
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const isSelected = ratings[q.key] === val;
                    const meta = likertLabels[val];
                    return (
                      <button
                        type="button"
                        key={val}
                        onClick={() => handleRatingChange(q.key, val)}
                        className={`py-2 px-1 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                          isSelected
                            ? `${meta.color} font-black shadow-xs scale-102 ring-2 ring-orange-400`
                            : 'bg-slate-50 border-slate-200 hover:border-orange-200 text-slate-600'
                        }`}
                      >
                        <span className="text-sm sm:text-base">{meta.emoji}</span>
                        <span className="text-xs font-black">{val}</span>
                        <span className="text-[8px] hidden sm:block opacity-80">{meta.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PART 3: Open-Ended Feedback */}
        <div className="liquid-glass p-5 sm:p-7 space-y-4">
          <div className="flex items-center gap-2 pb-2.5 border-b border-orange-100">
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 text-white font-black text-xs flex items-center justify-center">
              3
            </span>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800">
              ตอนที่ 3: ข้อเสนอแนะและสิ่งที่ประทับใจ (ปลายเปิด)
            </h2>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <MessageSquareHeart className="w-3.5 h-3.5 text-orange-500" />
              <span>1. สิ่งที่ท่านประทับใจมากที่สุดในเนื้อหาการอบรม</span>
            </label>
            <textarea
              value={impression}
              onChange={(e) => setImpression(e.target.value)}
              rows={2}
              placeholder="ระบุสิ่งที่ประทับใจในเนื้อหาหรือกิจกรรม..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-orange-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>2. ข้อเสนอแนะเพื่อการพัฒนาเนื้อหาหลักสูตรในครั้งต่อไป</span>
            </label>
            <textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              rows={2}
              placeholder="ระบุหัวข้อหรือเทคนิค AI ที่ต้องการเรียนรู้เพิ่มเติม..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-orange-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="text-center pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gamified-primary py-3 px-8 text-sm sm:text-base font-bold shadow-lg inline-flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span>กำลังส่งแบบประเมิน...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>ส่งแบบสอบถามความพึงพอใจ</span>
              </>
            )}
          </button>
        </div>

      </form>

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border-4 border-amber-200 text-center relative transform transition-all scale-100 animate-scaleUp">
            
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 text-white flex items-center justify-center mx-auto shadow-md mb-3 animate-bounce">
              <Sparkles className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-slate-800 mb-1">
              ส่งแบบประเมินสำเร็จ!
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              กลุ่มนิเทศ ติดตาม และประเมินผลการจัดการศึกษา สพป.สุโขทัย เขต 2 ขอขอบพระคุณในข้อคิดเห็นอันมีค่ายิ่งของท่าน
            </p>

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
