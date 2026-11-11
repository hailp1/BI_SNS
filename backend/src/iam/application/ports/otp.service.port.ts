export const OTP_SERVICE_PORT = Symbol('OTP_SERVICE_PORT');

export interface OtpDispatchResult {
  maskedEmail: string;
  isLiveSent: boolean;
}

export interface OtpServicePort {
  generateAndSendEmailOtp(params: {
    userId: string;
    email: string;
    fullName: string;
    ip: string;
    userAgent: string;
  }): Promise<OtpDispatchResult>;
  verifyEmailOtp(userId: string, code: string): Promise<boolean>;
}
