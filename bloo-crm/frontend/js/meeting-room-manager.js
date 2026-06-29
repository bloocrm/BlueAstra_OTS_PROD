class SecureMeetingRoomManager {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.sessionId = null;
    this.sessionToken = null;
    this.sessionPassword = null;
    this.currentSession = null;
    this.heartbeatInterval = null;
    this.heartbeatFrequency = 30000; // 30 seconds
    this.isActive = false;
    this.participants = new Map();
    this.connectionState = 'disconnected'; // disconnected, connecting, connected, reconnecting
    this.maxReconnectAttempts = 5;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 5000;
    this.logoutWarningTimeout = null;
    this.logoutGracePeriod = 60000; // 60 seconds to confirm logout
    this.metricsCollectionInterval = null;
    this.eventEmitter = this.createEventEmitter();
  }

  createEventEmitter() {
    const handlers = {};

    return {
      on: (event, handler) => {
        if (!handlers[event]) {
          handlers[event] = [];
        }
        handlers[event].push(handler);
      },
      emit: (event, data) => {
        if (handlers[event]) {
          handlers[event].forEach(handler => handler(data));
        }
      },
      off: (event, handler) => {
        if (handlers[event]) {
          handlers[event] = handlers[event].filter(h => h !== handler);
        }
      }
    };
  }

  // Initialize meeting room with provider config
  async initializeRoom(config) {
    try {
      this.connectionState = 'connecting';
      this.eventEmitter.emit('state_change', { state: 'connecting' });

      const response = await this.apiClient.request('/meeting-rooms/session', {
        method: 'POST',
        body: JSON.stringify({
          provider: config.provider,
          meetingTitle: config.meetingTitle,
          meetingDescription: config.meetingDescription,
          providerApiKey: config.providerApiKey,
          clientId: config.clientId,
          leadId: config.leadId,
          maxParticipants: config.maxParticipants,
          recordingEnabled: config.recordingEnabled !== false,
          waitingRoomEnabled: config.waitingRoomEnabled !== false
        })
      });

      this.sessionId = response.data.sessionId;
      this.sessionToken = response.data.token;
      this.sessionPassword = response.data.sessionPassword;

      this.eventEmitter.emit('session_created', {
        sessionId: this.sessionId,
        provider: response.data.provider,
        encryptionLevel: response.data.encryptionLevel
      });

      return response.data;
    } catch (error) {
      this.connectionState = 'disconnected';
      this.eventEmitter.emit('error', {
        type: 'initialization_failed',
        message: error.message
      });
      throw error;
    }
  }

  // Join meeting room with persistence
  async joinRoom(sessionId, sessionPassword) {
    try {
      if (this.isActive) {
        this.eventEmitter.emit('warning', {
          message: 'Already in an active meeting room session'
        });
        return this.currentSession;
      }

      this.connectionState = 'connecting';
      this.eventEmitter.emit('state_change', { state: 'connecting' });

      const response = await this.apiClient.request(`/meeting-rooms/${sessionId}/join`, {
        method: 'POST',
        body: JSON.stringify({
          sessionToken: this.sessionToken,
          sessionPassword
        })
      });

      this.sessionId = sessionId;
      this.currentSession = response.data;
      this.isActive = true;
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;

      // Start heartbeat to keep session alive
      this.startHeartbeat();

      // Start collecting metrics
      this.startMetricsCollection();

      // Listen for logout events
      this.setupLogoutListener();

      this.eventEmitter.emit('joined', {
        sessionId: this.sessionId,
        provider: response.data.provider,
        encryptionLevel: response.data.encryptionLevel
      });

      return response.data;
    } catch (error) {
      this.connectionState = 'disconnected';
      this.eventEmitter.emit('error', {
        type: 'join_failed',
        message: error.message
      });
      throw error;
    }
  }

  // Send heartbeat to keep session alive
  async sendHeartbeat() {
    if (!this.isActive || !this.sessionId) {
      return;
    }

    try {
      const metrics = this.collectMetrics();

      await this.apiClient.request(`/meeting-rooms/${this.sessionId}/heartbeat`, {
        method: 'POST',
        body: JSON.stringify({ metrics })
      });

      this.eventEmitter.emit('heartbeat_sent', { timestamp: new Date() });

      // If reconnecting, switch back to connected state
      if (this.connectionState === 'reconnecting') {
        this.connectionState = 'connected';
        this.eventEmitter.emit('state_change', { state: 'connected' });
      }
    } catch (error) {
      console.error('Heartbeat failed:', error);

      if (this.connectionState === 'connected') {
        this.connectionState = 'reconnecting';
        this.eventEmitter.emit('state_change', { state: 'reconnecting' });
        this.attemptReconnect();
      }
    }
  }

  // Start periodic heartbeat
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(
      () => this.sendHeartbeat(),
      this.heartbeatFrequency
    );

    // Send initial heartbeat
    this.sendHeartbeat();
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Attempt to reconnect
  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.eventEmitter.emit('error', {
        type: 'reconnection_failed',
        message: 'Maximum reconnection attempts reached. Session terminated.'
      });
      await this.leaveRoom();
      return;
    }

    this.reconnectAttempts += 1;

    setTimeout(async () => {
      try {
        await this.sendHeartbeat();
      } catch (error) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        }
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  // Collect connection metrics
  collectMetrics() {
    return {
      timestamp: new Date(),
      participantCount: this.participants.size,
      connectionState: this.connectionState,
      bandwidth: this.estimateBandwidth(),
      latency: this.estimateLatency()
    };
  }

  // Start metrics collection
  startMetricsCollection() {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }

    this.metricsCollectionInterval = setInterval(() => {
      const metrics = this.collectMetrics();
      this.eventEmitter.emit('metrics_collected', metrics);
    }, 10000); // Every 10 seconds
  }

  // Stop metrics collection
  stopMetricsCollection() {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
    }
  }

  // Estimate bandwidth
  estimateBandwidth() {
    return {
      upload: Math.random() * 5000, // Simulated, would use real metrics
      download: Math.random() * 8000
    };
  }

  // Estimate latency
  estimateLatency() {
    return Math.random() * 100; // Simulated, would use real latency measurement
  }

  // Lock/unlock room
  async toggleRoomLock(shouldLock, reason = null) {
    if (!this.sessionId) {
      throw new Error('No active session');
    }

    try {
      const response = await this.apiClient.request(`/meeting-rooms/${this.sessionId}/lock`, {
        method: 'POST',
        body: JSON.stringify({ shouldLock, reason })
      });

      this.eventEmitter.emit('room_lock_changed', {
        isLocked: response.data.isLocked,
        reason: response.data.reason
      });

      return response.data;
    } catch (error) {
      this.eventEmitter.emit('error', {
        type: 'lock_failed',
        message: error.message
      });
      throw error;
    }
  }

  // Get current participants
  async getParticipants() {
    if (!this.sessionId) {
      throw new Error('No active session');
    }

    try {
      const response = await this.apiClient.request(`/meeting-rooms/${this.sessionId}/participants`, {
        method: 'GET'
      });

      this.participants = new Map(response.data.map(p => [p.userId, p]));
      this.eventEmitter.emit('participants_updated', response.data);

      return response.data;
    } catch (error) {
      console.error('Failed to get participants:', error);
      return [];
    }
  }

  // Setup logout listener with warning
  setupLogoutListener() {
    // Listen for logout events on the window
    window.addEventListener('beforeunload', (e) => {
      if (this.isActive) {
        e.preventDefault();
        e.returnValue = '';

        // Show warning
        this.showLogoutWarning();

        return '';
      }
    });

    // Also handle visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isActive) {
        this.eventEmitter.emit('warning', {
          message: 'Session backgrounded. Maintaining connection...'
        });
      }
    });
  }

  // Show logout warning with confirmation
  async showLogoutWarning() {
    try {
      await this.apiClient.request(`/meeting-rooms/${this.sessionId}/warn-logout`, {
        method: 'POST'
      });

      this.eventEmitter.emit('logout_warning', {
        message: 'You are about to log out. This will terminate your meeting session.',
        gracePeriod: this.logoutGracePeriod
      });

      // Set timeout to force logout
      if (this.logoutWarningTimeout) {
        clearTimeout(this.logoutWarningTimeout);
      }

      this.logoutWarningTimeout = setTimeout(() => {
        this.forceEndSession();
      }, this.logoutGracePeriod);
    } catch (error) {
      console.error('Failed to show logout warning:', error);
    }
  }

  // Cancel logout warning
  cancelLogoutWarning() {
    if (this.logoutWarningTimeout) {
      clearTimeout(this.logoutWarningTimeout);
      this.logoutWarningTimeout = null;
    }

    this.eventEmitter.emit('logout_cancelled', {
      message: 'Logout cancelled. Session continues.'
    });
  }

  // Leave room gracefully
  async leaveRoom() {
    try {
      this.stopHeartbeat();
      this.stopMetricsCollection();

      if (this.sessionId && this.isActive) {
        await this.apiClient.request(`/meeting-rooms/${this.sessionId}/leave`, {
          method: 'POST'
        });
      }

      this.isActive = false;
      this.connectionState = 'disconnected';
      this.participants.clear();

      this.eventEmitter.emit('left_room', {
        sessionId: this.sessionId,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }

  // Force end session (on logout)
  async forceEndSession() {
    try {
      this.stopHeartbeat();
      this.stopMetricsCollection();

      if (this.sessionId && this.isActive) {
        await this.apiClient.request(`/meeting-rooms/${this.sessionId}/end`, {
          method: 'POST'
        });
      }

      this.isActive = false;
      this.connectionState = 'disconnected';
      this.participants.clear();

      this.eventEmitter.emit('session_ended', {
        sessionId: this.sessionId,
        reason: 'logout',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  // Destroy manager
  destroy() {
    this.stopHeartbeat();
    this.stopMetricsCollection();
    if (this.isActive) {
      this.leaveRoom();
    }
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.SecureMeetingRoomManager = SecureMeetingRoomManager;
}
