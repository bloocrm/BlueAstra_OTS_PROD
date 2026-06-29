class SecureApiClient {
  constructor(baseURL = '/api', options = {}) {
    this.baseURL = baseURL;
    this.token = sessionStorage.getItem('authToken');
    this.refreshToken = sessionStorage.getItem('refreshToken');
    this.userId = sessionStorage.getItem('userId');
    this.tokenExpiresAt = parseInt(sessionStorage.getItem('tokenExpiresAt')) || 0;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.syncInterval = options.syncInterval || 5 * 60 * 1000;
    this.localStoragePrefix = 'bloo_crm_';
    this.initializeSync();
  }

  // Set authentication token
  setToken(token, refreshToken, expiresIn = 7 * 24 * 60 * 60) {
    this.token = token;
    this.refreshToken = refreshToken;
    this.tokenExpiresAt = Date.now() + (expiresIn * 1000);

    sessionStorage.setItem('authToken', token);
    sessionStorage.setItem('refreshToken', refreshToken);
    sessionStorage.setItem('tokenExpiresAt', this.tokenExpiresAt.toString());
  }

  // Clear authentication
  clearAuth() {
    this.token = null;
    this.refreshToken = null;
    this.userId = null;
    this.tokenExpiresAt = 0;

    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('tokenExpiresAt');
  }

  // Check if token is expired
  isTokenExpired() {
    return Date.now() >= this.tokenExpiresAt;
  }

  // Refresh authentication token
  async refreshAccessToken() {
    if (!this.refreshToken) {
      this.clearAuth();
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.refreshToken}`
        }
      });

      if (!response.ok) {
        this.clearAuth();
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.setToken(data.data.token, data.data.refreshToken, data.data.expiresIn);
      return this.token;
    } catch (error) {
      this.clearAuth();
      throw error;
    }
  }

  // Make secure API request
  async request(endpoint, options = {}) {
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }

    const url = this.baseURL + endpoint;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add auth token if available
    if (this.token) {
      // Check token expiry and refresh if needed
      if (this.isTokenExpired()) {
        await this.refreshAccessToken();
      }
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers
    };

    let lastError;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, config);

        if (response.status === 401) {
          // Try to refresh token and retry
          if (attempt === 0 && this.refreshToken) {
            await this.refreshAccessToken();
            headers['Authorization'] = `Bearer ${this.token}`;
            config.headers = headers;
            continue;
          }
          this.clearAuth();
          throw new Error('Unauthorized');
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw {
            status: response.status,
            message: errorData.message || 'API request failed',
            error: errorData.error,
            details: errorData.details
          };
        }

        const data = await response.json();
        return data;
      } catch (error) {
        lastError = error;

        if (attempt < this.retryAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('API request failed');
  }

  // ========== Authentication Methods ==========

  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    this.setToken(response.data.token, response.data.refreshToken);
    this.userId = response.data.user._id;
    sessionStorage.setItem('userId', this.userId);

    return response.data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  // ========== Client Methods ==========

  async getClients(page = 1, limit = 10, filters = {}) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });

    return this.request(`/clients?${params}`, { method: 'GET' });
  }

  async getClient(clientId) {
    return this.request(`/clients/${clientId}`, { method: 'GET' });
  }

  async createClient(clientData) {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(clientData)
    });
  }

  async updateClient(clientId, clientData) {
    return this.request(`/clients/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(clientData)
    });
  }

  async deleteClient(clientId) {
    return this.request(`/clients/${clientId}`, { method: 'DELETE' });
  }

  async addClientDocument(clientId, docData) {
    return this.request(`/clients/${clientId}/documents`, {
      method: 'POST',
      body: JSON.stringify(docData)
    });
  }

  // ========== Lead Methods ==========

  async getLeads(page = 1, limit = 10, filters = {}) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });

    return this.request(`/leads?${params}`, { method: 'GET' });
  }

  async getLead(leadId) {
    return this.request(`/leads/${leadId}`, { method: 'GET' });
  }

  async createLead(leadData) {
    return this.request('/leads', {
      method: 'POST',
      body: JSON.stringify(leadData)
    });
  }

  async updateLead(leadId, leadData) {
    return this.request(`/leads/${leadId}`, {
      method: 'PUT',
      body: JSON.stringify(leadData)
    });
  }

  async updateLeadStatus(leadId, status) {
    return this.request(`/leads/${leadId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async deleteLead(leadId) {
    return this.request(`/leads/${leadId}`, { method: 'DELETE' });
  }

  // ========== Communication Methods ==========

  async getCommunications(page = 1, limit = 10, filters = {}) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });

    return this.request(`/communications?${params}`, { method: 'GET' });
  }

  async createCommunication(commData) {
    return this.request('/communications', {
      method: 'POST',
      body: JSON.stringify(commData)
    });
  }

  async sendCommunication(commId) {
    return this.request(`/communications/${commId}/send`, { method: 'PATCH' });
  }

  // ========== Data Sync Methods ==========

  // Save data to localStorage
  saveToLocalStorage(key, data) {
    try {
      localStorage.setItem(this.localStoragePrefix + key, JSON.stringify(data));
    } catch (error) {
      console.error('localStorage save error:', error);
    }
  }

  // Get data from localStorage
  getFromLocalStorage(key) {
    try {
      const data = localStorage.getItem(this.localStoragePrefix + key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('localStorage read error:', error);
      return null;
    }
  }

  // Sync local data to server
  async syncToServer() {
    const pendingChanges = this.getFromLocalStorage('pendingChanges') || [];

    for (const change of pendingChanges) {
      try {
        if (change.type === 'client') {
          if (change.action === 'create') {
            await this.createClient(change.data);
          } else if (change.action === 'update') {
            await this.updateClient(change.data._id, change.data);
          } else if (change.action === 'delete') {
            await this.deleteClient(change.data._id);
          }
        }
        // Mark change as synced
        pendingChanges.splice(pendingChanges.indexOf(change), 1);
      } catch (error) {
        console.error('Sync error:', error);
      }
    }

    this.saveToLocalStorage('pendingChanges', pendingChanges);
  }

  // Initialize automatic sync
  initializeSync() {
    if (this.syncInterval > 0) {
      this.syncTimer = setInterval(() => {
        if (this.token && !this.isTokenExpired()) {
          this.syncToServer();
        }
      }, this.syncInterval);
    }
  }

  // Stop sync
  stopSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
  }

  // Destroy client
  destroy() {
    this.stopSync();
  }
}

// Export for use in browser
if (typeof window !== 'undefined') {
  window.SecureApiClient = SecureApiClient;
}
