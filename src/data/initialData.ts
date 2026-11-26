import { Course, PRNews, Speaker } from '../types';

export const INITIAL_SPEAKERS: Speaker[] = [
  {
    id: 'spk-1',
    name: 'นายฐิติวัฒน์ จัดดี',
    position: 'ศึกษานิเทศก์ชำนาญการ หัวหน้ากลุ่มงาน',
    role: 'หัวหน้ากลุ่มงานส่งเสริมพัฒนาสื่อ นวัตกรรมและเทคโนโลยีทางการศึกษา',
    bio: 'ผู้เชี่ยวชาญด้านการนำปัญญาประดิษฐ์ (Generative AI) มาประยุกต์ใช้ในการจัดกระบวนการเรียนรู้ การออกแบบแผนการสอนอัจฉริยะ และการสร้างสรรค์นวัตกรรมการศึกษาแห่งอนาคต',
    imageUrl: '/assets/aistudio/Man_gesturing_with_hands_1080p_20261021122638_245a03a5.mp4',
    videoUrl: '/assets/aistudio/Man_gesturing_with_hands_1080p_20261021122638_245a03a5.mp4',
    topics: ['Prompt Engineering for Teachers', 'Generative AI & LLM in Education', 'AI Lesson Planner']
  },
  {
    id: 'spk-2',
    name: 'นางสาวกันยารัตน์ เมธาวงศ์',
    position: 'ศึกษานิเทศก์ชำนาญการ',
    role: 'กลุ่มงานส่งเสริมพัฒนาสื่อ นวัตกรรมและเทคโนโลยีทางการศึกษา',
    bio: 'ผู้เชี่ยวชาญการออกแบบสื่อดิจิทัลกราฟิก การผลิตสื่อการสอนมัลติมีเดียด้วย Canva Magic Studio และการวัดผลประเมินผลแบบ Active Learning ในยุคดิจิทัล',
    imageUrl: '/assets/aistudio/Woman_making_hand_gestures_1080p_20261021122432_88684b5a.mp4',
    videoUrl: '/assets/aistudio/Woman_making_hand_gestures_1080p_20261021122432_88684b5a.mp4',
    topics: ['Canva Magic AI for Classroom', 'Digital Active Learning', 'Digital Assessment & Analytics']
  },
  {
    id: 'spk-3',
    name: 'นายณัฐวัฒน์ วรรณชัย',
    position: 'ศึกษานิเทศก์ชำนาญการ',
    role: 'กลุ่มนิเทศ ติดตาม และประเมินผลการจัดการศึกษา',
    bio: 'ผู้เชี่ยวชาญด้านโครงสร้างพื้นฐานดิจิทัล คลาวด์เพื่อการศึกษา (Google Workspace / MS 365) และการบริหารจัดการห้องเรียนอัจฉริยะด้วย AI Automation',
    imageUrl: '/assets/aistudio/Man_giving_thumbs_up_1080p_20261021133050_e97012e3.mp4',
    videoUrl: '/assets/aistudio/Man_giving_thumbs_up_1080p_20261021133050_e97012e3.mp4',
    topics: ['Smart Classroom & Cloud Management', 'AI Productivity Tools', 'Cyber Security & Ethics for Educators']
  }
];

// Clean empty arrays ready for production live use (Requirement 10)
export const INITIAL_COURSES: Course[] = [];
export const INITIAL_PR_NEWS: PRNews[] = [];

export const STEPS = [
  {
    step: 1,
    title: 'เลือกและศึกษาหลักสูตร',
    desc: 'เข้าสู่เมนู "ข้อมูลหลักสูตร" เพื่อศึกษารายละเอียด วัตถุประสงค์ เครื่องมือ และรอบการจัดอบรม',
    icon: 'BookOpen'
  },
  {
    step: 2,
    title: 'ตรวจสอบปฏิทินที่ว่าง',
    desc: 'ตรวจสอบตารางการจัดอบรมและวันที่ยังเปิดรับผ่านระบบปฏิทินออนไลน์แบบเรียลไทม์',
    icon: 'Calendar'
  },
  {
    step: 3,
    title: 'กรอกข้อมูลลงทะเบียน',
    desc: 'กรอกชื่อ-สกุล โรงเรียน สังกัดอำเภอ เบอร์โทรศัพท์ และ Line ID ให้ครบถ้วน',
    icon: 'UserCheck'
  },
  {
    step: 4,
    title: 'ตรวจสอบและยืนยันข้อมูล',
    desc: 'ระบบจะแสดงหน้าต่าง 3D ป็อปอัปให้ท่านตรวจสอบความถูกต้องของข้อมูลก่อนกดยืนยัน',
    icon: 'CheckCircle2'
  },
  {
    step: 5,
    title: 'เข้าร่วมการอบรมเชิงปฏิบัติการ',
    desc: 'เข้าร่วมอบรมตามวัน เวลา และสถานที่ หรือระบบออนไลน์ Zoom ที่กำหนด พร้อมลงมือปฏิบัติจริง',
    icon: 'Laptop'
  },
  {
    step: 6,
    title: 'ส่งชิ้นงานและผลการปฏิบัติ',
    desc: 'นำเสนอผลงานหรือสื่อการสอนที่พัฒนาด้วย AI ระหว่างการอบรมตามคำแนะนำของวิทยากร',
    icon: 'UploadCloud'
  },
  {
    step: 7,
    title: 'ทำแบบสอบถามความพึงพอใจ',
    desc: 'ตอบแบบประเมินความพึงพอใจด้านเนื้อหาการอบรมในภาพรวม เพื่อสะท้อนข้อเสนอแนะในการพัฒนา',
    icon: 'HeartHandshake'
  },
  {
    step: 8,
    title: 'ดาวน์โหลดเกียรติบัตรออนไลน์',
    desc: 'ค้นหาชื่อของท่านในระบบ แล้วดาวน์โหลดไฟล์เกียรติบัตรขนาด A4 แนวนอนความละเอียดสูงได้ทันที',
    icon: 'Award'
  }
];
