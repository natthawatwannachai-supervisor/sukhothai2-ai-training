import React, { useState, useEffect } from 'react';
import { PRNews } from '../../../types';
import { db } from '../../../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { 
  Bell, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  Calendar,
  ExternalLink,
  FolderDown,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { ConfirmModal } from '../../common/ConfirmModal';

export const PRManagementTab: React.FC = () => {
  const [newsList, setNewsList] = useState<PRNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsToDelete, setNewsToDelete] = useState<PRNews | null>(null);
  
  // News form states
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<PRNews | null>(null);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsImageUrl, setNewsImageUrl] = useState('');
  const [newsDriveUrl, setNewsDriveUrl] = useState('');
  const [newsAuthor, setNewsAuthor] = useState('กลุ่มงานส่งเสริมพัฒนาสื่อ นวัตกรรมและเทคโนโลยีทางการศึกษา');
  const [newsDate, setNewsDate] = useState(() => {
    const today = new Date();
    return `${today.getDate()} พฤศจิกายน ${today.getFullYear() + 543}`;
  });

  // Sync news from Firestore with error handling
  useEffect(() => {
    try {
      const q = collection(db, 'pr_news');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PRNews));
          setNewsList(list);
          setLoading(false);
        },
        (error) => {
          console.warn('PR News fetch error:', error);
          setNewsList([]);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch {
      setNewsList([]);
      setLoading(false);
    }
  }, []);

  const openCreateNewsModal = () => {
    setEditingNews(null);
    setNewsTitle('');
    setNewsContent('');
    setNewsImageUrl('');
    setNewsDriveUrl('');
    setNewsAuthor('กลุ่มงานส่งเสริมพัฒนาสื่อ นวัตกรรมและเทคโนโลยีทางการศึกษา');
    const today = new Date();
    setNewsDate(`${today.getDate()} พฤศจิกายน ${today.getFullYear() + 543}`);
    setIsNewsModalOpen(true);
  };

  const openEditNewsModal = (item: PRNews) => {
    setEditingNews(item);
    setNewsTitle(item.title);
    setNewsContent(item.content);
    setNewsImageUrl(item.imageUrl || '');
    setNewsDriveUrl(item.driveUrl || '');
    setNewsAuthor(item.author || 'กลุ่มงานส่งเสริมพัฒนาสื่อ นวัตกรรมและเทคโนโลยีทางการศึกษา');
    setNewsDate(item.publishedDate || '');
    setIsNewsModalOpen(true);
  };

  const [toastMsg, setToastMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim() || !newsContent.trim()) {
      alert('กรุณากรอกหัวข้อและเนื้อหาข่าว');
      return;
    }

    setIsSaving(true);
    const payload = {
      title: newsTitle.trim(),
      content: newsContent.trim(),
      imageUrl: newsImageUrl.trim(),
      driveUrl: newsDriveUrl.trim(),
      author: newsAuthor.trim(),
      publishedDate: newsDate.trim(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingNews?.id) {
        await updateDoc(doc(db, 'pr_news', editingNews.id), payload);
        showToast('แก้ไขข้อมูลข่าวประชาสัมพันธ์เรียบร้อยแล้ว');
      } else {
        await addDoc(collection(db, 'pr_news'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        showToast('เพิ่มข่าวประชาสัมพันธ์ใหม่เรียบร้อยแล้ว');
      }
      setIsNewsModalOpen(false);
    } catch (err) {
      console.error('Error saving PR news:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข่าวประชาสัมพันธ์ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestDeleteNews = (item: PRNews) => {
    setNewsToDelete(item);
  };

  const handleConfirmDeleteNews = async () => {
    if (!newsToDelete?.id) return;
    const targetId = newsToDelete.id;
    setNewsToDelete(null);
    if (editingNews?.id === targetId) {
      setIsNewsModalOpen(false);
      setEditingNews(null);
    }

    setNewsList(prev => prev.filter(n => n.id !== targetId));
    try {
      await deleteDoc(doc(db, 'pr_news', targetId));
      showToast('ลบข่าวประชาสัมพันธ์เรียบร้อยแล้ว');
    } catch (e) {
      console.error('Error deleting PR news:', e);
      showToast('เกิดข้อผิดพลาดในการลบข่าวประชาสัมพันธ์จากฐานข้อมูล');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-orange-100 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-600" />
            <span>จัดการข่าวประชาสัมพันธ์ (PR News Management)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            เพิ่ม ลบ แก้ไข ข่าวสารประชาสัมพันธ์ และแนบลิงก์ดาวน์โหลดภาพกิจกรรมทาง Google Drive
          </p>
        </div>

        <button
          onClick={openCreateNewsModal}
          className="btn-gamified-primary px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ เพิ่มข่าวสารใหม่</span>
        </button>
      </div>

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 font-bold flex items-center gap-2 shadow-xs animate-fadeIn">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* News List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p>กำลังโหลดรายการข่าว...</p>
        </div>
      ) : newsList.length === 0 ? (
        <div className="p-10 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
          <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-extrabold text-slate-700 text-sm">ยังไม่มีข่าวประชาสัมพันธ์ในระบบ</p>
          <p className="text-xs text-slate-400 mt-1">กดปุ่ม "+ เพิ่มข่าวสารใหม่" เพื่อเริ่มสร้างข่าวสารและอัลบั้มกิจกรรม</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {newsList.map((item, idx) => (
            <div key={`${item.id || 'news'}-${idx}`} className="p-4 sm:p-5 rounded-2xl bg-white border border-orange-100 shadow-sm flex flex-col justify-between space-y-3.5 hover:border-orange-300 transition-all">
              <div className="space-y-2.5">
                {item.imageUrl ? (
                  <div className="relative w-full h-44 rounded-xl overflow-hidden bg-slate-100">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-28 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                  </div>
                )}
                
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-600">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{item.publishedDate || 'ประกาศทั่วไป'}</span>
                </div>

                <h4 className="font-black text-slate-800 text-sm leading-snug">
                  {item.title}
                </h4>
                
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {item.content}
                </p>

                {item.driveUrl && (
                  <div className="pt-1">
                    <a
                      href={item.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition"
                    >
                      <FolderDown className="w-3.5 h-3.5" />
                      <span>ลิงก์อัลบั้ม Google Drive</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
                  {item.author}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => openEditNewsModal(item)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-orange-50 text-slate-600 hover:text-orange-600 transition cursor-pointer"
                    title="แก้ไขข่าว"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRequestDeleteNews(item)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition cursor-pointer"
                    title="ลบข่าว"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT NEWS MODAL */}
      {isNewsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border-4 border-orange-200 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-orange-100 mb-4">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Bell className="w-4 h-4 text-orange-600" />
                <span>{editingNews ? 'แก้ไขข่าวประชาสัมพันธ์' : 'เพิ่มข่าวประชาสัมพันธ์ใหม่'}</span>
              </h3>
              <button 
                onClick={() => setIsNewsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNews} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">หัวข้อข่าว *</label>
                <input
                  type="text"
                  value={newsTitle}
                  onChange={(e) => setNewsTitle(e.target.value)}
                  required
                  placeholder="เช่น ประมวลภาพการอบรม AI เพื่อการศึกษา..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">เนื้อหาข่าวสาร *</label>
                <textarea
                  value={newsContent}
                  onChange={(e) => setNewsContent(e.target.value)}
                  rows={4}
                  required
                  placeholder="ระบุรายละเอียดข่าวสาร กิจกรรมการอบรม หรือผลลัพธ์..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">URL รูปภาพประกอบข่าว (Image URL)</label>
                <input
                  type="text"
                  value={newsImageUrl}
                  onChange={(e) => setNewsImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">URL ลิงก์อัลบั้มภาพกิจกรรม (Google Drive)</label>
                <input
                  type="text"
                  value={newsDriveUrl}
                  onChange={(e) => setNewsDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">วันที่เผยแพร่</label>
                  <input
                    type="text"
                    value={newsDate}
                    onChange={(e) => setNewsDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">หน่วยงานผู้เขียน/เผยแพร่</label>
                  <input
                    type="text"
                    value={newsAuthor}
                    onChange={(e) => setNewsAuthor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                {editingNews ? (
                  <button
                    type="button"
                    onClick={() => handleRequestDeleteNews(editingNews)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบข่าวนี้</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer font-bold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="btn-gamified-primary px-5 py-2 text-xs font-bold shadow cursor-pointer"
                  >
                    บันทึกข่าวสาร
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for PR News Deletion */}
      <ConfirmModal
        isOpen={!!newsToDelete}
        title="ยืนยันการลบข่าวประชาสัมพันธ์"
        message={`คุณต้องการลบข่าว "${newsToDelete?.title || ''}" ใช่หรือไม่? ข้อมูลจะถูกลบออกจากระบบอย่างถาวร`}
        confirmText="ยืนยันลบข่าว"
        cancelText="ยกเลิก"
        isDanger={true}
        onConfirm={handleConfirmDeleteNews}
        onCancel={() => setNewsToDelete(null)}
      />

    </div>
  );
};
