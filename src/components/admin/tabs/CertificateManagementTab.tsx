import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Course, Registration, CertificateBatch, CertificateRecipient } from '../../../types';
import { db } from '../../../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { 
  Award, 
  Upload, 
  CheckCircle, 
  Users, 
  Image as ImageIcon,
  Save,
  Building2,
  FileCheck2,
  ShieldCheck,
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  Eye,
  Search,
  Printer,
  Download,
  X,
  ExternalLink,
  Layers,
  ArrowRight,
  PenTool,
  Edit3
} from 'lucide-react';
import { ConfirmModal } from '../../common/ConfirmModal';
import { downloadCertificatePdf, printCertificate } from '../../../utils/pdfExport';
import { toArabicNumerals } from '../../../utils/thaiNumerals';

export const CertificateManagementTab: React.FC = () => {
  const [batches, setBatches] = useState<CertificateBatch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for creating a new Certificate Batch
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [courseTitle, setCourseTitle] = useState('การประยุกต์ใช้ AI ในการสร้างสื่อนวัตกรรมทางการศึกษา');
  const [trainingDate, setTrainingDate] = useState(() => {
    const today = new Date();
    return `วันที่ ${today.getDate()} พฤศจิกายน ${today.getFullYear() + 543}`;
  });
  const [issueDate, setIssueDate] = useState(() => {
    const today = new Date();
    return `ให้ไว้ ณ วันที่ ${today.getDate()} พฤศจิกายน พุทธศักราช ${today.getFullYear() + 543}`;
  });
  const [certPrefix, setCertPrefix] = useState('สพป.สท.2-ว');
  const [startNumber, setStartNumber] = useState<number>(1);
  const [numberDigits, setNumberDigits] = useState<number>(3); // 3 -> 001, 002...
  const [yearSuffix, setYearSuffix] = useState('/2569');
  
  // Single signatory (ผอ.เขต คนเดียวตามที่กำหนด)
  const [directorName, setDirectorName] = useState('นายเดชา ลุนาวงค์');
  const [directorPosition, setDirectorPosition] = useState('ผู้อำนวยการสำนักงานเขตพื้นที่การศึกษาประถมศึกษาสุโขทัย เขต 2');
  const [defaultSchool, setDefaultSchool] = useState('โรงเรียนอนุบาลสวรรคโลก');
  const [logoUrl, setLogoUrl] = useState('/assets/aistudio/LOGO_E-SPORT__18__733b26a9.png');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [bgImageUrl, setBgImageUrl] = useState('');
  const [rosterInput, setRosterInput] = useState('');

  // UI feedback & Modals
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [batchToDelete, setBatchToDelete] = useState<CertificateBatch | null>(null);
  
  // Inspection modal & Individual Recipient Editing
  const [inspectingBatch, setInspectingBatch] = useState<CertificateBatch | null>(null);
  const [previewRecipient, setPreviewRecipient] = useState<CertificateRecipient | null>(null);
  const [inspectSearch, setInspectSearch] = useState('');
  const adminCertRef = useRef<HTMLDivElement>(null);
  const [isAdminDownloadingPdf, setIsAdminDownloadingPdf] = useState(false);

  // Individual recipient editing modal state
  const [editingRecipient, setEditingRecipient] = useState<CertificateRecipient | null>(null);
  const [editName, setEditName] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [editCertNumber, setEditCertNumber] = useState('');
  const [editTrainingDate, setEditTrainingDate] = useState('');
  const [editIssueDate, setEditIssueDate] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleAdminDownloadPdf = async () => {
    if (!previewRecipient || !adminCertRef.current) return;
    await downloadCertificatePdf(adminCertRef.current, previewRecipient.name, setIsAdminDownloadingPdf);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Sync certificate batches from Firestore in real-time (normalizing cert numbers to Arabic numerals)
  useEffect(() => {
    try {
      const q = collection(db, 'certificates');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const uniqueMap = new Map<string, CertificateBatch>();
          snapshot.docs.forEach(d => {
            const raw = d.data() as CertificateBatch;
            const normalizedRecipients = (raw.recipients || []).map(r => ({
              ...r,
              certNumber: toArabicNumerals(r.certNumber)
            }));
            uniqueMap.set(d.id, {
              ...raw,
              id: d.id,
              certPrefix: toArabicNumerals(raw.certPrefix),
              recipients: normalizedRecipients
            });
          });
          setBatches(Array.from(uniqueMap.values()));
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

  // Sync courses for select options
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

  // Sync registrations for one-click import
  useEffect(() => {
    try {
      const q = collection(db, 'registrations');
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Registration));
        setRegistrations(list);
      });
      return () => unsubscribe();
    } catch {
      // Ignore
    }
  }, []);

  // Format running certificate number in Arabic numerals (e.g. สพป.สท.2-ว 001/2569)
  const formatCertNumber = (num: number) => {
    const padded = String(num).padStart(numberDigits, '0');
    return toArabicNumerals(`${certPrefix} ${padded}${yearSuffix}`);
  };

  // Computed parsed recipient list from textarea
  const parsedNames = useMemo(() => {
    if (!rosterInput.trim()) return [];
    return rosterInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map((line, idx) => {
        // Can be "Name" or "Name | School" or "Name, School"
        let name = line;
        let school = defaultSchool;
        if (line.includes('|')) {
          const parts = line.split('|');
          name = parts[0].trim();
          school = parts[1]?.trim() || defaultSchool;
        } else if (line.includes(',')) {
          const parts = line.split(',');
          name = parts[0].trim();
          school = parts[1]?.trim() || defaultSchool;
        }
        const certNum = formatCertNumber(startNumber + idx);
        return {
          id: `item_${idx + 1}`,
          certNumber: certNum,
          name,
          school
        } as CertificateRecipient;
      });
  }, [rosterInput, defaultSchool, startNumber, numberDigits, certPrefix, yearSuffix]);

  // Import confirmed registrants into roster
  const handleImportFromRegistrations = () => {
    const confirmed = registrations.filter(r => r.status === 'confirmed' || !r.status);
    if (confirmed.length === 0) {
      showToast('ไม่พบข้อมูลผู้ลงทะเบียนที่ยืนยันสิทธิ์ในระบบ');
      return;
    }
    const lines = confirmed.map(r => `${r.name} | ${r.school || defaultSchool}`).join('\n');
    setRosterInput(lines);
    showToast(`ดึงรายชื่อผู้ลงทะเบียนเรียบร้อยแล้ว จำนวน ${confirmed.length} ท่าน`);
  };

  // Helper to compress image data URL or file to Full HD high-definition JPEG (1920x1358, ~180KB - 280KB)
  const compressImageToDataUrl = (
    fileOrDataUrl: File | string,
    maxWidth = 1920,
    maxHeight = 1358,
    quality = 0.84
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Scale to Full HD while maintaining aspect ratio
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            // Export as high-definition JPEG (~180KB - 280KB, well under 1MB Firestore limit)
            let compressed = canvas.toDataURL('image/jpeg', quality);
            // Safety check: if raw base64 is still > 550KB, reduce quality slightly to stay ultra-safe
            if (compressed.length > 700000) {
              compressed = canvas.toDataURL('image/jpeg', 0.76);
            }
            resolve(compressed);
            return;
          }
        } catch (e) {
          console.warn('Canvas compression error:', e);
        }
        resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
      };
      img.onerror = () => {
        resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
      };

      if (typeof fileOrDataUrl === 'string') {
        img.src = fileOrDataUrl;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = (e.target?.result as string) || '';
        };
        reader.readAsDataURL(fileOrDataUrl);
      }
    });
  };

  // Helper to process digital signature preserving transparency (PNG, max 600x250, <40KB)
  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('กรุณาเลือกไฟล์รูปภาพลายเซ็นต์เท่านั้น (แนะนำ PNG พื้นหลังโปร่งใส)');
      return;
    }

    try {
      showToast('กำลังประมวลผลลายเซ็นต์ดิจิทัล...');
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          const maxW = 1000;
          const maxH = 450;
          if (w > maxW || h > maxH) {
            const r = Math.min(maxW / w, maxH / h);
            w = Math.round(w * r);
            h = Math.round(h * r);
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            // Clear canvas to ensure alpha channel remains transparent
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            const signaturePng = canvas.toDataURL('image/png');
            setSignatureUrl(signaturePng);
            showToast('อัปโหลดลายเซ็นต์ดิจิทัลสำเร็จ (แสดงผลเหนือชื่อผู้ลงนาม)');
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการประมวลผลลายเซ็นต์');
    }
  };

  // Handle Logo Upload with automatic client-side compression (100% upload fidelity)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น (PNG, JPG, WebP)');
      return;
    }

    try {
      showToast('กำลังประมวลผลโลโก้บนเกียรติบัตร...');
      const compressed = await compressImageToDataUrl(file, 400, 400, 0.90);
      setLogoUrl(compressed);
      showToast('อัปโหลดโลโก้บนเกียรติบัตรสำเร็จ (แสดงผล 100%)');
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการประมวลผลโลโก้');
    }
  };

  // Handle local background image upload with Full HD (1920x1358) high-definition processing
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WebP)');
      return;
    }

    try {
      showToast('กำลังประมวลผลแม่แบบเกียรติบัตรระดับความคมชัดสูง Full HD (1920x1358)...');
      const compressed = await compressImageToDataUrl(file, 1920, 1358, 0.84);
      setBgImageUrl(compressed);
      showToast('อัปโหลดแม่แบบเกียรติบัตรความคมชัดสูง Full HD เรียบร้อยแล้ว');
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการประมวลผลไฟล์ภาพ');
    }
  };

  // Generate and save Certificate Batch to Firestore
  const handleGenerateCertificates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim()) {
      showToast('กรุณาระบุชื่อหลักสูตร');
      return;
    }
    if (parsedNames.length === 0) {
      showToast('กรุณาระบุรายชื่อผู้มีสิทธิ์ได้รับเกียรติบัตรอย่างน้อย 1 ท่าน');
      return;
    }

    setIsGenerating(true);
    try {
      let finalBgUrl = bgImageUrl.trim();
      // Ensure Full HD preservation: only re-compress if Data URL is excessively large (>500KB)
      if (finalBgUrl.startsWith('data:image') && finalBgUrl.length > 700000) {
        showToast('กำลังปรับแต่งขนาดภาพพื้นหลัง Full HD ให้พอเหมาะกับฐานข้อมูล...');
        try {
          finalBgUrl = await compressImageToDataUrl(finalBgUrl, 1920, 1358, 0.78);
        } catch (e) {
          console.warn('Full HD auto-compression fallback:', e);
        }
      }

      const endNum = startNumber + parsedNames.length - 1;

      const payload: Omit<CertificateBatch, 'id'> = {
        courseTitle: courseTitle.trim(),
        trainingDate: trainingDate.trim(),
        issueDate: issueDate.trim(),
        certPrefix: certPrefix.trim(),
        startNumber,
        endNumber: endNum,
        directorName: directorName.trim(),
        directorPosition: directorPosition.trim(),
        defaultSchool: defaultSchool.trim(),
        logoUrl: logoUrl.trim(),
        signatureUrl: signatureUrl.trim(), // Requirement 5: ลายเซ็นต์ดิจิทัลของผู้ลงนาม
        bgImageUrl: finalBgUrl,
        recipients: parsedNames,
        totalCount: parsedNames.length,
        createdAt: new Date().toISOString(),
        createdBy: 'Admin สพป.สุโขทัย เขต 2'
      };

      // Calculate document size before sending to Firestore to guarantee < 1MB limit (1,048,576 bytes)
      let payloadJson = JSON.stringify(payload);
      let estimatedBytes = new Blob([payloadJson]).size;

      if (estimatedBytes > 950000) {
        // If still approaching 1MB, compress image slightly at 1920x1358 with 0.72 quality
        if (finalBgUrl.startsWith('data:image')) {
          finalBgUrl = await compressImageToDataUrl(finalBgUrl, 1920, 1358, 0.72);
          payload.bgImageUrl = finalBgUrl;
          payloadJson = JSON.stringify(payload);
          estimatedBytes = new Blob([payloadJson]).size;
        }
      }

      if (estimatedBytes > 1048576) {
        showToast(`ขนาดชุดเกียรติบัตร (${(estimatedBytes / 1024 / 1024).toFixed(2)} MB) เกินขีดจำกัด 1MB ของฐานข้อมูล กรุณาลดขนาดภาพพื้นหลังหรือแบ่งจำนวนรายชื่อ`);
        setIsGenerating(false);
        return;
      }

      const docRef = await addDoc(collection(db, 'certificates'), payload);
      
      // Update global settings cache for general reference (safely with compressed image)
      await setDoc(doc(db, 'settings', 'certificate'), {
        directorName,
        directorPosition,
        defaultSchool,
        certNumberPrefix: certPrefix,
        certBgImage: finalBgUrl,
        certSignature: signatureUrl.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // onSnapshot automatically updates setBatches with the new doc from Firestore
      showToast(`สร้างเกียรติบัตรเรียบร้อยแล้ว จำนวน ${parsedNames.length} ใบ (รันเลขที่ ${formatCertNumber(startNumber)} ถึง ${formatCertNumber(endNum)})`);
      setIsCreatingNew(false);
      setRosterInput('');
    } catch (err: any) {
      console.error('Error generating certificate batch:', err);
      const errMsg = err?.message || '';
      if (errMsg.includes('exceeds the maximum allowed size') || errMsg.includes('cannot be written because its size')) {
        showToast('ไฟล์ภาพพื้นหลังหรือข้อมูลชุดเกียรติบัตรมีขนาดเกินขีดจำกัดฐานข้อมูล (1MB) กรุณาใช้รูปภาพขนาดเล็กลง');
      } else {
        showToast('เกิดข้อผิดพลาดในการบันทึกชุดเกียรติบัตร');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Delete Batch with ConfirmModal
  const handleRequestDeleteBatch = (batch: CertificateBatch) => {
    setBatchToDelete(batch);
  };

  const handleConfirmDeleteBatch = async () => {
    if (!batchToDelete?.id) return;
    const targetId = batchToDelete.id;
    const targetTitle = batchToDelete.courseTitle;
    setBatchToDelete(null);

    // Optimistic UI update
    setBatches(prev => prev.filter(b => b.id !== targetId));
    if (inspectingBatch?.id === targetId) {
      setInspectingBatch(null);
    }

    try {
      await deleteDoc(doc(db, 'certificates', targetId));
      showToast(`ลบชุดเกียรติบัตร "${targetTitle}" เรียบร้อยแล้ว`);
    } catch (err) {
      console.error('Error deleting certificate batch:', err);
      showToast('เกิดข้อผิดพลาดในการลบชุดเกียรติบัตร');
    }
  };

  // Delete Individual Recipient from inspecting batch
  const handleDeleteRecipientFromBatch = async (recipientId: string) => {
    if (!inspectingBatch?.id) return;
    const updatedRecipients = inspectingBatch.recipients.filter(r => r.id !== recipientId);
    const updatedBatch: CertificateBatch = {
      ...inspectingBatch,
      recipients: updatedRecipients,
      totalCount: updatedRecipients.length
    };

    setInspectingBatch(updatedBatch);
    if (previewRecipient?.id === recipientId) {
      setPreviewRecipient(updatedRecipients[0] || null);
    }
    if (editingRecipient?.id === recipientId) {
      setEditingRecipient(null);
    }
    setBatches(prev => prev.map(b => b.id === inspectingBatch.id ? updatedBatch : b));

    try {
      await updateDoc(doc(db, 'certificates', inspectingBatch.id), {
        recipients: updatedRecipients,
        totalCount: updatedRecipients.length
      });
      showToast('ลบรายชื่อออกจากชุดเกียรติบัตรเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Error updating recipients in batch:', err);
      showToast('เกิดข้อผิดพลาดในการลบรายชื่อ');
    }
  };

  // Start editing an individual recipient's details (Name, School, Dates, Certificate Number)
  const handleStartEditRecipient = (recipient: CertificateRecipient) => {
    if (!inspectingBatch) return;
    setEditingRecipient(recipient);
    setPreviewRecipient(recipient);
    setEditName(recipient.name || '');
    setEditSchool(recipient.school || inspectingBatch.defaultSchool || '');
    setEditCertNumber(toArabicNumerals(recipient.certNumber || ''));
    setEditTrainingDate(recipient.trainingDate || inspectingBatch.trainingDate || '');
    setEditIssueDate(recipient.issueDate || inspectingBatch.issueDate || '');
  };

  // Save edited individual recipient details to Firestore
  const handleSaveRecipientEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingBatch?.id || !editingRecipient) return;
    if (!editName.trim()) {
      showToast('กรุณาระบุชื่อ-นามสกุลผู้ได้รับเกียรติบัตร');
      return;
    }

    setIsSavingEdit(true);
    const normalizedCertNo = toArabicNumerals(editCertNumber.trim());
    const updatedRecipient: CertificateRecipient = {
      ...editingRecipient,
      name: editName.trim(),
      school: editSchool.trim(),
      certNumber: normalizedCertNo,
      trainingDate: editTrainingDate.trim(),
      issueDate: editIssueDate.trim(),
    };

    const updatedRecipients = (inspectingBatch.recipients || []).map(r =>
      r.id === editingRecipient.id ? updatedRecipient : r
    );

    const updatedBatch: CertificateBatch = {
      ...inspectingBatch,
      recipients: updatedRecipients,
    };

    setInspectingBatch(updatedBatch);
    setPreviewRecipient(updatedRecipient);
    setBatches(prev => prev.map(b => b.id === inspectingBatch.id ? updatedBatch : b));

    try {
      await updateDoc(doc(db, 'certificates', inspectingBatch.id), {
        recipients: updatedRecipients
      });
      setEditingRecipient(null);
      showToast(`บันทึกการแก้ไขข้อมูลเกียรติบัตรของ "${updatedRecipient.name}" เรียบร้อยแล้ว`);
    } catch (err) {
      console.error('Error updating individual recipient:', err);
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูลรายบุคคล');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 font-bold flex items-center gap-2 shadow-xs animate-fadeIn">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-amber-200 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500 fill-amber-400" />
            <span>จัดการและสร้างเกียรติบัตร (Certificate Batch Generator)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            สร้างเกียรติบัตร 1 ชื่อ ต่อ 1 ใบ พร้อมรันเลขเกียรติบัตรที่มุมบนขวา และเชื่อมโยงวันที่จัดอบรมและวันที่ออกเกียรติบัตร
          </p>
        </div>

        <button
          onClick={() => setIsCreatingNew(!isCreatingNew)}
          className="btn-gamified-primary px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreatingNew ? 'ปิดแบบฟอร์มสร้าง' : '+ สร้างชุดเกียรติบัตรใหม่'}</span>
        </button>
      </div>

      {/* CREATE NEW CERTIFICATE BATCH FORM */}
      {isCreatingNew && (
        <div className="p-6 rounded-3xl bg-white border-2 border-orange-200 shadow-lg space-y-6 animate-scaleUp">
          <div className="flex items-center justify-between pb-3 border-b border-orange-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="font-extrabold text-slate-800 text-base">
                แบบฟอร์มสร้างชุดเกียรติบัตร (1 ชื่อ ต่อ 1 ใบ)
              </h3>
            </div>
            <button
              onClick={() => setIsCreatingNew(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleGenerateCertificates} className="space-y-5 text-xs">
            
            {/* Row 1: Course Title */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                หลักสูตรการอบรม *
              </label>
              {courses.length > 0 ? (
                <div className="space-y-2">
                  <select
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 font-bold text-slate-800"
                  >
                    {courses.map((c, idx) => (
                      <option key={`${c.id || c.title}-${idx}`} value={c.title}>
                        {c.title}
                      </option>
                    ))}
                    <option value="other">-- ระบุชื่อหลักสูตรอื่นด้วยตนเอง --</option>
                  </select>
                  {courseTitle === 'other' && (
                    <input
                      type="text"
                      placeholder="พิมพ์ชื่อหลักสูตรที่นี่..."
                      onChange={(e) => setCourseTitle(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-orange-300 focus:outline-none font-medium"
                    />
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  required
                  placeholder="เช่น การประยุกต์ใช้ AI เพื่อพัฒนาการจัดการเรียนรู้..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 font-bold"
                />
              )}
            </div>

            {/* School Input (Requirement 1: ในเมนูสร้างเกียรติบัตร เพิ่มช่องให้กรอกข้อมูลโรงเรียนด้วย) */}
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5 text-xs sm:text-sm">
                <Building2 className="w-4 h-4 text-orange-600" />
                <span>โรงเรียน / หน่วยงานต้นสังกัด * (จะถูกนำไปลงในเกียรติบัตร)</span>
              </label>
              <input
                type="text"
                value={defaultSchool}
                onChange={(e) => setDefaultSchool(e.target.value)}
                required
                placeholder="เช่น โรงเรียนอนุบาลสวรรคโลก หรือ สำนักงานเขตพื้นที่การศึกษาประถมศึกษาสุโขทัย เขต ๒"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 font-bold text-slate-800"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                จะแสดงผลเป็นชื่อโรงเรียนใต้ชื่อ-สกุลผู้ได้รับเกียรติบัตร (หากมีหลายโรงเรียน สามารถระบุในช่องรายชื่อด้านล่างแบบ "ชื่อ-สกุล | โรงเรียน" ได้)
              </span>
            </div>

            {/* Row 2: Training Date & Issue Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80">
              <div>
                <label className="block font-bold text-amber-950 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <span>วันที่จัดอบรม * (ลิงก์ลงในเกียรติบัตร)</span>
                </label>
                <input
                  type="text"
                  value={trainingDate}
                  onChange={(e) => setTrainingDate(e.target.value)}
                  required
                  placeholder="เช่น วันที่ ๑๕ พฤศจิกายน ๒๕๖๙"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 font-medium text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
                <span className="text-[10px] text-amber-800/80 mt-1 block">
                  จะแสดงผลในข้อความ: "...ได้ผ่านการอบรมเชิงปฏิบัติการ... [วันที่จัดอบรม]"
                </span>
              </div>

              <div>
                <label className="block font-bold text-amber-950 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <span>วันที่ออกเกียรติบัตร * (ลิงก์ลงในเกียรติบัตร)</span>
                </label>
                <input
                  type="text"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                  placeholder="เช่น ให้ไว้ ณ วันที่ ๑๕ พฤศจิกายน พุทธศักราช ๒๕๖๙"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 font-medium text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
                <span className="text-[10px] text-amber-800/80 mt-1 block">
                  จะแสดงผลบริเวณท้ายเกียรติบัตร: "[วันที่ออกเกียรติบัตร]"
                </span>
              </div>
            </div>

            {/* Row 3: Running Certificate Number Configuration */}
            <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-orange-950 text-xs sm:text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-orange-600" />
                  <span>กำหนดการรันเลขที่เกียรติบัตร (มุมบนขวา - 1 เลข ต่อ 1 ชื่อ)</span>
                </span>
                <span className="text-[11px] font-bold text-orange-800 bg-orange-100 px-2.5 py-0.5 rounded-full">
                  ตัวอย่าง: {formatCertNumber(startNumber)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">คำขึ้นต้นเลขที่ (Prefix - เลขอารบิก)</label>
                  <input
                    type="text"
                    value={certPrefix}
                    onChange={(e) => setCertPrefix(toArabicNumerals(e.target.value))}
                    placeholder="เช่น สพป.สท.2-ว"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-orange-300 font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">เลขเริ่มต้น (Start No.)</label>
                  <input
                    type="number"
                    min="1"
                    value={startNumber}
                    onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-orange-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">คำต่อท้าย (Suffix - เลขอารบิก)</label>
                  <input
                    type="text"
                    value={yearSuffix}
                    onChange={(e) => setYearSuffix(toArabicNumerals(e.target.value))}
                    placeholder="เช่น /2569"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-orange-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>
            </div>

            {/* Row 4: Signatory, Digital Signature Upload, Logo (100%), & Full HD Background Template */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* 1. Signatory */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>ผู้ลงนามรับรอง (คนเดียว - ผอ.เขต)</span>
                </h4>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">ชื่อ-นามสกุล ผู้ลงนาม</label>
                  <input
                    type="text"
                    value={directorName}
                    onChange={(e) => setDirectorName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-bold text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">ตำแหน่ง</label>
                  <input
                    type="text"
                    value={directorPosition}
                    onChange={(e) => setDirectorPosition(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* 2. Digital Signature Upload (Requirement 5: อัปโหลดลายเซ็นต์ของผู้ลงนาม) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-orange-600" />
                    <span>ลายเซ็นต์ดิจิทัลผู้ลงนาม</span>
                  </h4>
                  {signatureUrl && (
                    <button
                      type="button"
                      onClick={() => setSignatureUrl('')}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                    >
                      ลบลายเซ็นต์
                    </button>
                  )}
                </div>

                {signatureUrl ? (
                  <div className="p-2.5 rounded-xl bg-white border border-orange-200 flex items-center gap-3">
                    <div className="w-16 h-10 bg-slate-50 border border-slate-200 rounded flex items-center justify-center p-1">
                      <img
                        src={signatureUrl}
                        alt="Signature Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="flex-1 text-[10px]">
                      <span className="font-bold text-emerald-700 block">มีลายเซ็นต์ดิจิทัลพร้อมใช้</span>
                      <span className="text-slate-500">แสดงผลเหนือชื่อผู้ลงนาม</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-dashed border-amber-300 text-center text-[10.5px] text-amber-800">
                    ยังไม่ได้อัปโหลดลายเซ็นต์ (จะเว้นบรรทัดสำหรับลงนามด้วยมือ)
                  </div>
                )}

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    อัปโหลดไฟล์ลายเซ็นต์ (PNG โปร่งใส / JPG)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureUpload}
                    className="w-full p-1.5 text-xs rounded-xl bg-white border border-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-orange-100 file:text-orange-800 cursor-pointer"
                  />
                  <span className="text-[9.5px] text-slate-500 mt-1 block">
                    แนะนำไฟล์ PNG พื้นหลังโปร่งใส เพื่อความสวยงามบนเกียรติบัตร
                  </span>
                </div>
              </div>

              {/* 3. Logo Upload (แสดงผลแบบ 100%) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-orange-600" />
                    <span>โลโก้บนเกียรติบัตร (100%)</span>
                  </h4>
                  {logoUrl !== '/assets/aistudio/LOGO_E-SPORT__18__733b26a9.png' && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('/assets/aistudio/LOGO_E-SPORT__18__733b26a9.png')}
                      className="text-[10px] text-orange-600 hover:text-orange-800 font-bold underline cursor-pointer"
                    >
                      ใช้ค่าเริ่มต้น
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-200">
                  <img
                    src={logoUrl || '/assets/aistudio/LOGO_E-SPORT__18__733b26a9.png'}
                    alt="Logo Preview"
                    className="w-14 h-14 object-contain rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs"
                  />
                  <div className="flex-1 text-[11px]">
                    <div className="font-bold text-slate-800">โลโก้ทางการ สพฐ. สพป.สุโขทัย 2</div>
                    <div className="text-[10px] text-emerald-600 font-medium">100% ตามไฟล์ที่อัปโหลดถาวร</div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    อัปโหลดไฟล์โลโก้ใหม่ (PNG / JPG)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="w-full p-1.5 text-xs rounded-xl bg-white border border-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-orange-100 file:text-orange-800 cursor-pointer"
                  />
                </div>
              </div>

              {/* 4. Background Template (Requirement 4: ความคมชัดสูง Full HD 1920x1358) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-orange-600" />
                    <span>พื้นหลังแม่แบบ (Full HD)</span>
                  </h4>
                  {bgImageUrl && (
                    <button
                      type="button"
                      onClick={() => setBgImageUrl('')}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                    >
                      ลบภาพพื้นหลัง
                    </button>
                  )}
                </div>

                {bgImageUrl ? (
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-200">
                    <img
                      src={bgImageUrl}
                      alt="Certificate Template Preview"
                      className="w-14 h-10 object-cover rounded-lg border border-slate-300 shadow-2xs"
                    />
                    <div className="flex-1 text-[10px]">
                      <div className="font-bold text-slate-800">แม่แบบ Full HD คมชัดสูง</div>
                      <div className="text-emerald-600 font-medium">
                        1920x1358 ({Math.round((bgImageUrl.length * 0.75) / 1024)} KB)
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-amber-50/70 border border-dashed border-amber-300 text-center text-[10px] text-amber-800">
                    ใช้ลวดลายขอบทองมาตรฐาน (คมชัดระดับ Full HD)
                  </div>
                )}

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    อัปโหลดภาพพื้นหลัง Full HD
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBgUpload}
                    className="w-full p-1.5 text-xs rounded-xl bg-white border border-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-orange-100 file:text-orange-800 cursor-pointer"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={bgImageUrl}
                    onChange={(e) => setBgImageUrl(e.target.value)}
                    placeholder="หรือระบุ URL รูปภาพ Full HD..."
                    className="w-full px-2.5 py-1 rounded-xl bg-white border border-slate-300 text-[11px] focus:outline-none font-mono"
                  />
                </div>
              </div>

            </div>

            {/* Row 5: Roster Input (1 Line = 1 Name) */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Users className="w-4 h-4 text-orange-600" />
                  <span>รายชื่อผู้มีสิทธิ์ได้รับเกียรติบัตร * (1 บรรทัด = 1 รายชื่อ ต่อเกียรติบัตร 1 ใบ)</span>
                </label>

                <button
                  type="button"
                  onClick={handleImportFromRegistrations}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition flex items-center gap-1 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-orange-600" />
                  <span>ดึงรายชื่อจากผู้ลงทะเบียนที่ยืนยันแล้ว ({registrations.filter(r => r.status === 'confirmed').length} ท่าน)</span>
                </button>
              </div>

              <textarea
                value={rosterInput}
                onChange={(e) => setRosterInput(e.target.value)}
                rows={6}
                required
                placeholder="พิมพ์หรือวางรายชื่อที่นี่ เช่น&#10;นายรักเรียน มุ่งมั่นวิชา | โรงเรียนบ้านสวรรคโลก&#10;นางสาวกานดา ใจดี | โรงเรียนเมืองสุโขทัย&#10;นายสุรชัย พัฒนาการศึกษา"
                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 leading-relaxed"
              />

              {/* Roster Live Summary */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2">
                <div>
                  จำนวนรายชื่อที่ตรวจพบ: <strong className="text-orange-600 text-sm">{parsedNames.length}</strong> ท่าน
                </div>
                {parsedNames.length > 0 && (
                  <div className="font-mono text-[11px] text-slate-700">
                    ช่วงเลขที่ที่จะออก: <strong className="text-emerald-700 font-bold">{formatCertNumber(startNumber)}</strong> ถึง <strong className="text-emerald-700 font-bold">{formatCertNumber(startNumber + parsedNames.length - 1)}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isGenerating || parsedNames.length === 0}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGenerating ? 'กำลังสร้างเกียรติบัตร...' : 'สร้างเกียรติบัตร (Generate Certificates)'}</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* LIST OF CREATED CERTIFICATE BATCHES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-600" />
            <span>รายการชุดเกียรติบัตรที่สร้างแล้วในระบบ ({batches.length} ชุด)</span>
          </h3>
          <span className="text-xs text-slate-400">
            เฉพาะเกียรติบัตรที่สร้างจากที่นี่เท่านั้นที่จะแสดงในหน้าดาวน์โหลดของประชาชน
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
            กำลังโหลดข้อมูลชุดเกียรติบัตร...
          </div>
        ) : batches.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-2">
            <Award className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">ยังไม่มีชุดเกียรติบัตรที่สร้างในระบบ</p>
            <p className="text-slate-400">
              คลิกที่ปุ่ม "+ สร้างชุดเกียรติบัตรใหม่" ด้านบนเพื่อเริ่มสร้างเกียรติบัตรและรันเลขที่ให้กับผู้ผ่านการอบรม
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {batches.map((batch, idx) => (
              <div 
                key={`${batch.id || 'batch'}-${idx}`}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-amber-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                      <Award className="w-3 h-3 text-amber-600 fill-amber-500" />
                      <span>{batch.totalCount || batch.recipients?.length || 0} ใบ</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-orange-50 text-orange-800 border border-orange-200">
                      เลขที่: {batch.certPrefix} {String(batch.startNumber).padStart(3, '0')} - {String(batch.endNumber).padStart(3, '0')}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-slate-800 text-base">
                    {batch.courseTitle}
                  </h4>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-orange-600" />
                      <strong>วันอบรม:</strong> {batch.trainingDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      <strong>วันออก:</strong> {batch.issueDate}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    ผู้ลงนาม: {batch.directorName} ({batch.directorPosition})
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end">
                  <button
                    onClick={() => {
                      setInspectingBatch(batch);
                      setInspectSearch('');
                      setPreviewRecipient(batch.recipients?.[0] || null);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-600" />
                    <span>ตรวจสอบรายชื่อ ({batch.recipients?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => handleRequestDeleteBatch(batch)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition cursor-pointer"
                    title="ลบชุดเกียรติบัตรนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* INSPECT ROSTER & PREVIEW MODAL */}
      {inspectingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-4 border-amber-100 relative">
            
            <button
              onClick={() => {
                setInspectingBatch(null);
                setEditingRecipient(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 pb-3 border-b border-amber-100 mb-4">
              <Award className="w-6 h-6 text-amber-500 fill-amber-400" />
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">
                  ตรวจสอบและแก้ไขรายชื่อเกียรติบัตร: {inspectingBatch.courseTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  วันอบรม: {inspectingBatch.trainingDate} | วันที่ออก: {inspectingBatch.issueDate} (สามารถกดปุ่ม "แก้ไข" เพื่อแก้ไข ชื่อ โรงเรียน วันที่ และเลขที่ เป็นรายบุคคลได้)
                </p>
              </div>
            </div>

            {/* Search within batch */}
            <div className="mb-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inspectSearch}
                onChange={(e) => setInspectSearch(e.target.value)}
                placeholder="ค้นหาชื่อ โรงเรียน หรือเลขที่เกียรติบัตรในชุดนี้..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* INDIVIDUAL RECIPIENT EDIT FORM PANEL */}
            {editingRecipient && (
              <form
                onSubmit={handleSaveRecipientEdit}
                className="mb-6 p-5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 shadow-md space-y-4 animate-fadeIn"
              >
                <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-orange-600" />
                    <span className="font-extrabold text-xs sm:text-sm text-slate-800">
                      แก้ไขรายละเอียดเกียรติบัตรรายบุคคล: <strong className="text-orange-700">{editingRecipient.name}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingRecipient(null)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-amber-100 transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ชื่อ-นามสกุล ผู้ได้รับเกียรติบัตร *</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">โรงเรียน / หน่วยงานต้นสังกัด *</label>
                    <input
                      type="text"
                      value={editSchool}
                      onChange={(e) => setEditSchool(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">เลขที่เกียรติบัตร (เลขอารบิก) *</label>
                    <input
                      type="text"
                      value={editCertNumber}
                      onChange={(e) => setEditCertNumber(toArabicNumerals(e.target.value))}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 font-mono font-bold text-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">วันที่จัดอบรม (เฉพาะบุคคลนี้)</label>
                    <input
                      type="text"
                      value={editTrainingDate}
                      onChange={(e) => setEditTrainingDate(e.target.value)}
                      placeholder="เช่น วันที่ 15 พฤศจิกายน 2569"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">วันที่ออกเกียรติบัตร (เฉพาะบุคคลนี้)</label>
                    <input
                      type="text"
                      value={editIssueDate}
                      onChange={(e) => setEditIssueDate(e.target.value)}
                      placeholder="เช่น ให้ไว้ ณ วันที่ 15 พฤศจิกายน พุทธศักราช 2569"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingRecipient(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-amber-100 transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขรายบุคคล'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Recipients Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 mb-6">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">ลำดับ</th>
                    <th className="p-3">เลขที่เกียรติบัตร (เลขอารบิก)</th>
                    <th className="p-3">ชื่อ-นามสกุล</th>
                    <th className="p-3">โรงเรียนต้นสังกัด</th>
                    <th className="p-3">วันที่อบรม / วันที่ออก</th>
                    <th className="p-3 text-center">พรีวิว / แก้ไข / จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(inspectingBatch.recipients || [])
                    .filter(r =>
                      r.name.toLowerCase().includes(inspectSearch.toLowerCase()) ||
                      toArabicNumerals(r.certNumber).includes(inspectSearch) ||
                      (r.school || '').toLowerCase().includes(inspectSearch.toLowerCase())
                    )
                    .map((item, idx) => (
                      <tr key={`${item.id || 'recip'}-${idx}`} className="hover:bg-amber-50/50 transition">
                        <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-orange-700">{toArabicNumerals(item.certNumber)}</td>
                        <td className="p-3 font-bold text-slate-800">{item.name}</td>
                        <td className="p-3 text-slate-600">{item.school || inspectingBatch.defaultSchool}</td>
                        <td className="p-3 text-[11px] text-slate-500">
                          <div>{item.trainingDate || inspectingBatch.trainingDate}</div>
                          <div className="text-[10px] text-slate-400">{item.issueDate || inspectingBatch.issueDate}</div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewRecipient(item)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 transition cursor-pointer"
                            >
                              ดูเกียรติบัตร
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEditRecipient(item)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition flex items-center gap-1 cursor-pointer"
                              title="แก้ไข ชื่อ โรงเรียน วันที่ เลขที่ ของบุคคลนี้"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>แก้ไข</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRecipientFromBatch(item.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="ลบรายชื่อนี้ออกจากชุด"
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

            {/* Individual Certificate Preview Container */}
            {previewRecipient && (
              <div className="p-4 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-800">
                    ตัวอย่างเกียรติบัตร A4 ของ: <strong className="text-orange-900 font-black">{previewRecipient.name}</strong>
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleStartEditRecipient(previewRecipient)}
                      className="px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4 text-blue-600" />
                      <span>แก้ไขข้อมูลใบนี้</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAdminDownloadPdf}
                      disabled={isAdminDownloadingPdf}
                      className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isAdminDownloadingPdf ? (
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
                      onClick={() => {
                        if (!previewRecipient || !adminCertRef.current) return;
                        printCertificate(adminCertRef.current, previewRecipient.name, setIsAdminDownloadingPdf);
                      }}
                      className="px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white hover:bg-orange-50 text-slate-700 border border-slate-300 shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                      title="สั่งพิมพ์ผ่านเครื่องพิมพ์ (Print)"
                    >
                      <Printer className="w-4 h-4 text-slate-600" />
                      <span className="hidden sm:inline">พิมพ์</span>
                    </button>
                  </div>
                </div>

                {/* Printable A4 Certificate Canvas (ขนาด A4 แนวนอน 840x594 พอดีกรอบ ไม่ล้นขอบ) */}
                <div className="overflow-x-auto pb-4 flex justify-center">
                  <div 
                    ref={adminCertRef}
                    id="certificate-print-area"
                    className="certificate-print-area w-[840px] h-[594px] min-w-[840px] min-h-[594px] max-w-[840px] max-h-[594px] shrink-0 bg-white rounded-2xl shadow-2xl border-8 border-amber-300 px-10 pt-2 pb-2 relative flex flex-col justify-between text-center select-none overflow-hidden box-border"
                    style={{
                      backgroundImage: inspectingBatch.bgImageUrl ? `url(${inspectingBatch.bgImageUrl})` : undefined,
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
                        เลขที่: {toArabicNumerals(previewRecipient.certNumber)}
                      </span>
                    </div>

                    {/* Top & Center Unified Flow so Recipient Name is strictly centered between Award line and School */}
                    <div className="relative z-10 flex flex-col items-center">
                      <img
                        src={inspectingBatch.logoUrl || '/assets/aistudio/LOGO_E-SPORT__18__733b26a9.png'}
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
                        {previewRecipient.name}
                      </h2>

                      <p className="font-sarabun cert-recipient-school text-[21.5px] font-bold text-[#162f56] mt-0 mb-1 leading-[1.06]">
                        {previewRecipient.school || inspectingBatch.defaultSchool}
                      </p>

                      <div className="flex flex-col items-center justify-center space-y-0.5">
                        <p className="font-sarabun cert-course-desc cert-text-thai text-[20.4px] font-semibold text-slate-900 max-w-[790px] mx-auto leading-[1.05] text-center px-1">
                          ได้ผ่านการอบรมเชิงปฏิบัติการการพัฒนาทักษะทางด้านเทคโนโลยีดิจิทัล และปัญญาประดิษฐ์ (AI) เพื่อการศึกษา
                        </p>
                        <p className="font-sarabun cert-course-title text-[23.4px] font-bold text-[#0a2540] leading-[1.05]">
                          หลักสูตร{inspectingBatch.courseTitle}
                        </p>
                        
                        {/* Training Date (supports individual override) */}
                        <p className="font-sarabun cert-date-text text-[20.4px] font-semibold text-slate-900 leading-[1.05]">
                          {previewRecipient.trainingDate || inspectingBatch.trainingDate}
                        </p>

                        {/* Issue Date (supports individual override) */}
                        <p className="font-sarabun cert-date-text text-[20.4px] font-semibold text-slate-900 leading-[1.05]">
                          {previewRecipient.issueDate || inspectingBatch.issueDate}
                        </p>
                      </div>
                    </div>

                    {/* Bottom: Signatory (เพิ่มขนาดลายเซ็นต์ให้ใหญ่ขึ้นอีก 20% และขยายข้อความ +20% ลดระยะห่างบรรทัด) */}
                    <div
                      className="relative z-10 flex flex-col items-center justify-center cert-signatory-container"
                      style={{ fontStyle: 'normal', lineHeight: '39px', marginBottom: '23.2283px' }}
                    >
                      {inspectingBatch.signatureUrl ? (
                        <img 
                          src={inspectingBatch.signatureUrl} 
                          alt="ลายเซ็นต์ผู้ลงนาม" 
                          className="h-[105.6px] max-w-[372px] object-contain -mt-1.5 -mb-4 z-10 pointer-events-none drop-shadow-xs cert-signature-img"
                        />
                      ) : null}
                      <h4
                        className="font-sarabun cert-signatory-name font-black text-[19.5px] text-slate-950 mt-0"
                        style={{ lineHeight: '29.67px', height: '23.6667px' }}
                      >
                        ({inspectingBatch.directorName})
                      </h4>
                      <p
                        className="font-sarabun cert-signatory-pos text-[17px] font-semibold text-slate-800"
                        style={{ lineHeight: '26.02px', height: '45.0208px' }}
                      >
                        {inspectingBatch.directorPosition}
                      </p>
                    </div>

                    {/* Certificate Identification Footer (ขยาย +20%) */}
                    <div className="relative z-10 flex items-center justify-between text-[13.5px] text-slate-700 pt-0.5 border-t border-amber-300 font-sarabun cert-footer-info font-bold leading-none">
                      <span>เลขที่: {toArabicNumerals(previewRecipient.certNumber)}</span>
                      <span>ระบบรับรองเกียรติบัตรอิเล็กทรอนิกส์ สพป.สุโขทัย เขต 2</span>
                    </div>

                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Confirmation Modal for Batch Deletion */}
      <ConfirmModal
        isOpen={!!batchToDelete}
        title="ยืนยันการลบชุดเกียรติบัตร"
        message={`ต้องการลบชุดเกียรติบัตร "${batchToDelete?.courseTitle || ''}" (จำนวน ${batchToDelete?.totalCount || 0} ใบ) ใช่หรือไม่? ข้อมูลจะถูกลบออกจากฐานข้อมูลและจะไม่ปรากฏในหน้าดาวน์โหลดของประชาชน`}
        confirmText="ยืนยันลบชุดเกียรติบัตร"
        cancelText="ยกเลิก"
        isDanger={true}
        onConfirm={handleConfirmDeleteBatch}
        onCancel={() => setBatchToDelete(null)}
      />

    </div>
  );
};
