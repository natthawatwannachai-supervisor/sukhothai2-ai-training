import React, { useState, useEffect } from 'react';
import { PRNews } from '../../types';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  Bell, 
  FolderDown, 
  ExternalLink, 
  Calendar, 
  Sparkles,
  Share2,
  Image as ImageIcon
} from 'lucide-react';

interface PRNewsPageProps {
  setActiveTab?: (tab: string) => void;
}

export const PRNewsPage: React.FC<PRNewsPageProps> = ({ setActiveTab }) => {
  const [news, setNews] = useState<PRNews[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync PR News from Firestore with error handling
  useEffect(() => {
    try {
      const q = collection(db, 'pr_news');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const uniqueMap = new Map<string, PRNews>();
          snapshot.docs.forEach(doc => {
            uniqueMap.set(doc.id, { id: doc.id, ...doc.data() } as PRNews);
          });
          setNews(Array.from(uniqueMap.values()));
          setLoading(false);
        },
        (error) => {
          console.warn('PR News sync error:', error);
          setNews([]);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch {
      setNews([]);
      setLoading(false);
    }
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="liquid-glass p-6 sm:p-8 mb-8 text-center relative overflow-hidden bg-gradient-to-r from-orange-100/70 via-amber-50/80 to-yellow-100/70 border border-orange-200 shadow-md">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-white/95 text-orange-800 shadow-2xs border border-orange-200 mb-2">
          <Bell className="w-3.5 h-3.5 text-orange-600 fill-orange-500" />
          ศูนย์ข่าวสารและประชาสัมพันธ์
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
          ข่าวประชาสัมพันธ์และภาพกิจกรรม
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto mt-1.5 leading-relaxed">
          ติดตามข่าวสารความเคลื่อนไหว ประกาศการจัดอบรม และดาวน์โหลดอัลบั้มภาพกิจกรรมความละเอียดสูง
        </p>
      </div>

      {/* PR NEWS FEED */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-orange-200/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-xs">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-800">
                รายการข่าวสารล่าสุด
              </h2>
              <p className="text-xs text-slate-500">
                ข่าวสาร ประชาสัมพันธ์ และลิงก์ดาวน์โหลดภาพกิจกรรมทาง Google Drive
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-orange-700 bg-orange-100/80 px-2.5 py-1 rounded-lg">
            ทั้งหมด {news.length} รายการ
          </span>
        </div>

        {loading ? (
          <div className="liquid-glass p-12 text-center text-xs text-slate-500">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p>กำลังโหลดข่าวประชาสัมพันธ์...</p>
          </div>
        ) : news.length === 0 ? (
          <div className="liquid-glass p-12 text-center text-xs text-slate-500">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
            <p className="font-extrabold text-slate-700 text-sm">ยังไม่มีข่าวประชาสัมพันธ์ในขณะนี้</p>
            <p className="text-xs text-slate-500 mt-1">
              เจ้าหน้าที่ผู้ดูแลระบบสามารถเพิ่มข่าวสารและอัลบั้ม Google Drive ได้ที่หน้าแดชบอร์ดแอดมิน
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {news.map((item, idx) => (
              <div 
                key={`${item.id || 'news'}-${idx}`}
                className="liquid-glass p-5 overflow-hidden flex flex-col justify-between group hover:border-orange-300 transition-all duration-300 hover:shadow-lg rounded-2xl"
              >
                <div>
                  {item.imageUrl ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-3.5 bg-slate-100 shadow-2xs">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 rounded-xl bg-gradient-to-br from-orange-100/50 to-amber-50/50 flex items-center justify-center mb-3.5 border border-orange-100">
                      <ImageIcon className="w-8 h-8 text-orange-300" />
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-600 mb-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{item.publishedDate || 'ประกาศทั่วไป'}</span>
                  </div>

                  <h3 className="font-black text-slate-800 text-base mb-2 leading-snug group-hover:text-orange-950 transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-4 mb-4 whitespace-pre-line">
                    {item.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-orange-100/90 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-medium truncate">
                    {item.author || 'กลุ่มงานส่งเสริมพัฒนาสื่อ นวัตกรรมและเทคโนโลยีทางการศึกษา'}
                  </span>

                  {item.driveUrl && (
                    <a
                      href={item.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition flex-shrink-0"
                    >
                      <FolderDown className="w-3.5 h-3.5" />
                      <span>อัลบั้มภาพ Google Drive</span>
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
