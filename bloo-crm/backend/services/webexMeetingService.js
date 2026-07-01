/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   CISCO WEBEX MEETING SERVICE
   ===================================================== */

const axios = require('axios');

class WebexMeetingService {
  constructor() {
    this.apiToken = process.env.WEBEX_API_TOKEN;
    this.baseURL = process.env.WEBEX_API_BASE_URL || 'https://webexapis.com/v1';

    if (!this.apiToken) {
      throw new Error('WEBEX_API_TOKEN is required in environment variables');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Create a new Webex meeting
   * @param {Object} config - Meeting configuration
   * @returns {Promise<Object>} Meeting details
   */
  async createMeeting(config) {
    try {
      const {
        title,
        description,
        startTime,
        duration,
        participantEmails = [],
        allowAnyoneToBeCoHost = false
      } = config;

      // Prepare request body
      const meetingData = {
        title,
        description: description || `Meeting: ${title}`,
        start: new Date(startTime).toISOString(),
        end: new Date(new Date(startTime).getTime() + duration * 60000).toISOString(),
        allowAnyoneToBeCoHost,
        allowUnauthorizedDevices: true,
        recordingType: 'cloud',
        unlockedMeetingJoinSecurityOptions: {
          joinBeforeHostIsAllowed: true,
          securityOptions: {
            requireRegistrationBeforeJoiningForInternalUsers: false,
            requireDLCompliance: false
          }
        }
      };

      // Create meeting
      const response = await this.client.post('/meetings', meetingData);

      const meeting = response.data;

      // Add invitees if provided
      if (participantEmails && participantEmails.length > 0) {
        await Promise.all(
          participantEmails.map(email =>
            this.addParticipant(meeting.id, email).catch(err =>
              console.error(`Failed to add participant ${email}:`, err.message)
            )
          )
        );
      }

      return {
        success: true,
        webexMeetingId: meeting.id,
        webexMeetingNumber: meeting.meetingNumber,
        meetingUrl: meeting.meetingUrl,
        meetingUrlWithPassword: meeting.meetingUrl,
        joinPassword: meeting.meetingPassword || '',
        sipAddress: meeting.sipAddress,
        telConfURI: meeting.telConfURI,
        startTime: meeting.start,
        endTime: meeting.end,
        title: meeting.title,
        description: meeting.description
      };
    } catch (error) {
      console.error('Error creating Webex meeting:', error.response?.data || error.message);
      throw new Error(`Failed to create Webex meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * End a Webex meeting
   * @param {string} meetingId - Meeting ID
   * @returns {Promise<Object>} Confirmation
   */
  async endMeeting(meetingId) {
    try {
      await this.client.delete(`/meetings/${meetingId}`);

      return {
        success: true,
        meetingId,
        message: 'Meeting ended successfully'
      };
    } catch (error) {
      console.error('Error ending Webex meeting:', error.response?.data || error.message);
      throw new Error(`Failed to end Webex meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get meeting details
   * @param {string} meetingId - Meeting ID
   * @returns {Promise<Object>} Meeting details
   */
  async getMeetingDetails(meetingId) {
    try {
      const response = await this.client.get(`/meetings/${meetingId}`);

      const meeting = response.data;

      return {
        webexMeetingId: meeting.id,
        webexMeetingNumber: meeting.meetingNumber,
        title: meeting.title,
        description: meeting.description,
        status: meeting.status,
        startTime: meeting.start,
        endTime: meeting.end,
        meetingUrl: meeting.meetingUrl,
        sipAddress: meeting.sipAddress,
        locale: meeting.locale,
        timezone: meeting.timezone
      };
    } catch (error) {
      console.error('Error getting Webex meeting details:', error.response?.data || error.message);
      throw new Error(`Failed to get Webex meeting details: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Add a participant to the meeting
   * @param {string} meetingId - Meeting ID
   * @param {string} email - Participant email
   * @param {string} displayName - Participant display name (optional)
   * @returns {Promise<Object>} Invitee details
   */
  async addParticipant(meetingId, email, displayName = '') {
    try {
      const inviteeData = {
        personEmail: email,
        displayName: displayName || email.split('@')[0]
      };

      const response = await this.client.post(
        `/meetings/${meetingId}/invitees`,
        inviteeData
      );

      const invitee = response.data;

      return {
        success: true,
        inviteeId: invitee.id,
        email: invitee.personEmail,
        displayName: invitee.displayName,
        webexInviteeId: invitee.id
      };
    } catch (error) {
      console.error('Error adding Webex participant:', error.response?.data || error.message);
      throw new Error(`Failed to add participant: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get list of participants in a meeting
   * @param {string} meetingId - Meeting ID
   * @returns {Promise<Array>} List of participants
   */
  async getParticipants(meetingId) {
    try {
      const response = await this.client.get(`/meetings/${meetingId}/participants`);

      return response.data.items || [];
    } catch (error) {
      console.error('Error getting Webex participants:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get meeting recordings
   * @param {string} meetingId - Meeting ID
   * @returns {Promise<Array>} List of recordings
   */
  async getMeetingRecordings(meetingId) {
    try {
      const response = await this.client.get('/recordings', {
        params: { meetingId }
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error getting Webex recordings:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get a specific recording
   * @param {string} recordingId - Recording ID
   * @returns {Promise<Object>} Recording details
   */
  async getRecordingDetails(recordingId) {
    try {
      const response = await this.client.get(`/recordings/${recordingId}`);

      return response.data;
    } catch (error) {
      console.error('Error getting recording details:', error.response?.data || error.message);
      throw new Error(`Failed to get recording details: ${error.message}`);
    }
  }

  /**
   * Delete a recording
   * @param {string} recordingId - Recording ID
   * @returns {Promise<Object>} Confirmation
   */
  async deleteRecording(recordingId) {
    try {
      await this.client.delete(`/recordings/${recordingId}`);

      return {
        success: true,
        message: 'Recording deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting recording:', error.response?.data || error.message);
      throw new Error(`Failed to delete recording: ${error.message}`);
    }
  }

  /**
   * Validate if meeting token/user can access meeting
   * @param {string} meetingId - Meeting ID
   * @param {string} email - User email
   * @returns {Promise<boolean>} Whether user can access meeting
   */
  async validateMeetingAccess(meetingId, email) {
    try {
      const participants = await this.getParticipants(meetingId);
      return participants.some(p => p.personEmail === email);
    } catch (error) {
      console.error('Error validating meeting access:', error.message);
      return false;
    }
  }

  /**
   * Update meeting details
   * @param {string} meetingId - Meeting ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated meeting
   */
  async updateMeeting(meetingId, updates) {
    try {
      const response = await this.client.patch(`/meetings/${meetingId}`, updates);

      return response.data;
    } catch (error) {
      console.error('Error updating meeting:', error.response?.data || error.message);
      throw new Error(`Failed to update meeting: ${error.message}`);
    }
  }

  /**
   * Lock/unlock meeting
   * @param {string} meetingId - Meeting ID
   * @param {boolean} isLocked - Whether to lock the meeting
   * @returns {Promise<Object>} Updated meeting
   */
  async setMeetingLocked(meetingId, isLocked) {
    try {
      const response = await this.client.patch(`/meetings/${meetingId}`, {
        allowAnyoneToBeCoHost: !isLocked,
        entryExitTone: 'beep'
      });

      return {
        success: true,
        meetingId,
        isLocked
      };
    } catch (error) {
      console.error('Error locking meeting:', error.response?.data || error.message);
      throw new Error(`Failed to lock meeting: ${error.message}`);
    }
  }

  /**
   * Get current user info
   * @returns {Promise<Object>} Current user information
   */
  async getCurrentUser() {
    try {
      const response = await this.client.get('/people/me');

      return response.data;
    } catch (error) {
      console.error('Error getting current user:', error.response?.data || error.message);
      throw new Error(`Failed to get current user: ${error.message}`);
    }
  }

  /**
   * Test connection to Webex API
   * @returns {Promise<boolean>} Whether connection is successful
   */
  async testConnection() {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      console.error('Webex API connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = WebexMeetingService;
