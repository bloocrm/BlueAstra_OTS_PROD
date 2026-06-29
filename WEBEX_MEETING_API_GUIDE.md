# Cisco Webex Meeting APIs Implementation Guide

## Overview

This guide explains how to use the newly implemented Cisco Webex meeting APIs that allow users to create persistent meetings directly from Bloo CRM. Meetings stay active until the user explicitly stops them, with automatic heartbeat to maintain the session.

---

## Getting Started

### 1. Setup Webex API Credentials

Before you can use the Webex meeting APIs, you need to obtain an API token from Cisco Webex:

#### Option A: Personal Access Token (Recommended for Development)

1. Go to https://developer.webex.com/
2. Sign in with your Webex account
3. Click "My Apps" or "Create a New Integration"
4. Select "Create New" → "Bot" or "Conversation Bot"
5. Fill in the bot details:
   - Name: "Bloo CRM Meeting Bot"
   - Description: "Create persistent meetings from Bloo CRM"
6. Click "Add Bot"
7. Copy the **Bot Access Token** (keep this secret!)
8. Add to your `.env` file:

```env
WEBEX_API_TOKEN=your-bot-access-token-here
WEBEX_API_BASE_URL=https://webexapis.com/v1
FRONTEND_MEETING_BASE_URL=http://localhost:3000
```

#### Option B: OAuth Service Account (Recommended for Production)

1. Go to https://developer.webex.com/
2. Click "Create a New Integration"
3. Select "Integration for a Service"
4. Fill in integration details
5. Grant required scopes:
   - `meeting:schedules_write` - Create meetings
   - `meeting:schedules_read` - Read meeting details
   - `meeting:participants_write` - Add participants
   - `meeting:participants_read` - View participants
   - `meeting:recordings_read` - Access recordings
6. Generate access token
7. Add to `.env`:

```env
WEBEX_API_TOKEN=your-access-token
WEBEX_REFRESH_TOKEN=your-refresh-token
```

### 2. Test Your Credentials

Run this command to verify your token works:

```bash
curl -X GET \
  https://webexapis.com/v1/people/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

If successful, you'll see your Webex user information.

---

## API Endpoints

### Create Webex Meeting

**Endpoint:** `POST /api/meeting-rooms/create-webex`

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "meetingTitle": "Q4 Business Review",
  "meetingDescription": "Quarterly performance discussion",
  "startTime": "2026-06-25T10:00:00Z",
  "duration": 60,
  "participantEmails": [
    "client@example.com",
    "colleague@example.com"
  ],
  "clientId": "507f1f77bcf86cd799439011",  // Optional: MongoDB Client ID
  "leadId": "507f1f77bcf86cd799439012",   // Optional: MongoDB Lead ID
  "clientEmail": "client@example.com"      // Optional: For sending meeting details
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "a1b2c3d4e5f6g7h8i9j0k1l2",
    "webexMeetingId": "167890123456",
    "webexMeetingNumber": 123456789,
    "meetingUrl": "https://webex.com/j/123456789",
    "joinPassword": "ABC123DEF456",
    "sipAddress": "123456789@webex.com",
    "message": "Webex meeting created successfully"
  }
}
```

**Status Codes:**
- `201` - Meeting created successfully
- `400` - Bad request (missing required fields)
- `401` - Unauthorized (invalid/expired token)
- `500` - Server error (Webex API failure)

---

### Get Meeting Status

**Endpoint:** `GET /api/meeting-rooms/:sessionId/meeting-status`

**Authentication:** Required

**Parameters:**
- `sessionId` - Session ID from meeting creation response

**Response:**
```json
{
  "data": {
    "sessionId": "a1b2c3d4e5f6g7h8i9j0k1l2",
    "status": "active",
    "meetingId": "167890123456",
    "meetingNumber": 123456789,
    "participants": [
      {
        "email": "user1@example.com",
        "name": "User One",
        "joinedAt": "2026-06-25T10:05:00Z",
        "isActive": true,
        "role": "host"
      },
      {
        "email": "user2@example.com",
        "name": "User Two",
        "joinedAt": "2026-06-25T10:10:00Z",
        "isActive": true,
        "role": "guest"
      }
    ],
    "duration": 15,
    "recordingStatus": "recording",
    "totalParticipants": 2,
    "activeParticipants": 2
  }
}
```

---

### Send Heartbeat (Keep Meeting Alive)

**Endpoint:** `POST /api/meeting-rooms/:sessionId/heartbeat`

**Authentication:** Required

**Request Body:**
```json
{
  "isActive": true,
  "currentParticipantCount": 5
}
```

**Response:**
```json
{
  "data": {
    "status": "heartbeat_received",
    "keepAliveInterval": 30,
    "nextHeartbeatDue": "2026-06-25T10:05:30Z"
  }
}
```

**Note:** The frontend automatically sends this every 30 seconds while a meeting is active.

---

### End Meeting

**Endpoint:** `POST /api/meeting-rooms/:sessionId/end-meeting`

**Authentication:** Required

**Request Body:**
```json
{
  "endReason": "Meeting completed by user"
}
```

**Response:**
```json
{
  "data": {
    "success": true,
    "sessionId": "a1b2c3d4e5f6g7h8i9j0k1l2",
    "meetingEnded": true,
    "duration": 45,
    "participantCount": 5,
    "recordings": [
      {
        "id": "rec-12345",
        "downloadUrl": "https://webex.com/recordings/download/...",
        "playbackUrl": "https://webex.com/recordings/play/..."
      }
    ],
    "message": "Meeting ended successfully"
  }
}
```

---

### Add Participant During Meeting

**Endpoint:** `POST /api/meeting-rooms/:sessionId/add-participant`

**Authentication:** Required

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "name": "New User"
}
```

**Response:**
```json
{
  "data": {
    "success": true,
    "email": "newuser@example.com",
    "name": "New User",
    "message": "Participant invitation sent successfully"
  }
}
```

---

## Frontend Integration

### Creating a Meeting from the Dashboard

The frontend provides a modal form for creating Webex meetings:

1. **Show Modal:** Click any button that calls `showModal('createWebexMeetingModal')`
2. **Fill Form:**
   - Meeting Title (required)
   - Description (optional)
   - Start Time (required)
   - Duration in minutes (required, 15-480)
   - Participant emails (optional, add one at a time)
   - Client Email (optional)
3. **Submit:** Click "Create Meeting"

### Available JavaScript Functions

#### `createWebexMeeting(config)`
Creates a Webex meeting via API.

```javascript
const config = {
  meetingTitle: "My Meeting",
  meetingDescription: "Meeting description",
  startTime: "2026-06-25T10:00:00Z",
  duration: 60,
  participantEmails: ["user@example.com"],
  clientEmail: "client@example.com"
};

const result = await createWebexMeeting(config);
console.log(result.meetingUrl);  // "https://webex.com/j/..."
```

#### `endWebexMeeting(sessionId)`
Ends an active Webex meeting.

```javascript
const result = await endWebexMeeting("a1b2c3d4e5f6g7h8i9j0k1l2");
console.log(result.duration);  // Meeting duration in minutes
```

#### `getMeetingStatus(sessionId)`
Gets current meeting status including participants.

```javascript
const status = await getMeetingStatus("a1b2c3d4e5f6g7h8i9j0k1l2");
console.log(status.activeParticipants);  // Number of active participants
```

#### `startMeetingHeartbeat(sessionId)`
Starts automatic heartbeat every 30 seconds.

```javascript
startMeetingHeartbeat("a1b2c3d4e5f6g7h8i9j0k1l2");
```

#### `startStatusPolling(sessionId)`
Starts status polling every 10 seconds.

```javascript
startStatusPolling("a1b2c3d4e5f6g7h8i9j0k1l2");
```

---

## How It Works

### Meeting Lifecycle

```
1. User fills out meeting form and clicks "Create Meeting"
   ↓
2. Frontend calls POST /api/meeting-rooms/create-webex
   ↓
3. Backend:
   - Validates input
   - Calls Webex API to create meeting
   - Creates MongoDB session document
   - Returns meeting URL and details
   ↓
4. Frontend:
   - Displays meeting details panel
   - Shows meeting URL, password, and participant list
   - Starts automatic heartbeat (every 30s)
   - Starts status polling (every 10s)
   ↓
5. Heartbeat keeps meeting session alive in backend
   - Updates lastHeartbeatAt timestamp
   - Meeting remains active
   ↓
6. User clicks "End Meeting"
   ↓
7. Frontend calls POST /api/meeting-rooms/:sessionId/end-meeting
   ↓
8. Backend:
   - Calls Webex API to end meeting
   - Stops accepting new participants
   - Updates session status to "ended"
   - Fetches recording details if available
   ↓
9. Frontend:
   - Hides meeting panel
   - Shows summary (duration, participants, recording link)
   - Clears heartbeat and polling intervals
```

### Key Features

**Persistent Meetings:**
- Meeting stays active as long as heartbeats are sent (every 30 seconds)
- Meeting automatically ends if heartbeats stop for > 2 minutes
- User must explicitly click "End Meeting" to stop

**Automatic Participant Tracking:**
- All invited participants are added to the meeting
- Participant list updates in real-time (every 10 seconds)
- Track join time and duration for each participant

**Session Persistence:**
- Each meeting has a unique `sessionId`
- Session stored in MongoDB with full history
- Can be linked to Clients, Leads, or Communications
- Used for audit trails and analytics

**Recording Support:**
- Recordings automatically enabled (can be disabled in settings)
- Recording link available after meeting ends
- Stored in response data for download/playback

---

## Testing

### Test via curl

**Create a Meeting:**
```bash
curl -X POST http://localhost:5000/api/meeting-rooms/create-webex \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "meetingTitle": "Test Meeting",
    "startTime": "2026-06-25T10:00:00Z",
    "duration": 60,
    "participantEmails": ["test@example.com"]
  }'
```

**Get Meeting Status:**
```bash
curl -X GET http://localhost:5000/api/meeting-rooms/SESSION_ID/meeting-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**End Meeting:**
```bash
curl -X POST http://localhost:5000/api/meeting-rooms/SESSION_ID/end-meeting \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"endReason": "Test ended"}'
```

### Test via Frontend

1. Start backend server: `npm start` (in bloo-crm/backend)
2. Open frontend: http://localhost:3000
3. Login with test credentials
4. Click "Start Meeting" button (if available) or navigate to dashboard
5. Click "Create Webex Meeting"
6. Fill in meeting details
7. Click "Create Meeting"
8. Verify meeting appears in Webex app
9. Check participant list updates every 10 seconds
10. Click "End Meeting"

---

## Database Schema

### MeetingRoomSession Document

```javascript
{
  _id: ObjectId,
  userId: ObjectId,              // User who created meeting
  sessionId: String,             // Unique session ID
  sessionToken: String,          // Secure session token (hidden)
  provider: "webex",             // Meeting provider
  
  // Webex Specific
  webexMeetingId: String,        // Webex meeting ID
  webexMeetingNumber: Number,    // Webex meeting number (also join code)
  webexSipAddress: String,       // SIP dial-in address
  meetingUrl: String,            // https://webex.com/j/...
  meetingPassword: String,       // Encrypted password
  
  // Meeting Details
  meetingTitle: String,
  meetingDescription: String,
  organizerEmail: String,
  organizerName: String,
  participantEmails: [String],   // List of invited emails
  
  // Lifecycle
  status: "active" | "ended",    // Current status
  scheduledStartTime: Date,
  actualStartTime: Date,
  actualEndTime: Date,
  duration: Number,              // in minutes
  
  // Keep-Alive
  lastHeartbeat: Date,           // Last heartbeat timestamp
  keepAliveInterval: 30,         // Seconds between heartbeats
  
  // Participants (updated in real-time)
  participants: [{
    userId: ObjectId,
    email: String,
    name: String,
    joinedAt: Date,
    leftAt: Date,
    role: "host" | "guest",
    isActive: Boolean,
    duration: Number
  }],
  
  // CRM Integration
  clientId: ObjectId,            // Link to Client document
  leadId: ObjectId,              // Link to Lead document
  linkedClientEmail: String,
  
  // Recording
  recordingId: String,
  recordingUrl: String,
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,
  endedBy: ObjectId
}
```

---

## Error Handling

### Common Errors

**401 Unauthorized:**
- JWT token missing or expired
- Solution: Re-login and get new token

**400 Bad Request:**
- Missing required fields (meetingTitle, startTime, duration)
- Invalid email format
- Solution: Verify all required fields are provided

**500 Webex API Error:**
- "Failed to create Webex meeting: Invalid API token"
- Solution: Check WEBEX_API_TOKEN in .env file

**503 Service Unavailable:**
- Webex API service down
- Solution: Retry later

### Debug Mode

Enable detailed logging in WebexMeetingService:

```javascript
// In webexMeetingService.js
console.log('Creating meeting:', meetingData);
console.log('Webex response:', response.data);
```

---

## Performance Considerations

- **Heartbeat:** Every 30 seconds (configurable)
- **Status Polling:** Every 10 seconds (configurable)
- **Max Concurrent Meetings:** Limited by Webex API rate limits
- **Participant Sync:** Real-time via status polling

---

## Security

- ✅ API tokens stored in `.env` (never in code)
- ✅ All endpoints require JWT authentication
- ✅ Session IDs are cryptographically random
- ✅ Passwords encrypted in database
- ✅ CORS restricted to frontend origin

---

## Next Steps (Phase 2)

1. **Email Integration**
   - Send meeting invites to participant emails
   - Send followup emails after meeting ends
   - Include recording link in email

2. **Google Meet Integration**
   - Follow same pattern as Webex
   - Use Google Calendar API

3. **Zoom Integration**
   - Use Zoom REST API
   - Support different Zoom account types

4. **Recording Processing**
   - Download recordings automatically
   - Generate transcripts
   - Store in document vault

5. **Analytics**
   - Track meeting duration trends
   - Measure participant engagement
   - Generate meeting reports

---

## Support

For issues or questions:
1. Check the error messages in browser console
2. Check backend logs: `tail -f bloo-crm/backend/logs/*`
3. Verify Webex credentials with curl test
4. Check MongoDB session documents: `db.meeting_room_sessions.find()`
