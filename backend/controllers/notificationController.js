const pool = require('../config/db');
const { getNotificationLogs, markAbsencesAndNotify } = require('../services/notificationService');

exports.getNotifications = async (req, res) => {
  try {
    const result = await getNotificationLogs({
      page: req.query.page,
      limit: req.query.limit,
      type: req.query.type,
      status: req.query.status,
    });

    return res.status(200).json({
      message: 'Notification history fetched successfully',
      ...result,
    });
  } catch (error) {
    console.error('Notification history error:', error.message);
    return res.status(500).json({ message: 'Server error while fetching notification history' });
  }
};

exports.resendAbsentNotifications = async (req, res) => {
  try {
    const sessionId = Number(req.body?.session_id);
    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      return res.status(400).json({ message: 'session_id is required' });
    }

    const session = await pool.query('SELECT id, status FROM Session WHERE id = $1', [sessionId]);
    const status = session.rows[0]?.status;
    if (!status) {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (status !== 'completed') {
      return res.status(400).json({ message: 'Session must be completed before resending absences' });
    }

    const result = await markAbsencesAndNotify([sessionId], { force: true });
    return res.status(200).json({
      message: 'Absent notifications resent',
      data: result,
    });
  } catch (error) {
    console.error('Resend absent notifications error:', error?.message || error);
    if (error?.detail || error?.where || error?.routine) {
      console.error('Resend absent notifications error detail:', {
        detail: error.detail,
        where: error.where,
        routine: error.routine,
      });
    }
    return res.status(500).json({ message: 'Server error while resending absences' });
  }
};
