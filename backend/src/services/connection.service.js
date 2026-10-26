const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { encryptMessage, decryptMessage } = require('../utils/encryption');
const { emitToUser } = require('../socket');
const { createNotification } = require('./notification.service');

/**
 * Discover users who have at least one goal, excluding current user.
 * Supports search, filter by connection status, and returns primary goal + all goals.
 */
exports.discoverUsers = async (currentUserId, { search = '', status = 'ALL' } = {}) => {
  // Base query: registered users who have enrolled in at least 1 goal
  let query = `
    SELECT u.id, u.name, u.avatar, u.timezone, u.current_streak, u.created_at
    FROM users u
    WHERE u.id != ?
      AND EXISTS (SELECT 1 FROM goals g WHERE g.user_id = u.id)
  `;
  const params = [currentUserId];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query += `
      AND (
        u.name LIKE ?
        OR EXISTS (
          SELECT 1 FROM goals g 
          WHERE g.user_id = u.id 
            AND (g.title LIKE ? OR g.description LIKE ?)
        )
      )
    `;
    params.push(term, term, term);
  }

  query += ` ORDER BY u.id DESC`;

  const [users] = await pool.query(query, params);

  if (users.length === 0) {
    return [];
  }

  const userIds = users.map((u) => u.id);

  // Fetch all goals for these discovered users
  const [allGoals] = await pool.query(
    `SELECT id, user_id, title, description, target_date, priority, progress, status,
            duration_value, duration_unit, custom_duration
     FROM goals
     WHERE user_id IN (?)
     ORDER BY created_at DESC`,
    [userIds]
  );

  // Group goals by user_id
  const goalsByUser = {};
  for (const g of allGoals) {
    if (!goalsByUser[g.user_id]) goalsByUser[g.user_id] = [];
    goalsByUser[g.user_id].push(g);
  }

  // Fetch all existing connections between current user and these discovered users
  const [connections] = await pool.query(
    `SELECT id, user_id_1, user_id_2, status, requester_id
     FROM connections
     WHERE (user_id_1 = ? AND user_id_2 IN (?))
        OR (user_id_2 = ? AND user_id_1 IN (?))`,
    [currentUserId, userIds, currentUserId, userIds]
  );

  const connectionMap = {};
  for (const c of connections) {
    const partnerId = c.user_id_1 === currentUserId ? c.user_id_2 : c.user_id_1;
    connectionMap[partnerId] = c;
  }

  // Construct enriched user list
  const results = [];
  for (const u of users) {
    const userGoals = goalsByUser[u.id] || [];
    if (userGoals.length === 0) continue; // Safety check: must have at least one goal

    const primaryGoal = userGoals[0];
    const conn = connectionMap[u.id];

    let connectionStatus = 'NONE';
    let connectionId = null;

    if (conn) {
      connectionId = conn.id;
      if (conn.status === 'ACCEPTED') {
        connectionStatus = 'CONNECTED';
      } else if (conn.status === 'PENDING') {
        connectionStatus = conn.requester_id === currentUserId ? 'PENDING_OUTGOING' : 'PENDING_INCOMING';
      } else if (conn.status === 'REJECTED') {
        connectionStatus = conn.requester_id === currentUserId ? 'REJECTED_OUTGOING' : 'REJECTED_INCOMING';
      }
    }

    // Apply status filter if provided
    if (status === 'CONNECTED' && connectionStatus !== 'CONNECTED') continue;
    if (status === 'PENDING' && !connectionStatus.startsWith('PENDING')) continue;
    if (status === 'NOT_CONNECTED' && (connectionStatus === 'CONNECTED' || connectionStatus === 'PENDING_OUTGOING')) continue;

    results.push({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      timezone: u.timezone,
      current_streak: u.current_streak || 0,
      goals_count: userGoals.length,
      primary_goal: {
        id: primaryGoal.id,
        title: primaryGoal.title,
        description: primaryGoal.description,
        duration_value: primaryGoal.duration_value,
        duration_unit: primaryGoal.duration_unit,
        custom_duration: primaryGoal.custom_duration,
        progress: primaryGoal.progress,
        status: primaryGoal.status
      },
      all_goals: userGoals.map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        target_date: g.target_date,
        duration_value: g.duration_value,
        duration_unit: g.duration_unit,
        custom_duration: g.custom_duration,
        progress: g.progress,
        status: g.status
      })),
      connection_status: connectionStatus,
      connection_id: connectionId
    });
  }

  return results;
};

/**
 * Get public profile details and all goals for a specific user.
 * Strictly avoids exposing private fields like email or password.
 */
exports.getUserPublicProfile = async (currentUserId, targetUserId) => {
  const [users] = await pool.query(
    `SELECT id, name, avatar, timezone, current_streak, created_at
     FROM users
     WHERE id = ?`,
    [targetUserId]
  );

  if (users.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user = users[0];

  const [goals] = await pool.query(
    `SELECT id, title, description, target_date, priority, progress, status,
            duration_value, duration_unit, custom_duration
     FROM goals
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [targetUserId]
  );

  if (goals.length === 0) {
    throw new AppError('This user has not enrolled in any goals yet', 400);
  }

  // Check connection status
  const u1 = Math.min(currentUserId, targetUserId);
  const u2 = Math.max(currentUserId, targetUserId);

  const [conns] = await pool.query(
    `SELECT id, status, requester_id FROM connections WHERE user_id_1 = ? AND user_id_2 = ?`,
    [u1, u2]
  );

  let connectionStatus = 'NONE';
  let connectionId = null;

  if (conns.length > 0) {
    const conn = conns[0];
    connectionId = conn.id;
    if (conn.status === 'ACCEPTED') {
      connectionStatus = 'CONNECTED';
    } else if (conn.status === 'PENDING') {
      connectionStatus = conn.requester_id === currentUserId ? 'PENDING_OUTGOING' : 'PENDING_INCOMING';
    } else if (conn.status === 'REJECTED') {
      connectionStatus = conn.requester_id === currentUserId ? 'REJECTED_OUTGOING' : 'REJECTED_INCOMING';
    }
  }

  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    timezone: user.timezone,
    current_streak: user.current_streak || 0,
    created_at: user.created_at,
    goals_count: goals.length,
    primary_goal: goals[0],
    all_goals: goals,
    connection_status: connectionStatus,
    connection_id: connectionId
  };
};

/**
 * Send a connection request to an eligible user.
 */
exports.sendConnectionRequest = async (currentUserId, recipientId) => {
  if (parseInt(currentUserId) === parseInt(recipientId)) {
    throw new AppError('You cannot connect with yourself', 400);
  }

  // Check recipient exists and has at least one goal
  const [recipients] = await pool.query(
    `SELECT u.id, u.name, (SELECT COUNT(*) FROM goals g WHERE g.user_id = u.id) as goal_count
     FROM users u WHERE u.id = ?`,
    [recipientId]
  );

  if (recipients.length === 0) {
    throw new AppError('Target user does not exist', 404);
  }

  if (recipients[0].goal_count === 0) {
    throw new AppError('Target user is not enrolled in any goals and is not eligible for connections', 400);
  }

  const [senders] = await pool.query(`SELECT id, name, avatar FROM users WHERE id = ?`, [currentUserId]);
  const sender = senders[0];

  const u1 = Math.min(currentUserId, recipientId);
  const u2 = Math.max(currentUserId, recipientId);

  const [existing] = await pool.query(
    `SELECT id, status, requester_id FROM connections WHERE user_id_1 = ? AND user_id_2 = ?`,
    [u1, u2]
  );

  let connectionId;

  if (existing.length > 0) {
    const conn = existing[0];
    if (conn.status === 'ACCEPTED') {
      throw new AppError('You are already connected with this user', 400);
    }
    if (conn.status === 'PENDING') {
      if (conn.requester_id === currentUserId) {
        throw new AppError('Connection request is already pending', 400);
      } else {
        // Recipient already requested to connect with current user - auto accept!
        await exports.acceptRequest(currentUserId, conn.id);
        return {
          success: true,
          message: 'Connection accepted successfully',
          status: 'CONNECTED',
          connection_id: conn.id
        };
      }
    }

    // If REJECTED, permit sending a new request
    await pool.query(
      `UPDATE connections 
       SET status = 'PENDING', requester_id = ?, updated_at = NOW() 
       WHERE id = ?`,
      [currentUserId, conn.id]
    );
    connectionId = conn.id;
  } else {
    const [result] = await pool.query(
      `INSERT INTO connections (user_id_1, user_id_2, status, requester_id)
       VALUES (?, ?, 'PENDING', ?)`,
      [u1, u2, currentUserId]
    );
    connectionId = result.insertId;
  }

  // Create persistent notification for recipient
  await createNotification(recipientId, {
    title: 'New Connection Request',
    message: `${sender.name} sent you a connection request`,
    type: 'CONNECTION_REQUEST',
    link: '/connections?tab=requests'
  });

  // Emit real-time socket event to recipient
  emitToUser(recipientId, 'connection_request_received', {
    connection_id: connectionId,
    sender: {
      id: sender.id,
      name: sender.name,
      avatar: sender.avatar
    }
  });

  return {
    success: true,
    message: 'Connection request sent successfully',
    status: 'PENDING_OUTGOING',
    connection_id: connectionId
  };
};

/**
 * Get incoming and outgoing connection requests for current user.
 */
exports.getRequests = async (currentUserId) => {
  // 1. Incoming requests (where current user is recipient)
  const [incomingRows] = await pool.query(
    `SELECT c.id as connection_id, c.created_at, c.requester_id,
            u.id as sender_id, u.name, u.avatar, u.timezone, u.current_streak
     FROM connections c
     JOIN users u ON u.id = c.requester_id
     WHERE (c.user_id_1 = ? OR c.user_id_2 = ?)
       AND c.requester_id != ?
       AND c.status = 'PENDING'
     ORDER BY c.created_at DESC`,
    [currentUserId, currentUserId, currentUserId]
  );

  // 2. Outgoing requests (where current user is requester)
  const [outgoingRows] = await pool.query(
    `SELECT c.id as connection_id, c.created_at,
            u.id as recipient_id, u.name, u.avatar, u.timezone, u.current_streak
     FROM connections c
     JOIN users u ON u.id = (CASE WHEN c.user_id_1 = ? THEN c.user_id_2 ELSE c.user_id_1 END)
     WHERE c.requester_id = ?
       AND c.status = 'PENDING'
     ORDER BY c.created_at DESC`,
    [currentUserId, currentUserId]
  );

  // Enrich with primary goals
  const allUserIds = [
    ...incomingRows.map((r) => r.sender_id),
    ...outgoingRows.map((r) => r.recipient_id)
  ];

  let primaryGoalsMap = {};
  if (allUserIds.length > 0) {
    const [goals] = await pool.query(
      `SELECT g.user_id, g.title, g.duration_value, g.duration_unit, g.custom_duration, g.progress
       FROM goals g
       WHERE g.user_id IN (?)
       ORDER BY g.created_at DESC`,
      [allUserIds]
    );

    for (const g of goals) {
      if (!primaryGoalsMap[g.user_id]) {
        primaryGoalsMap[g.user_id] = g;
      }
    }
  }

  const incoming = incomingRows.map((row) => ({
    connection_id: row.connection_id,
    created_at: row.created_at,
    sender: {
      id: row.sender_id,
      name: row.name,
      avatar: row.avatar,
      timezone: row.timezone,
      current_streak: row.current_streak,
      primary_goal: primaryGoalsMap[row.sender_id] || null
    }
  }));

  const outgoing = outgoingRows.map((row) => ({
    connection_id: row.connection_id,
    created_at: row.created_at,
    recipient: {
      id: row.recipient_id,
      name: row.name,
      avatar: row.avatar,
      timezone: row.timezone,
      current_streak: row.current_streak,
      primary_goal: primaryGoalsMap[row.recipient_id] || null
    }
  }));

  return { incoming, outgoing };
};

/**
 * Accept an incoming connection request.
 */
exports.acceptRequest = async (currentUserId, connectionId) => {
  const [conns] = await pool.query(
    `SELECT * FROM connections WHERE id = ?`,
    [connectionId]
  );

  if (conns.length === 0) {
    throw new AppError('Connection request not found', 404);
  }

  const conn = conns[0];

  if (conn.user_id_1 !== currentUserId && conn.user_id_2 !== currentUserId) {
    throw new AppError('Unauthorized: You are not part of this connection request', 403);
  }

  if (conn.requester_id === currentUserId) {
    throw new AppError('You cannot accept your own outgoing connection request', 400);
  }

  if (conn.status === 'ACCEPTED') {
    return { success: true, message: 'Connection already accepted' };
  }

  const connClient = await pool.getConnection();
  try {
    await connClient.beginTransaction();

    await connClient.query(
      `UPDATE connections SET status = 'ACCEPTED', updated_at = NOW() WHERE id = ?`,
      [connectionId]
    );

    // Ensure a conversation row exists for this connection
    await connClient.query(
      `INSERT IGNORE INTO conversations (connection_id) VALUES (?)`,
      [connectionId]
    );

    await connClient.commit();
  } catch (err) {
    await connClient.rollback();
    throw err;
  } finally {
    connClient.release();
  }

  const [acceptors] = await pool.query(`SELECT id, name FROM users WHERE id = ?`, [currentUserId]);
  const acceptorName = acceptors[0]?.name || 'Someone';

  const requesterId = conn.requester_id;

  // Persistent notification for requester
  await createNotification(requesterId, {
    title: 'Connection Accepted',
    message: `${acceptorName} accepted your connection request`,
    type: 'CONNECTION_ACCEPTED',
    link: `/connections?tab=messages&userId=${currentUserId}`
  });

  // Socket notification to requester
  emitToUser(requesterId, 'connection_request_accepted', {
    connection_id: connectionId,
    accepted_by: {
      id: currentUserId,
      name: acceptorName
    }
  });

  return { success: true, message: 'Connection request accepted successfully' };
};

/**
 * Reject an incoming connection request.
 */
exports.rejectRequest = async (currentUserId, connectionId) => {
  const [conns] = await pool.query(`SELECT * FROM connections WHERE id = ?`, [connectionId]);

  if (conns.length === 0) {
    throw new AppError('Connection request not found', 404);
  }

  const conn = conns[0];

  if (conn.user_id_1 !== currentUserId && conn.user_id_2 !== currentUserId) {
    throw new AppError('Unauthorized: You are not part of this connection request', 403);
  }

  if (conn.requester_id === currentUserId) {
    throw new AppError('You cannot reject your own outgoing request', 400);
  }

  await pool.query(
    `UPDATE connections SET status = 'REJECTED', updated_at = NOW() WHERE id = ?`,
    [connectionId]
  );

  emitToUser(conn.requester_id, 'connection_request_rejected', {
    connection_id: connectionId
  });

  return { success: true, message: 'Connection request rejected' };
};

/**
 * Cancel an outgoing pending request or remove an existing connection.
 */
exports.cancelOrDisconnect = async (currentUserId, connectionId) => {
  const [conns] = await pool.query(`SELECT * FROM connections WHERE id = ?`, [connectionId]);

  if (conns.length === 0) {
    throw new AppError('Connection not found', 404);
  }

  const conn = conns[0];

  if (conn.user_id_1 !== currentUserId && conn.user_id_2 !== currentUserId) {
    throw new AppError('Unauthorized: You are not part of this connection', 403);
  }

  const partnerId = conn.user_id_1 === currentUserId ? conn.user_id_2 : conn.user_id_1;

  // Deleting the connection row cascades to conversations and messages
  await pool.query(`DELETE FROM connections WHERE id = ?`, [connectionId]);

  emitToUser(partnerId, 'connection_removed', { connection_id: connectionId });

  return { success: true, message: 'Connection cancelled or removed successfully' };
};

/**
 * List all accepted connections with latest message previews and unread badges.
 */
exports.getAcceptedConnections = async (currentUserId) => {
  const [connections] = await pool.query(
    `SELECT c.id as connection_id, c.created_at, c.updated_at,
            cv.id as conversation_id,
            u.id as partner_id, u.name, u.avatar, u.timezone, u.current_streak
     FROM connections c
     JOIN users u ON u.id = (CASE WHEN c.user_id_1 = ? THEN c.user_id_2 ELSE c.user_id_1 END)
     LEFT JOIN conversations cv ON cv.connection_id = c.id
     WHERE (c.user_id_1 = ? OR c.user_id_2 = ?)
       AND c.status = 'ACCEPTED'
     ORDER BY c.updated_at DESC`,
    [currentUserId, currentUserId, currentUserId]
  );

  if (connections.length === 0) {
    return [];
  }

  const partnerIds = connections.map((c) => c.partner_id);

  // Get primary goals
  const [goals] = await pool.query(
    `SELECT g.user_id, g.title, g.duration_value, g.duration_unit, g.custom_duration, g.progress
     FROM goals g
     WHERE g.user_id IN (?)
     ORDER BY g.created_at DESC`,
    [partnerIds]
  );

  const primaryGoals = {};
  for (const g of goals) {
    if (!primaryGoals[g.user_id]) primaryGoals[g.user_id] = g;
  }

  const results = [];

  for (const conn of connections) {
    let lastMessage = null;
    let unreadCount = 0;

    if (conn.conversation_id) {
      // Fetch latest message
      const [msgRows] = await pool.query(
        `SELECT id, sender_id, encrypted_content, iv, auth_tag, created_at, is_read
         FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [conn.conversation_id]
      );

      if (msgRows.length > 0) {
        const m = msgRows[0];
        lastMessage = {
          id: m.id,
          sender_id: m.sender_id,
          content: decryptMessage(m),
          created_at: m.created_at,
          is_read: m.is_read
        };
      }

      // Count unread messages received from partner
      const [[{ unread }]] = await pool.query(
        `SELECT COUNT(*) as unread
         FROM messages
         WHERE conversation_id = ? AND sender_id = ? AND is_read = FALSE`,
        [conn.conversation_id, conn.partner_id]
      );
      unreadCount = unread || 0;
    }

    results.push({
      connection_id: conn.connection_id,
      conversation_id: conn.conversation_id,
      partner: {
        id: conn.partner_id,
        name: conn.name,
        avatar: conn.avatar,
        timezone: conn.timezone,
        current_streak: conn.current_streak,
        primary_goal: primaryGoals[conn.partner_id] || null
      },
      last_message: lastMessage,
      unread_count: unreadCount,
      updated_at: lastMessage ? lastMessage.created_at : conn.updated_at
    });
  }

  // Sort by latest message activity
  results.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  return results;
};

/**
 * Retrieve decrypted message history for a conversation between current user and partner.
 * Validates connection is ACCEPTED.
 */
exports.getMessages = async (currentUserId, partnerId) => {
  const u1 = Math.min(currentUserId, partnerId);
  const u2 = Math.max(currentUserId, partnerId);

  const [conns] = await pool.query(
    `SELECT c.id, c.status, cv.id as conversation_id
     FROM connections c
     LEFT JOIN conversations cv ON cv.connection_id = c.id
     WHERE c.user_id_1 = ? AND c.user_id_2 = ?`,
    [u1, u2]
  );

  if (conns.length === 0 || conns[0].status !== 'ACCEPTED') {
    throw new AppError('You can only view messages with accepted connections', 403);
  }

  const conn = conns[0];
  let conversationId = conn.conversation_id;

  if (!conversationId) {
    const [cvResult] = await pool.query(
      `INSERT INTO conversations (connection_id) VALUES (?)`,
      [conn.id]
    );
    conversationId = cvResult.insertId;
  }

  // Mark all unread messages from partner as read
  const [updateResult] = await pool.query(
    `UPDATE messages 
     SET is_read = TRUE, read_at = NOW() 
     WHERE conversation_id = ? AND sender_id = ? AND is_read = FALSE`,
    [conversationId, partnerId]
  );

  if (updateResult.affectedRows > 0) {
    emitToUser(partnerId, 'messages_read', {
      conversation_id: conversationId,
      read_by: currentUserId,
      read_at: new Date().toISOString()
    });
  }

  // Retrieve messages
  const [rows] = await pool.query(
    `SELECT id, conversation_id, sender_id, encrypted_content, iv, auth_tag, encryption_version, is_read, read_at, created_at
     FROM messages
     WHERE conversation_id = ?
     ORDER BY created_at ASC`,
    [conversationId]
  );

  // Decrypt each message for authorized participants
  const messages = rows.map((row) => ({
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    content: decryptMessage(row),
    is_read: row.is_read,
    read_at: row.read_at,
    created_at: row.created_at,
    encryption_version: row.encryption_version
  }));

  return {
    conversation_id: conversationId,
    messages
  };
};

/**
 * Send an encrypted message to an accepted connection.
 */
exports.sendMessage = async (currentUserId, partnerId, content) => {
  if (!content || !content.trim()) {
    throw new AppError('Message cannot be empty', 400);
  }

  const trimmedContent = content.trim();
  if (trimmedContent.length > 5000) {
    throw new AppError('Message exceeds maximum allowed length of 5000 characters', 400);
  }

  const u1 = Math.min(currentUserId, partnerId);
  const u2 = Math.max(currentUserId, partnerId);

  // Validate that connection is active and accepted
  const [conns] = await pool.query(
    `SELECT c.id, c.status, cv.id as conversation_id
     FROM connections c
     LEFT JOIN conversations cv ON cv.connection_id = c.id
     WHERE c.user_id_1 = ? AND c.user_id_2 = ?`,
    [u1, u2]
  );

  if (conns.length === 0 || conns[0].status !== 'ACCEPTED') {
    throw new AppError('You can only exchange messages with accepted connections', 403);
  }

  const conn = conns[0];
  let conversationId = conn.conversation_id;

  if (!conversationId) {
    const [cvResult] = await pool.query(
      `INSERT INTO conversations (connection_id) VALUES (?)`,
      [conn.id]
    );
    conversationId = cvResult.insertId;
  }

  // Encrypt message content before saving in MySQL database
  const { encrypted_content, iv, auth_tag, encryption_version } = encryptMessage(trimmedContent);

  const [result] = await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, encrypted_content, iv, auth_tag, encryption_version, is_read)
     VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
    [conversationId, currentUserId, encrypted_content, iv, auth_tag, encryption_version]
  );

  await pool.query(`UPDATE conversations SET updated_at = NOW() WHERE id = ?`, [conversationId]);

  // Fetch sender info for real-time payload
  const [senders] = await pool.query(`SELECT id, name, avatar FROM users WHERE id = ?`, [currentUserId]);
  const sender = senders[0];

  const messagePayload = {
    id: result.insertId,
    conversation_id: conversationId,
    sender_id: currentUserId,
    recipient_id: parseInt(partnerId),
    content: trimmedContent,
    is_read: false,
    read_at: null,
    created_at: new Date().toISOString(),
    sender: {
      id: sender.id,
      name: sender.name,
      avatar: sender.avatar
    }
  };

  // Real-time delivery to recipient and sender via socket rooms
  emitToUser(partnerId, 'new_message', messagePayload);
  emitToUser(currentUserId, 'new_message', messagePayload);

  // Dashboard notification for recipient
  const previewSnippet = trimmedContent.length > 50 ? `${trimmedContent.substring(0, 47)}...` : trimmedContent;
  await createNotification(partnerId, {
    title: `New message from ${sender.name}`,
    message: previewSnippet,
    type: 'MESSAGE',
    link: `/connections?tab=messages&userId=${currentUserId}`
  });

  return messagePayload;
};
