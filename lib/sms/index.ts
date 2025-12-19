// SMS abstraction layer
// MVP: Mock implementation
// Future: Replace with real provider (Twilio, etc.)

export interface SMSProvider {
  sendOTP(phone: string, code: string): Promise<void>
  sendCampaign(phone: string, message: string): Promise<void>
}

class MockSMSProvider implements SMSProvider {
  async sendOTP(phone: string, code: string): Promise<void> {
    // In MVP, just log to console
    console.log(`[MOCK SMS] OTP to ${phone}: ${code}`)
    // In production, replace with actual SMS API call
  }

  async sendCampaign(phone: string, message: string): Promise<void> {
    // In MVP, just log to console
    console.log(`[MOCK SMS] Campaign to ${phone}: ${message}`)
    // In production, replace with actual SMS API call
  }
}

// Export singleton instance
export const smsProvider: SMSProvider = new MockSMSProvider()

