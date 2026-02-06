/**
 * Session History Fetcher
 * Retrieves conversation history from OpenClaw's session system
 */

const { sessions_list, sessions_history, sessions_spawn } = require('./tools');

// Note: This script uses OpenClaw's internal tools if available
// In a real implementation, these would be imported from OpenClaw's API

/**
 * Fetch session list with recent activity
 */
async function getRecentSessions(options = {}) {
  const { limit = 10, activeMinutes = 60 * 24 } = options;
  
  try {
    // This would call OpenClaw's sessions_list API
    const result = await sessions_list({
      limit,
      activeMinutes
    });
    
    return result || [];
  } catch (err) {
    console.error('Error fetching sessions:', err.message);
    return [];
  }
}

/**
 * Get full history for a specific session
 */
async function getSessionHistory(sessionKey, options = {}) {
  const { limit = 100, includeTools = false } = options;
  
  try {
    const result = await sessions_history({
      sessionKey,
      limit,
      includeTools
    });
    
    return result || [];
  } catch (err) {
    console.error(`Error fetching history for ${sessionKey}:`, err.message);
    return [];
  }
}

/**
 * Display session history in readable format
 */
function formatSessionHistory(history) {
  if (!history || history.length === 0) {
    return '(No history found)';
  }
  
  return history.map(msg => {
    const timestamp = msg.timestamp || '?';
    const role = msg.role || msg.author || '?';
    const content = msg.content || msg.text || '';
    
    return `[${timestamp}] ${role}: ${content}`;
  }).join('\n');
}

/**
 * Main function to retrieve recent context
 */
async function retrieveRecentContext(options = {}) {
  const { days = 1, maxMessages = 50 } = options;
  
  console.log('\n🔄 Retrieving recent context from OpenClaw...\n');
  
  try {
    // Get recent sessions
    const sessions = await getRecentSessions({
      limit: 10,
      activeMinutes: 60 * 24 * days
    });
    
    if (sessions.length === 0) {
      console.log('No recent sessions found.');
      return null;
    }
    
    console.log(`Found ${sessions.length} recent sessions:\n`);
    
    // Display session info
    sessions.forEach((session, i) => {
      console.log(`${i + 1}. ${session.label || session.key || 'unnamed'}`);
      console.log(`   Last active: ${session.lastActive || 'unknown'}`);
      console.log(`   Messages: ${session.messageCount || 'unknown'}`);
      console.log('');
    });
    
    // Optionally fetch history from the most recent session
    if (sessions.length > 0 && sessions[0].key) {
      console.log('Fetching history from most recent session...\n');
      const history = await getSessionHistory(sessions[0].key, {
        limit: maxMessages,
        includeTools: false
      });
      
      console.log(formatSessionHistory(history));
      
      return {
        sessions,
        history
      };
    }
    
    return { sessions };
  } catch (err) {
    console.error('Error retrieving context:', err.message);
    return null;
  }
}

// CLI usage
if (require.main === module) {
  retrieveRecentContext({ days: 3 }).catch(console.error);
}

module.exports = {
  getRecentSessions,
  getSessionHistory,
  formatSessionHistory,
  retrieveRecentContext
};
