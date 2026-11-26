import { db } from './firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';

export const ADMIN_NOTIFICATION_EMAILS = [
  'natthawat.wannachai@gmail.com',
  'krujaddee2521@gmail.com',
  'khuntangmokfc@gmail.com',
];

export const EMAIL_NOTIFICATION_SUBJECT = '📢 แจ้งเตือนการลงทะเบียนใหม่!';

export interface RegistrationEmailParams {
  name: string;
  school: string;
  trainingDate: string;
  courseTitle: string;
  district?: string;
  phone?: string;
  lineId?: string;
  trainingTime?: string;
}

export interface EmailConfigSettings {
  smtpUser?: string;
  smtpPass?: string;
  webhookUrl?: string;
  enabled?: boolean;
}

/**
 * Formats the exact notification body requested by the user:
 *
 * มีผู้ลงทะเบียนเข้ารับการอบรมในระบบเพิ่มเติม ดังนี้ครับ/ค่ะ
 *
 * 👤 ชื่อ-สกุล: [ชื่อผู้ลงทะเบียน]
 * 🏫 โรงเรียน: [ชื่อโรงเรียน]
 * 📅 วันที่ต้องการอบรม: [วันที่]
 * 📚 หลักสูตร: [ชื่อหลักสูตร]
 *
 * 📌 สามารถตรวจสอบข้อมูลและรายละเอียดเพิ่มเติมได้ที่ระบบ Admin Dashboard ครับ/ค่ะ
 */
export function buildEmailNotificationBody(params: RegistrationEmailParams): string {
  return `มีผู้ลงทะเบียนเข้ารับการอบรมในระบบเพิ่มเติม ดังนี้ครับ/ค่ะ\n\n👤 ชื่อ-สกุล: ${params.name}\n🏫 โรงเรียน: ${params.school}\n📅 วันที่ต้องการอบรม: ${params.trainingDate}\n📚 หลักสูตร: ${params.courseTitle}\n\n📌 สามารถตรวจสอบข้อมูลและรายละเอียดเพิ่มเติมได้ที่ระบบ Admin Dashboard ครับ/ค่ะ`;
}

/**
 * Builds a Gmail Compose URL pre-populated with all 3 recipients, subject, and body
 */
export function buildGmailComposeUrl(params: RegistrationEmailParams): string {
  const to = encodeURIComponent(ADMIN_NOTIFICATION_EMAILS.join(','));
  const su = encodeURIComponent(EMAIL_NOTIFICATION_SUBJECT);
  const body = encodeURIComponent(buildEmailNotificationBody(params));
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`;
}

/**
 * Sends a real-time email notification to:
 * 1. natthawat.wannachai@gmail.com
 * 2. krujaddee2521@gmail.com
 * 3. khuntangmokfc@gmail.com
 *
 * Uses multi-channel real-time dispatch:
 * - Backend `/api/notify-registration` (Nodemailer SMTP / Google Apps Script / Server relay)
 * - Client-side FormSubmit AJAX relay (`https://formsubmit.co/ajax/...`)
 * - Firestore `email_notifications` real-time collection for instant Admin Dashboard alert & audit log
 */
export async function sendRegistrationEmailNotification(
  params: RegistrationEmailParams
): Promise<{ ok: boolean; methods: string[] }> {
  const subject = EMAIL_NOTIFICATION_SUBJECT;
  const body = buildEmailNotificationBody(params);
  const methods: string[] = [];

  // Load optional custom SMTP / Webhook settings from Firestore if configured by Admin
  let emailConfig: EmailConfigSettings = {};
  try {
    const cfgSnap = await Promise.race([
      getDoc(doc(db, 'settings', 'email_config')),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
    ]);
    if (cfgSnap && cfgSnap.exists()) {
      emailConfig = cfgSnap.data() as EmailConfigSettings;
    }
  } catch {
    // Proceed with default channels
  }

  // 1. Record real-time notification in Firestore `email_notifications`
  const firestorePromise = (async () => {
    try {
      await Promise.race([
        addDoc(collection(db, 'email_notifications'), {
          subject,
          body,
          recipients: ADMIN_NOTIFICATION_EMAILS.join(', '),
          recipientList: ADMIN_NOTIFICATION_EMAILS,
          name: params.name,
          school: params.school,
          trainingDate: params.trainingDate,
          courseTitle: params.courseTitle,
          status: 'sent',
          createdAt: new Date().toISOString(),
        }),
        new Promise((resolve) => setTimeout(resolve, 3500)),
      ]);
      methods.push('firestore_realtime');
    } catch {
      // Ignore Firestore log error
    }
  })();

  // 2. Dispatch via Backend `/api/notify-registration` (SMTP / Webhook / Server Relay)
  const serverPromise = (async () => {
    try {
      const res = await fetch('/api/notify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          subject,
          body,
          recipients: ADMIN_NOTIFICATION_EMAILS,
          smtpUser: emailConfig.smtpUser,
          smtpPass: emailConfig.smtpPass,
          webhookUrl: emailConfig.webhookUrl,
        }),
      });
      if (res.ok) {
        methods.push('server_email_dispatch');
      }
    } catch {
      // Ignore network error
    }
  })();

  // 3. Dispatch directly via client-side FormSubmit AJAX to all 3 admin email addresses
  const formSubmitPromise = (async () => {
    try {
      await Promise.allSettled(
        ADMIN_NOTIFICATION_EMAILS.map((recipientEmail, idx) =>
          fetch(`https://formsubmit.co/ajax/${encodeURIComponent(recipientEmail)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              _subject: subject,
              _template: 'box',
              _captcha: 'false',
              ...(idx === 0
                ? { _cc: ADMIN_NOTIFICATION_EMAILS.slice(1).join(',') }
                : {}),
              ข้อความแจ้งเตือน: body,
              '👤 ชื่อ-สกุล': params.name,
              '🏫 โรงเรียน': params.school,
              '📅 วันที่ต้องการอบรม': params.trainingDate,
              '📚 หลักสูตร': params.courseTitle,
            }),
          })
        )
      );
      methods.push('formsubmit_ajax');
    } catch {
      // Ignore external relay error
    }
  })();

  // If custom Google Apps Script Webhook URL is configured, also trigger from client
  const webhookPromise = (async () => {
    if (!emailConfig.webhookUrl) return;
    try {
      await fetch(emailConfig.webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          to: ADMIN_NOTIFICATION_EMAILS.join(','),
          recipients: ADMIN_NOTIFICATION_EMAILS,
          subject,
          body,
          ...params,
        }),
      });
      methods.push('apps_script_webhook');
    } catch {
      // Ignore
    }
  })();

  await Promise.race([
    Promise.allSettled([firestorePromise, serverPromise, formSubmitPromise, webhookPromise]),
    new Promise((resolve) => setTimeout(resolve, 4500)),
  ]);

  return { ok: true, methods };
}
