class DataMigrationService {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.migrationStatus = {
      inProgress: false,
      completed: false,
      error: null,
      itemsProcessed: 0,
      totalItems: 0,
      startTime: null,
      endTime: null
    };
  }

  // Get data from localStorage
  getLocalStorageData() {
    const data = {
      clients: [],
      leads: [],
      communications: [],
      workflow: [],
      compliance: []
    };

    try {
      // Get clients from localStorage
      const clientsStr = localStorage.getItem('clients');
      if (clientsStr) {
        data.clients = JSON.parse(clientsStr);
      }

      // Get leads from localStorage
      const leadsStr = localStorage.getItem('leads');
      if (leadsStr) {
        data.leads = JSON.parse(leadsStr);
      }

      // Get communications from localStorage
      const communicationsStr = localStorage.getItem('communications');
      if (communicationsStr) {
        data.communications = JSON.parse(communicationsStr);
      }

      // Get workflow from localStorage
      const workflowStr = localStorage.getItem('workflow');
      if (workflowStr) {
        data.workflow = JSON.parse(workflowStr);
      }

      // Get compliance from localStorage
      const complianceStr = localStorage.getItem('compliance');
      if (complianceStr) {
        data.compliance = JSON.parse(complianceStr);
      }
    } catch (error) {
      console.error('Error reading localStorage:', error);
    }

    return data;
  }

  // Migrate clients to MongoDB
  async migrateClients(clients) {
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const client of clients) {
      try {
        await this.apiClient.createClient({
          name: client.name,
          email: client.email,
          phone: client.phone,
          company: client.company,
          jobTitle: client.jobTitle,
          spouseName: client.spouseName,
          childrenNames: client.childrenNames,
          beneficiaries: client.beneficiaries,
          insuranceDetails: client.insuranceDetails,
          investmentAccounts: client.investmentAccounts,
          homeAddress: client.homeAddress,
          officeAddress: client.officeAddress,
          accountants: client.accountants,
          attorneys: client.attorneys,
          documents: client.documents,
          annualIncome: client.annualIncome,
          netWorth: client.netWorth,
          investmentPreference: client.investmentPreference,
          status: client.status || 'active',
          riskProfile: client.riskProfile,
          communicationPreference: client.communicationPreference,
          notes: client.notes,
          tags: client.tags,
          customFields: client.customFields
        });

        results.successful += 1;
        this.migrationStatus.itemsProcessed += 1;
      } catch (error) {
        results.failed += 1;
        results.errors.push({
          item: client.email,
          error: error.message
        });
      }
    }

    return results;
  }

  // Migrate leads to MongoDB
  async migrateLeads(leads) {
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const lead of leads) {
      try {
        await this.apiClient.request('/leads', {
          method: 'POST',
          body: JSON.stringify({
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            jobTitle: lead.jobTitle,
            status: lead.status || 'new',
            source: lead.source,
            score: lead.score || 0,
            investmentAmount: lead.investmentAmount,
            budget: lead.budget,
            estimatedValue: lead.estimatedValue,
            currency: lead.currency || 'USD',
            description: lead.description,
            industry: lead.industry,
            businessType: lead.businessType,
            companySize: lead.companySize,
            location: lead.location,
            lastContactedAt: lead.lastContactedAt,
            nextFollowUpAt: lead.nextFollowUpAt,
            followUpNotes: lead.followUpNotes,
            conversationHistory: lead.conversationHistory,
            tags: lead.tags,
            notes: lead.notes,
            customFields: lead.customFields
          })
        });

        results.successful += 1;
        this.migrationStatus.itemsProcessed += 1;
      } catch (error) {
        results.failed += 1;
        results.errors.push({
          item: lead.email,
          error: error.message
        });
      }
    }

    return results;
  }

  // Migrate communications to MongoDB
  async migrateCommunications(communications) {
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const comm of communications) {
      try {
        await this.apiClient.request('/communications', {
          method: 'POST',
          body: JSON.stringify({
            type: comm.type,
            subject: comm.subject,
            content: comm.content,
            clientId: comm.clientId,
            leadId: comm.leadId,
            fromEmail: comm.fromEmail,
            toEmail: comm.toEmail,
            ccEmail: comm.ccEmail,
            bccEmail: comm.bccEmail,
            fromPhone: comm.fromPhone,
            toPhone: comm.toPhone,
            meetingDate: comm.meetingDate,
            meetingDuration: comm.meetingDuration,
            meetingLocation: comm.meetingLocation,
            status: comm.status || 'draft',
            priority: comm.priority || 'medium',
            outcome: comm.outcome,
            followUpRequired: comm.followUpRequired,
            followUpDate: comm.followUpDate,
            attachments: comm.attachments,
            tags: comm.tags,
            notes: comm.notes,
            customFields: comm.customFields
          })
        });

        results.successful += 1;
        this.migrationStatus.itemsProcessed += 1;
      } catch (error) {
        results.failed += 1;
        results.errors.push({
          item: comm.subject,
          error: error.message
        });
      }
    }

    return results;
  }

  // Start migration process
  async startMigration(options = {}) {
    this.migrationStatus.inProgress = true;
    this.migrationStatus.startTime = new Date();
    this.migrationStatus.itemsProcessed = 0;
    this.migrationStatus.error = null;

    try {
      // Get all local data
      const localData = this.getLocalStorageData();

      // Count total items
      this.migrationStatus.totalItems =
        localData.clients.length +
        localData.leads.length +
        localData.communications.length;

      const results = {
        clients: await this.migrateClients(localData.clients),
        leads: await this.migrateLeads(localData.leads),
        communications: await this.migrateCommunications(localData.communications)
      };

      this.migrationStatus.completed = true;
      this.migrationStatus.endTime = new Date();
      this.migrationStatus.inProgress = false;

      // Clear localStorage on successful migration (if requested)
      if (options.clearLocal) {
        this.clearLocalStorageData();
      }

      return {
        status: 'completed',
        results,
        duration: this.migrationStatus.endTime - this.migrationStatus.startTime,
        itemsProcessed: this.migrationStatus.itemsProcessed,
        totalItems: this.migrationStatus.totalItems
      };
    } catch (error) {
      this.migrationStatus.error = error.message;
      this.migrationStatus.inProgress = false;

      throw {
        status: 'failed',
        error: error.message,
        itemsProcessed: this.migrationStatus.itemsProcessed
      };
    }
  }

  // Clear localStorage data (after successful migration)
  clearLocalStorageData() {
    try {
      localStorage.removeItem('clients');
      localStorage.removeItem('leads');
      localStorage.removeItem('communications');
      localStorage.removeItem('workflow');
      localStorage.removeItem('compliance');
      localStorage.removeItem('payments');

      console.log('Local storage cleared after successful migration');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  // Get migration status
  getMigrationStatus() {
    return this.migrationStatus;
  }

  // Verify migration integrity
  async verifyMigration(localData) {
    try {
      // Get counts from server
      const clientsResponse = await this.apiClient.getClients(1, 1000);
      const leadsResponse = await this.apiClient.getLeads(1, 1000);
      const commsResponse = await this.apiClient.getCommunications(1, 1000);

      const serverCounts = {
        clients: clientsResponse.pagination?.total || 0,
        leads: leadsResponse.pagination?.total || 0,
        communications: commsResponse.pagination?.total || 0
      };

      const localCounts = {
        clients: localData.clients.length,
        leads: localData.leads.length,
        communications: localData.communications.length
      };

      return {
        verified:
          serverCounts.clients >= localCounts.clients &&
          serverCounts.leads >= localCounts.leads &&
          serverCounts.communications >= localCounts.communications,
        serverCounts,
        localCounts,
        discrepancies: {
          clients: serverCounts.clients - localCounts.clients,
          leads: serverCounts.leads - localCounts.leads,
          communications: serverCounts.communications - localCounts.communications
        }
      };
    } catch (error) {
      console.error('Migration verification error:', error);
      return {
        verified: false,
        error: error.message
      };
    }
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.DataMigrationService = DataMigrationService;
}
