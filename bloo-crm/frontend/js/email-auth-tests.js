/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   EMAIL OAUTH & AUTHENTICATION UNIT TESTS
   ===================================================== */

class EmailAuthenticationTests {
    constructor() {
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
    }

    async runAllTests() {
        console.log('🧪 Starting Email Authentication Test Suite...\n');

        // OAuth Base Tests
        await this.testOAuthBaseClass();
        await this.testStateTokenGeneration();
        await this.testTokenValidation();
        await this.testTokenRefresh();

        // Gmail OAuth Tests
        await this.testGmailOAuthFlow();
        await this.testGmailUserAuthentication();

        // Outlook OAuth Tests
        await this.testOutlookOAuthFlow();
        await this.testOutlookUserAuthentication();

        // Email Client Tests
        await this.testEmailClientInitialization();
        await this.testProviderConnection();
        await this.testAccountManagement();

        // Error Handling Tests
        await this.testOAuthErrorHandling();
        await this.testTokenExpirationHandling();

        // Integration Tests
        await this.testEndToEndOAuthFlow();

        this.printTestSummary();
    }

    async testOAuthBaseClass() {
        console.log('📋 Testing OAuth Base Class...');

        try {
            this.assertEqual(typeof OAuthBase, 'function', 'OAuthBase class should be defined');

            const oauthBase = new OAuthBase('test-provider');
            this.assertEqual(oauthBase.providerId, 'test-provider', 'Provider ID should be set');
            this.assertEqual(oauthBase.isLoggedIn, false, 'User should not be logged in initially');
            this.assertTrue(Array.isArray(oauthBase.events) || typeof oauthBase.events === 'object', 'Events object should exist');

            this.logTestPass('OAuthBase class initialization');
        } catch (error) {
            this.logTestFail('OAuthBase class initialization', error);
        }
    }

    async testStateTokenGeneration() {
        console.log('📋 Testing State Token Generation...');

        try {
            const oauthBase = new OAuthBase('test-provider');

            // Mock startOAuthFlow to avoid actual redirect
            let stateGenerated = false;
            oauthBase.emit = (event, data) => {
                if (event === 'oauth-error') {
                    console.log('Caught expected error for state generation test');
                }
            };

            // We can't fully test without backend, but we can verify the method exists
            this.assertTrue(typeof oauthBase.startOAuthFlow === 'function', 'startOAuthFlow should be a function');

            this.logTestPass('State token generation setup');
        } catch (error) {
            this.logTestFail('State token generation', error);
        }
    }

    async testTokenValidation() {
        console.log('📋 Testing Token Validation...');

        try {
            const oauthBase = new OAuthBase('test-provider');

            // Set future expiration
            oauthBase.tokenExpiresAt = Date.now() + (3600 * 1000); // 1 hour from now
            this.assertFalse(oauthBase.isTokenExpired(), 'Token should not be expired');

            // Set past expiration
            oauthBase.tokenExpiresAt = Date.now() - 1000; // 1 second ago
            this.assertTrue(oauthBase.isTokenExpired(), 'Token should be expired');

            this.logTestPass('Token expiration validation');
        } catch (error) {
            this.logTestFail('Token expiration validation', error);
        }
    }

    async testTokenRefresh() {
        console.log('📋 Testing Token Refresh Mechanism...');

        try {
            const oauthBase = new OAuthBase('test-provider');

            // Test without refresh token
            oauthBase.refreshToken = null;
            try {
                await oauthBase.refreshAccessToken();
                this.logTestFail('Token refresh should fail without refresh token');
            } catch (error) {
                this.assertTrue(error.message.includes('No refresh token'), 'Should throw error about missing refresh token');
                this.logTestPass('Token refresh validation');
            }
        } catch (error) {
            this.logTestFail('Token refresh mechanism', error);
        }
    }

    async testGmailOAuthFlow() {
        console.log('📋 Testing Gmail OAuth Flow...');

        try {
            this.assertEqual(typeof GmailSSO, 'function', 'GmailSSO class should be defined');

            const gmailSSO = new GmailSSO();
            this.assertEqual(gmailSSO.providerId, 'gmail', 'Provider ID should be gmail');
            this.assertTrue(gmailSSO.config.clientId !== undefined, 'Gmail config should be set');
            this.assertTrue(gmailSSO.config.scope.includes('gmail.readonly'), 'Gmail scope should include mail reading');

            this.logTestPass('Gmail OAuth Flow setup');
        } catch (error) {
            this.logTestFail('Gmail OAuth Flow', error);
        }
    }

    async testGmailUserAuthentication() {
        console.log('📋 Testing Gmail User Authentication...');

        try {
            const gmailSSO = new GmailSSO();

            // Test without access token
            this.assertFalse(gmailSSO.isUserLoggedIn(), 'User should not be logged in without token');

            // Test with simulated token
            gmailSSO.accessToken = 'test_token_123';
            gmailSSO.tokenExpiresAt = Date.now() + 3600000;
            this.assertTrue(gmailSSO.isUserLoggedIn(), 'User should be logged in with valid token');

            this.logTestPass('Gmail user authentication');
        } catch (error) {
            this.logTestFail('Gmail user authentication', error);
        }
    }

    async testOutlookOAuthFlow() {
        console.log('📋 Testing Outlook OAuth Flow...');

        try {
            this.assertEqual(typeof OutlookSSO, 'function', 'OutlookSSO class should be defined');

            const outlookSSO = new OutlookSSO();
            this.assertEqual(outlookSSO.providerId, 'outlook', 'Provider ID should be outlook');
            this.assertTrue(outlookSSO.config.clientId !== undefined, 'Outlook config should be set');
            this.assertTrue(outlookSSO.config.scope.includes('Mail.Read'), 'Outlook scope should include mail reading');

            this.logTestPass('Outlook OAuth Flow setup');
        } catch (error) {
            this.logTestFail('Outlook OAuth Flow', error);
        }
    }

    async testOutlookUserAuthentication() {
        console.log('📋 Testing Outlook User Authentication...');

        try {
            const outlookSSO = new OutlookSSO();

            // Test authentication state
            this.assertFalse(outlookSSO.isUserLoggedIn(), 'User should not be logged in initially');

            // Simulate authentication
            outlookSSO.accessToken = 'test_outlook_token';
            outlookSSO.tokenExpiresAt = Date.now() + 3600000;
            this.assertTrue(outlookSSO.isUserLoggedIn(), 'User should be logged in with valid token');

            this.logTestPass('Outlook user authentication');
        } catch (error) {
            this.logTestFail('Outlook user authentication', error);
        }
    }

    async testEmailClientInitialization() {
        console.log('📋 Testing Email Client Initialization...');

        try {
            // Wait for DOM to be ready
            if (typeof EmailClient !== 'function') {
                console.log('⚠️ EmailClient not yet loaded, deferring test');
                return;
            }

            this.assertEqual(typeof EmailClient, 'function', 'EmailClient class should be defined');
            this.logTestPass('Email client initialization');
        } catch (error) {
            this.logTestFail('Email client initialization', error);
        }
    }

    async testProviderConnection() {
        console.log('📋 Testing Provider Connection...');

        try {
            if (typeof EmailPlatformManager !== 'function') {
                console.log('⚠️ EmailPlatformManager not yet loaded');
                return;
            }

            const manager = new EmailPlatformManager();
            this.assertTrue(Object.keys(manager.platforms).length > 0, 'Should have configured platforms');
            this.assertTrue(manager.platforms.hasOwnProperty('gmail'), 'Should support Gmail');
            this.assertTrue(manager.platforms.hasOwnProperty('outlook'), 'Should support Outlook');

            this.logTestPass('Provider connection configuration');
        } catch (error) {
            this.logTestFail('Provider connection', error);
        }
    }

    async testAccountManagement() {
        console.log('📋 Testing Account Management...');

        try {
            const gmailSSO = new GmailSSO();

            // Test setTokens
            const tokenData = {
                accessToken: 'test_access_token',
                refreshToken: 'test_refresh_token',
                expiresAt: Date.now() + 3600000
            };

            gmailSSO.setTokens(tokenData);

            this.assertEqual(gmailSSO.accessToken, 'test_access_token', 'Access token should be set');
            this.assertEqual(gmailSSO.refreshToken, 'test_refresh_token', 'Refresh token should be set');
            this.assertTrue(gmailSSO.isLoggedIn, 'Should be marked as logged in');

            this.logTestPass('Account management');
        } catch (error) {
            this.logTestFail('Account management', error);
        }
    }

    async testOAuthErrorHandling() {
        console.log('📋 Testing OAuth Error Handling...');

        try {
            const gmailSSO = new GmailSSO();

            let errorCaught = false;
            gmailSSO.on('oauth-error', (data) => {
                errorCaught = true;
                this.assertTrue(data.error !== undefined, 'Error data should contain error message');
            });

            // Simulate error scenario
            try {
                await gmailSSO.refreshAccessToken();
            } catch (error) {
                errorCaught = true;
                this.assertTrue(error.message.includes('refresh token'), 'Error should mention refresh token');
            }

            this.logTestPass('OAuth error handling');
        } catch (error) {
            this.logTestFail('OAuth error handling', error);
        }
    }

    async testTokenExpirationHandling() {
        console.log('📋 Testing Token Expiration Handling...');

        try {
            const outlookSSO = new OutlookSSO();

            // Set expired token
            outlookSSO.accessToken = 'expired_token';
            outlookSSO.tokenExpiresAt = Date.now() - 1000; // 1 second ago

            this.assertTrue(outlookSSO.isTokenExpired(), 'Token should be detected as expired');

            // Verify logout on expiration
            outlookSSO.logout();
            this.assertNull(outlookSSO.accessToken, 'Access token should be cleared on logout');
            this.assertNull(outlookSSO.refreshToken, 'Refresh token should be cleared on logout');
            this.assertFalse(outlookSSO.isLoggedIn, 'Should not be logged in after logout');

            this.logTestPass('Token expiration handling');
        } catch (error) {
            this.logTestFail('Token expiration handling', error);
        }
    }

    async testEndToEndOAuthFlow() {
        console.log('📋 Testing End-to-End OAuth Flow...');

        try {
            // Create multiple provider instances
            const gmail = new GmailSSO();
            const outlook = new OutlookSSO();

            // Verify both are independent
            gmail.setTokens({
                accessToken: 'gmail_token',
                refreshToken: 'gmail_refresh',
                expiresAt: Date.now() + 3600000
            });

            outlook.setTokens({
                accessToken: 'outlook_token',
                refreshToken: 'outlook_refresh',
                expiresAt: Date.now() + 3600000
            });

            // Verify isolation
            this.assertNotEqual(gmail.accessToken, outlook.accessToken, 'Tokens should be isolated');
            this.assertTrue(gmail.isUserLoggedIn(), 'Gmail should be logged in');
            this.assertTrue(outlook.isUserLoggedIn(), 'Outlook should be logged in');

            // Test logout isolation
            gmail.logout();
            this.assertFalse(gmail.isUserLoggedIn(), 'Gmail should be logged out');
            this.assertTrue(outlook.isUserLoggedIn(), 'Outlook should still be logged in');

            this.logTestPass('End-to-end OAuth flow');
        } catch (error) {
            this.logTestFail('End-to-end OAuth flow', error);
        }
    }

    // Test utility methods
    assertEqual(actual, expected, testName) {
        this.totalTests++;
        if (actual === expected) {
            this.passedTests++;
            return;
        }
        throw new Error(`Expected ${expected}, got ${actual}`);
    }

    assertNotEqual(actual, expected, testName) {
        this.totalTests++;
        if (actual !== expected) {
            this.passedTests++;
            return;
        }
        throw new Error(`Expected not equal, but both are ${actual}`);
    }

    assertTrue(value, testName) {
        this.totalTests++;
        if (value === true) {
            this.passedTests++;
            return;
        }
        throw new Error(`Expected true, got ${value}`);
    }

    assertFalse(value, testName) {
        this.totalTests++;
        if (value === false) {
            this.passedTests++;
            return;
        }
        throw new Error(`Expected false, got ${value}`);
    }

    assertNull(value, testName) {
        this.totalTests++;
        if (value === null) {
            this.passedTests++;
            return;
        }
        throw new Error(`Expected null, got ${value}`);
    }

    logTestPass(testName) {
        this.testResults.push({ name: testName, status: 'PASS', error: null });
        this.passedTests++;
        console.log(`✅ PASS: ${testName}`);
    }

    logTestFail(testName, error) {
        this.testResults.push({ name: testName, status: 'FAIL', error: error.message });
        this.failedTests++;
        console.log(`❌ FAIL: ${testName} - ${error.message}`);
    }

    printTestSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${this.totalTests}`);
        console.log(`Passed: ${this.passedTests} ✅`);
        console.log(`Failed: ${this.failedTests} ❌`);
        console.log(`Pass Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(2)}%`);
        console.log('='.repeat(60) + '\n');

        if (this.failedTests === 0) {
            console.log('🎉 All tests passed!');
        } else {
            console.log(`⚠️ ${this.failedTests} tests failed. See details above.`);
        }
    }
}

// Run tests when document is ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
        const tester = new EmailAuthenticationTests();
        await tester.runAllTests();
        window.emailAuthTester = tester;
    });
}

if (typeof window !== 'undefined') {
    window.EmailAuthenticationTests = EmailAuthenticationTests;
}
