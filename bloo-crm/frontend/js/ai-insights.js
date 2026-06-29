/* =====================================================
   AI INSIGHTS & ANALYSIS
   ===================================================== */

// Generate AI insights
function generateAIInsights() {
    const container = document.getElementById('aiInsightsContainer');
    container.innerHTML = '<p class="empty-state">Generating AI insights...</p>';
    
    // Simulate AI processing with timeout
    setTimeout(() => {
        const insights = generateAIAnalysis();
        displayAIInsights(insights);
    }, 1500);
}

// Generate AI analysis from data
function generateAIAnalysis() {
    const clients = getClients();
    const leads = getLeads();
    const communications = getCommunications();
    const stats = getDashboardStats();
    
    const insights = [];
    
    // Insight 1: Lead conversion opportunity
    const unconvertedLeads = leads.filter(l => l.status !== 'converted' && l.status !== 'lost');
    if (unconvertedLeads.length > 0) {
        const topLeads = unconvertedLeads.slice(0, 3);
        insights.push({
            type: 'opportunity',
            title: '🎯 Conversion Opportunities',
            icon: 'target',
            content: `You have ${unconvertedLeads.length} active leads. ${topLeads.length} of them are in advanced stages (interested/negotiating). Focus follow-up efforts on: ${topLeads.map(l => l.name).join(', ')}`,
            priority: 'high'
        });
    }
    
    // Insight 2: Communication frequency
    const commStats = getCommunicationStats();
    if (commStats.total > 0) {
        const avgCommPerClient = (commStats.thisMonth / Math.max(clients.length, 1)).toFixed(1);
        insights.push({
            type: 'communication',
            title: '💬 Communication Activity',
            icon: 'comments',
            content: `This month: ${commStats.thisMonth} communications logged. Average ${avgCommPerClient} communications per client. The most common type: ${Object.keys(commStats.byType).sort((a, b) => commStats.byType[b] - commStats.byType[a])[0]}`,
            priority: 'medium'
        });
    }
    
    // Insight 3: Client growth
    if (stats.conversions > 0) {
        insights.push({
            type: 'growth',
            title: '📈 Client Growth Metrics',
            icon: 'chart-line',
            content: `Excellent performance this month! ${stats.conversions} leads converted to clients. Revenue generated: ${formatCurrency(stats.totalRevenue)}. Maintain current engagement strategy.`,
            priority: 'medium'
        });
    }
    
    // Insight 4: Follow-up recommendations
    const contactsNeedingFollowUp = identifyContactsForFollowUp();
    if (contactsNeedingFollowUp.length > 0) {
        insights.push({
            type: 'action',
            title: '⏰ Follow-up Recommendations',
            icon: 'clock',
            content: `${contactsNeedingFollowUp.length} contacts need follow-up. Prioritize: ${contactsNeedingFollowUp.slice(0, 3).map(c => c.name).join(', ')}. Schedule calls to boost conversion rates.`,
            priority: 'high'
        });
    }
    
    // Insight 5: Sales velocity
    const salesVelocity = calculateSalesVelocity();
    insights.push({
        type: 'metric',
        title: '⚡ Sales Velocity Analysis',
        icon: 'bolt',
        content: `Your average lead-to-client conversion time: ${salesVelocity.avgDays} days. Current pipeline strength: ${salesVelocity.pipelineStrength}. ${salesVelocity.recommendation}`,
        priority: 'medium'
    });
    
    // Insight 6: Industry trends
    const industryTrends = analyzeIndustryTrends();
    if (industryTrends.topIndustry) {
        insights.push({
            type: 'trend',
            title: '🏢 Industry Insights',
            icon: 'industry',
            content: `Your strongest industry vertical: ${industryTrends.topIndustry} (${industryTrends.topIndustryCount} clients). Consider specializing more in this sector to improve sales efficiency.`,
            priority: 'low'
        });
    }
    
    return insights.sort((a, b) => {
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

// Display AI insights
function displayAIInsights(insights) {
    const container = document.getElementById('aiInsightsContainer');
    
    if (insights.length === 0) {
        container.innerHTML = `
            <div class="ai-card">
                <div class="ai-icon">
                    <i class="fas fa-info-circle"></i>
                </div>
                <h4>No Insights Available Yet</h4>
                <p>Start by adding clients, leads, and logging communications to get AI-powered insights!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = insights.map(insight => `
        <div class="ai-card">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div class="ai-icon" style="font-size: 2rem; margin-bottom: 0.5rem;">
                    <i class="fas fa-${insight.icon}"></i>
                </div>
                <span class="priority-badge priority-${insight.priority}">${insight.priority.toUpperCase()}</span>
            </div>
            <h4>${insight.title}</h4>
            <p style="text-align: left; margin-bottom: 0;">${insight.content}</p>
        </div>
    `).join('');
}

// Identify contacts needing follow-up
function identifyContactsForFollowUp() {
    const communications = getCommunications();
    const clients = getClients();
    const leads = getLeads();
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Find contacts with no recent communication
    const contactsNeedingFollowUp = [];
    
    clients.forEach(client => {
        const lastComm = communications
            .filter(c => c.contactId === client.id)
            .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))[0];
        
        if (!lastComm || new Date(lastComm.dateTime) < sevenDaysAgo) {
            contactsNeedingFollowUp.push(client);
        }
    });
    
    leads.forEach(lead => {
        const lastComm = communications
            .filter(c => c.contactId === lead.id)
            .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))[0];
        
        if (!lastComm || new Date(lastComm.dateTime) < sevenDaysAgo) {
            contactsNeedingFollowUp.push(lead);
        }
    });
    
    return contactsNeedingFollowUp;
}

// Calculate sales velocity
function calculateSalesVelocity() {
    const leads = getLeads();
    const convertedLeads = leads.filter(l => l.status === 'converted');
    
    if (convertedLeads.length === 0) {
        return {
            avgDays: 'N/A',
            pipelineStrength: 'Building',
            recommendation: 'Get more leads in the pipeline to improve velocity metrics.'
        };
    }
    
    const avgDays = convertedLeads.reduce((sum, lead) => {
        const created = new Date(lead.createdAt);
        const modified = new Date(lead.lastModified);
        const days = Math.floor((modified - created) / (1000 * 60 * 60 * 24));
        return sum + days;
    }, 0) / convertedLeads.length;
    
    let pipelineStrength = 'Weak';
    let recommendation = '';
    
    if (avgDays < 5) {
        pipelineStrength = 'Excellent';
        recommendation = 'Your team is converting leads very quickly! Maintain current momentum.';
    } else if (avgDays < 15) {
        pipelineStrength = 'Strong';
        recommendation = 'Good conversion pace. Focus on maintaining engagement with hot leads.';
    } else if (avgDays < 30) {
        pipelineStrength = 'Moderate';
        recommendation = 'Consider implementing faster follow-up strategies to accelerate conversions.';
    } else {
        pipelineStrength = 'Slow';
        recommendation = 'Implement more aggressive follow-up sequences to speed up conversions.';
    }
    
    return {
        avgDays: Math.round(avgDays),
        pipelineStrength,
        recommendation
    };
}

// Analyze industry trends
function analyzeIndustryTrends() {
    const clients = getClients();
    
    if (clients.length === 0) {
        return { topIndustry: null };
    }
    
    const industryCount = {};
    clients.forEach(client => {
        industryCount[client.industry] = (industryCount[client.industry] || 0) + 1;
    });
    
    const topIndustry = Object.keys(industryCount).sort((a, b) => 
        industryCount[b] - industryCount[a]
    )[0];
    
    return {
        topIndustry: capitalizeFirst(topIndustry),
        topIndustryCount: industryCount[topIndustry],
        allIndustries: industryCount
    };
}

// Get communication insights
function getCommunicationInsights() {
    const communications = getCommunications();
    const stats = getCommunicationStats();
    
    const insights = {
        totalCommunications: stats.total,
        thisMonth: stats.thisMonth,
        avgPerDay: (stats.thisMonth / 30).toFixed(1),
        totalDuration: stats.totalDuration,
        byType: stats.byType,
        mostCommonType: Object.keys(stats.byType).length > 0 
            ? Object.keys(stats.byType).sort((a, b) => stats.byType[b] - stats.byType[a])[0]
            : 'N/A'
    };
    
    return insights;
}

// Generate conversion rate analysis
function getConversionAnalysis() {
    const leads = getLeads();
    const converted = leads.filter(l => l.status === 'converted');
    const lost = leads.filter(l => l.status === 'lost');
    
    const conversionRate = leads.length > 0 
        ? ((converted.length / leads.length) * 100).toFixed(1)
        : 0;
    
    return {
        totalLeads: leads.length,
        convertedLeads: converted.length,
        lostLeads: lost.length,
        conversionRate: conversionRate + '%',
        lossRate: leads.length > 0 ? ((lost.length / leads.length) * 100).toFixed(1) + '%' : '0%'
    };
}

// Add priority badge styling
const priorityStyle = document.createElement('style');
priorityStyle.textContent = `
    .priority-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 2rem;
        font-size: 0.65rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .priority-high {
        background-color: rgba(239, 68, 68, 0.15);
        color: var(--danger);
    }

    .priority-medium {
        background-color: rgba(255, 140, 0, 0.15);
        color: var(--orange);
    }

    .priority-low {
        background-color: rgba(0, 102, 204, 0.15);
        color: var(--primary-blue);
    }
`;
document.head.appendChild(priorityStyle);
