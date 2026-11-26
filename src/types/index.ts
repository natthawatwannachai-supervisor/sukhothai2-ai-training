export interface AdminUser {
  uid: string;
  username: string; // 'Admin01' | 'Admin02' | 'Admin03'
  name: string;
  position: string;
  email?: string;
  role: 'admin' | 'superadmin';
  profilePic?: string;
  updatedAt?: string;
}

export interface Course {
  id?: string;
  title: string;
  details: string;
  tools: string;
  benefits: string;
  trainingDate?: string;
  duration?: string;
  location?: string;
  maxSeats?: number;
  currentSeats?: number;
  status: 'open' | 'closed' | 'draft';
  createdAt?: string;
}

export interface Registration {
  id?: string;
  name: string;
  school: string;
  district: string;
  phone: string;
  lineId: string;
  trainingDate: string;
  trainingTime?: string;
  courseId: string;
  courseTitle?: string;
  suggestions?: string;
  status?: 'confirmed' | 'pending' | 'cancelled';
  calendarEventId?: string;
  createdAt?: string;
}

export interface Survey {
  id?: string;
  courseId: string;
  courseTitle?: string;
  trainingDate: string;
  gender: string;
  ageRange: string;
  district: string;
  position: string;
  // 10 Likert-scale questions (1-5)
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  q6: number;
  q7: number;
  q8: number;
  q9: number;
  q10: number;
  impression: string;
  suggestion: string;
  createdAt?: string;
}

export interface PRNews {
  id?: string;
  title: string;
  content: string;
  imageUrl?: string;
  driveUrl?: string;
  publishedDate?: string;
  author?: string;
  createdAt?: string;
}

export interface CertificateRecipient {
  id: string;
  certNumber: string; // e.g. สพป.สท.2-ว 001/2569
  name: string;
  school?: string;
  trainingDate?: string; // วันที่จัดอบรมรายบุคคล (optional override)
  issueDate?: string; // วันที่ออกเกียรติบัตรรายบุคคล (optional override)
}

export interface CertificateBatch {
  id?: string;
  courseTitle: string;
  courseId?: string;
  trainingDate: string; // วันที่จัดอบรม
  issueDate: string; // วันที่ออกเกียรติบัตร
  certPrefix: string; // คำขึ้นต้น เช่น สพป.สท.๒-ว
  startNumber: number; // เลขเริ่มต้น เช่น 1
  endNumber: number; // เลขสิ้นสุด เช่น 45
  directorName: string;
  directorPosition: string;
  defaultSchool?: string;
  logoUrl?: string; // Custom uploaded logo for certificate (100%)
  signatureUrl?: string; // Digital signature of the director (PNG)
  bgImageUrl?: string;
  recipients: CertificateRecipient[]; // รายชื่อพร้อมเลขที่เกียรติบัตร
  totalCount: number;
  createdAt?: string;
  createdBy?: string;
}

export interface CertificateRecord {
  id?: string;
  courseId: string;
  courseTitle: string;
  trainingDate: string;
  issueDate?: string;
  bgImageUrl?: string;
  signatoryName?: string;
  signatoryPosition?: string;
  rosterList: string[]; // names of approved attendees
  createdAt?: string;
}

export interface Speaker {
  id: string;
  name: string;
  position: string;
  role: string;
  bio: string;
  imageUrl: string;
  videoUrl?: string;
  topics: string[];
}
