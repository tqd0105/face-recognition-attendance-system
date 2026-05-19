const pool = require('../config/db');
const { isEmailEnabled, sendEmail } = require('../utils/email');

const TYPE_LABELS = {
  schedule_reminder: 'Nhắc lịch điểm danh',
  late_attendance: 'Thông báo đi học muộn',
  absent_attendance: 'Thông báo vắng mặt',
};

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDate(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatTime(value) {
  if (!value) {
    return '--:--';
  }
  const text = String(value);
  const match = text.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : text.slice(0, 5);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildRecipients(student) {
  const recipients = [];
  const seen = new Set();

  [
    { email: student?.email, role: 'student' },
    { email: student?.parent_email, role: 'parent' },
  ].forEach((item) => {
    const email = String(item.email || '').trim().toLowerCase();
    if (!email || seen.has(email)) {
      return;
    }
    seen.add(email);
    recipients.push({ email, role: item.role });
  });

  return recipients;
}

function buildSubject(type, context) {
  const course = context.course_code || context.course_name || 'lớp học';
  if (type === 'schedule_reminder') {
    return `[Thông báo lịch học] ${course} - ${formatDate(context.session_date)}`;
  }
  if (type === 'late_attendance') {
    return `[Thông báo điểm danh muộn] ${context.student_name || context.name || 'Sinh viên'} - ${course}`;
  }
  return `[Thông báo vắng mặt] ${context.student_name || context.name || 'Sinh viên'} - ${course}`;
}

function buildOpening(type, recipientRole) {
  const prefix = recipientRole === 'parent' ? 'Kính gửi Quý phụ huynh,' : 'Kính gửi sinh viên,';
  if (type === 'schedule_reminder') {
    return `${prefix}<br/>Nhà trường gửi thông báo nhắc lịch học và điểm danh sắp tới.`;
  }
  if (type === 'late_attendance') {
    return `${prefix}<br/>Hệ thống ghi nhận sinh viên đã điểm danh sau thời gian quy định.`;
  }
  return `${prefix}<br/>Hệ thống ghi nhận sinh viên chưa thực hiện điểm danh khi buổi học kết thúc.`;
}

function buildHtml(type, context, recipientRole) {
  const title = TYPE_LABELS[type] || 'Thông báo điểm danh';
  const statusLabel = type === 'schedule_reminder'
    ? 'Sắp diễn ra'
    : type === 'late_attendance'
      ? 'Điểm danh muộn'
      : 'Không điểm danh';

  return `
    <div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:680px;margin:0 auto;padding:28px 16px;">
        <div style="background:#ffffff;border:1px solid #dbe3ef;border-radius:12px;overflow:hidden;">
          <div style="background:#0f172a;color:#ffffff;padding:22px 24px;">
            <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#bae6fd;">Face Recognition Attendance System</div>
            <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;">${escapeHtml(title)}</h1>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">${buildOpening(type, recipientRole)}</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:10px;border:1px solid #e2e8f0;background:#f8fafc;width:34%;font-weight:700;">Sinh viên</td><td style="padding:10px;border:1px solid #e2e8f0;">${escapeHtml(context.student_name || context.name || '-')}</td></tr>
              <tr><td style="padding:10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;">Mã sinh viên</td><td style="padding:10px;border:1px solid #e2e8f0;">${escapeHtml(context.student_code || '-')}</td></tr>
              <tr><td style="padding:10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;">Học phần</td><td style="padding:10px;border:1px solid #e2e8f0;">${escapeHtml(context.course_code || '-')} - ${escapeHtml(context.course_name || '-')}</td></tr>
              <tr><td style="padding:10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;">Buổi học</td><td style="padding:10px;border:1px solid #e2e8f0;">${escapeHtml(context.session_name || `Buổi #${context.session_id || ''}`)}</td></tr>
              <tr><td style="padding:10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;">Thời gian</td><td style="padding:10px;border:1px solid #e2e8f0;">${escapeHtml(formatDate(context.session_date))}, ${escapeHtml(formatTime(context.start_time))} - ${escapeHtml(formatTime(context.end_time))}</td></tr>
              <tr><td style="padding:10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;">Giảng viên</td><td style="padding:10px;border:1px solid #e2e8f0;">${escapeHtml(context.teacher_name || '-')}</td></tr>
              <tr><td style="padding:10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;">Trạng thái</td><td style="padding:10px;border:1px solid #e2e8f0;font-weight:700;color:${type === 'schedule_reminder' ? '#0369a1' : type === 'late_attendance' ? '#b45309' : '#be123c'};">${escapeHtml(statusLabel)}</td></tr>
            </table>
            <p style="margin:18px 0 0;font-size:14px;line-height:1.7;color:#334155;">Email này được gửi tự động từ hệ thống điểm danh. Vui lòng liên hệ giáo viên phụ trách hoặc bộ phận quản lý đào tạo nếu thông tin cần được kiểm tra lại.</p>
            <p style="margin:18px 0 0;font-size:14px;line-height:1.7;">Trân trọng,<br/><strong>Nhà trường</strong></p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildText(type, context, recipientRole) {
  const roleGreeting = recipientRole === 'parent' ? 'Kính gửi Quý phụ huynh,' : 'Kính gửi sinh viên,';
  return [
    roleGreeting,
    TYPE_LABELS[type] || 'Thông báo điểm danh',
    `Sinh viên: ${context.student_name || context.name || '-'}`,
    `Mã sinh viên: ${context.student_code || '-'}`,
    `Học phần: ${context.course_code || '-'} - ${context.course_name || '-'}`,
    `Buổi học: ${context.session_name || `Buổi #${context.session_id || ''}`}`,
    `Thời gian: ${formatDate(context.session_date)}, ${formatTime(context.start_time)} - ${formatTime(context.end_time)}`,
    `Giảng viên: ${context.teacher_name || '-'}`,
    'Email này được gửi tự động từ hệ thống điểm danh.',
  ].join('\n');
}

async function createOrSkipLog({ type, context, recipient, subject, force = false }) {
  const result = await pool.query(
    `INSERT INTO Notification_log (notification_type, session_id, student_id, recipient_email, recipient_role, subject, status)
     VALUES ($1, $2::int, $3::int, $4, $5, $6, 'pending')
     ON CONFLICT (notification_type, session_id, student_id, recipient_email)
     DO NOTHING
     RETURNING *`,
    [type, context.session_id, context.student_id, recipient.email, recipient.role, subject]
  );

  if (result.rows[0]) {
    return result.rows[0];
  }

  const existing = await pool.query(
    `SELECT id, status, sent_at, updated_at
     FROM Notification_log
     WHERE notification_type = $1
       AND session_id = $2::int
       AND student_id = $3::int
       AND recipient_email = $4
     LIMIT 1`,
    [type, context.session_id, context.student_id, recipient.email]
  );

  const log = existing.rows[0];
  if (!log) {
    return null;
  }

  if (['failed', 'skipped'].includes(log.status) || (force && log.status === 'pending')) {
    const updated = await pool.query(
      `UPDATE Notification_log
       SET status = 'pending',
           error_message = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [log.id]
    );
    return updated.rows[0] || log;
  }

  return null;
}

async function updateLogStatus(id, status, errorMessage = null) {
  await pool.query(
    `UPDATE Notification_log
     SET status = $2::varchar,
         error_message = $3,
         sent_at = CASE WHEN $2::varchar = 'sent' THEN CURRENT_TIMESTAMP ELSE sent_at END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [id, status, errorMessage]
  );
}

async function notifyStudentEvent(type, context, options = {}) {
  if (!isEmailEnabled()) {
    return [];
  }

  const { force = false } = options;
  const recipients = buildRecipients(context);
  const results = [];

  for (const recipient of recipients) {
    const subject = buildSubject(type, context);
    const log = await createOrSkipLog({ type, context, recipient, subject, force });
    if (!log) {
      results.push({ recipient: recipient.email, status: 'duplicate' });
      continue;
    }

    try {
      const emailResult = await sendEmail({
        to: recipient.email,
        subject,
        html: buildHtml(type, context, recipient.role),
        text: buildText(type, context, recipient.role),
      });
      await updateLogStatus(log.id, emailResult?.skipped ? 'skipped' : 'sent');
      results.push({ recipient: recipient.email, status: emailResult?.skipped ? 'skipped' : 'sent' });
    } catch (error) {
      await updateLogStatus(log.id, 'failed', error?.message || String(error));
      results.push({ recipient: recipient.email, status: 'failed', error: error?.message || String(error) });
    }
  }

  return results;
}

async function getAttendanceContext(sessionId, studentId) {
  const result = await pool.query(
    `SELECT
        se.id AS session_id,
        st.id AS student_id,
        st.student_code,
        st.name AS student_name,
        st.email,
        st.parent_email,
        se.session_name,
        se.session_date,
        se.start_time,
        se.end_time,
        cc.course_code,
        cc.course_name,
        t.teacher_name
     FROM Session se
     JOIN Course_classes cc ON cc.id = se.course_class_id
     JOIN Student st ON st.id = $2::int
     LEFT JOIN Teacher t ON t.id = cc.teacher_id
     WHERE se.id = $1::int`,
    [sessionId, studentId]
  );
  return result.rows[0] || null;
}

async function notifyLateAttendance(sessionId, studentId) {
  const context = await getAttendanceContext(sessionId, studentId);
  if (!context) {
    return [];
  }
  return notifyStudentEvent('late_attendance', context);
}

async function notifyScheduleReminders({ limit = 200 } = {}) {
  const minutesBefore = Math.max(1, Math.floor(toNumber(process.env.SCHEDULE_REMINDER_BEFORE_MINUTES, 120)));
  const timezone = String(process.env.SESSION_TIMEZONE || 'Asia/Ho_Chi_Minh').trim() || 'Asia/Ho_Chi_Minh';
  const result = await pool.query(
    `SELECT
        se.id AS session_id,
        st.id AS student_id,
        st.student_code,
        st.name AS student_name,
        st.email,
        st.parent_email,
        se.session_name,
        se.session_date,
        se.start_time,
        se.end_time,
        cc.course_code,
        cc.course_name,
        t.teacher_name
     FROM Session se
     JOIN Course_classes cc ON cc.id = se.course_class_id
     JOIN Student st ON st.status = 'active'
       AND (
         EXISTS (
           SELECT 1
           FROM Enrollments e
           WHERE e.course_class_id = cc.id
             AND e.student_id = st.id
             AND e.status = 'active'
         )
         OR (cc.home_class_id IS NOT NULL AND st.home_class_id = cc.home_class_id)
       )
     LEFT JOIN Teacher t ON t.id = cc.teacher_id
     WHERE se.status IN ('scheduled', 'active')
       AND (se.session_date + se.start_time) > (NOW() AT TIME ZONE $1)
       AND (se.session_date + se.start_time) <= ((NOW() AT TIME ZONE $1) + ($2::int * INTERVAL '1 minute'))
       AND (
         (NULLIF(TRIM(st.email), '') IS NOT NULL AND NOT EXISTS (
           SELECT 1 FROM Notification_log nl
           WHERE nl.notification_type = 'schedule_reminder'
             AND nl.session_id = se.id
             AND nl.student_id = st.id
             AND nl.recipient_email = LOWER(st.email)
         ))
         OR (NULLIF(TRIM(COALESCE(st.parent_email, '')), '') IS NOT NULL AND NOT EXISTS (
           SELECT 1 FROM Notification_log nl
           WHERE nl.notification_type = 'schedule_reminder'
             AND nl.session_id = se.id
             AND nl.student_id = st.id
             AND nl.recipient_email = LOWER(st.parent_email)
         ))
       )
     ORDER BY se.session_date ASC, se.start_time ASC
     LIMIT $3`,
    [timezone, minutesBefore, limit]
  );

  const summary = [];
  for (const row of result.rows) {
    summary.push(...await notifyStudentEvent('schedule_reminder', row));
  }
  return summary;
}

async function markAbsencesAndNotify(sessionIds = [], options = {}) {
  const ids = sessionIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length === 0) {
    return [];
  }

  const { force = false } = options;

  let inserted;
  try {
    inserted = await pool.query(
      `INSERT INTO Attendance (session_id, student_id, status)
       SELECT se.id, st.id, 'absent'::attendance_status
       FROM Session se
       JOIN Course_classes cc ON cc.id = se.course_class_id
       JOIN Student st ON st.status = 'active'
         AND (
           EXISTS (
             SELECT 1
             FROM Enrollments e
             WHERE e.course_class_id = cc.id
               AND e.student_id = st.id
               AND e.status = 'active'
           )
           OR (cc.home_class_id IS NOT NULL AND st.home_class_id = cc.home_class_id)
         )
       WHERE se.id = ANY($1::int[])
         AND NOT EXISTS (
           SELECT 1 FROM Attendance a
           WHERE a.session_id = se.id AND a.student_id = st.id
         )
       ON CONFLICT (session_id, student_id) DO NOTHING
       RETURNING session_id, student_id`,
      [ids]
    );
  } catch (error) {
    console.error('markAbsencesAndNotify insert error:', error?.message || error);
    throw error;
  }

  let candidates;
  try {
    candidates = await pool.query(
      `SELECT a.session_id, a.student_id
       FROM Attendance a
       JOIN Student st ON st.id = a.student_id
       WHERE a.session_id = ANY($1::int[])
         AND a.status = 'absent'
         AND st.status = 'active'`,
      [ids]
    );
  } catch (error) {
    console.error('markAbsencesAndNotify candidates error:', error?.message || error);
    throw error;
  }

  const unique = new Map();
  for (const row of candidates.rows) {
    unique.set(`${row.session_id}:${row.student_id}`, row);
  }

  const summary = [];
  for (const row of unique.values()) {
    let context = null;
    try {
      context = await getAttendanceContext(row.session_id, row.student_id);
    } catch (error) {
      console.error('markAbsencesAndNotify context error:', error?.message || error);
      throw error;
    }
    if (context) {
      summary.push(...await notifyStudentEvent('absent_attendance', context, { force }));
    }
  }
  return summary;
}

async function getNotificationLogs({ page = 1, limit = 50, type = '', status = '' } = {}) {
  const pageNumber = Math.max(1, Math.floor(Number(page) || 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(Number(limit) || 50)));
  const values = [];
  const filters = [];

  if (type) {
    values.push(type);
    filters.push(`nl.notification_type = $${values.length}`);
  }
  if (status) {
    values.push(status);
    filters.push(`nl.status = $${values.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  values.push(pageSize, (pageNumber - 1) * pageSize);

  const rows = await pool.query(
    `SELECT
        nl.*,
        st.student_code,
        st.name AS student_name,
        se.session_name,
        se.session_date,
        se.start_time,
        se.end_time,
        cc.course_code,
        cc.course_name,
        t.teacher_name
     FROM Notification_log nl
     LEFT JOIN Student st ON st.id = nl.student_id
     LEFT JOIN Session se ON se.id = nl.session_id
     LEFT JOIN Course_classes cc ON cc.id = se.course_class_id
     LEFT JOIN Teacher t ON t.id = cc.teacher_id
     ${where}
     ORDER BY nl.created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return {
    data: rows.rows,
    page: pageNumber,
    limit: pageSize,
  };
}

module.exports = {
  getNotificationLogs,
  markAbsencesAndNotify,
  notifyLateAttendance,
  notifyScheduleReminders,
};
