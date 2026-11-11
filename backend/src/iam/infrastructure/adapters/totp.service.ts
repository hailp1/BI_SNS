import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';

@Injectable()
export class TotpService {
  generateSecretAndQr(username: string): Promise<{ secret: string; qrCodeDataUrl: string; otpauthUrl: string }> {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(username, 'CJ Foods SNS', secret);
    return qrcode.toDataURL(otpauthUrl).then((qrCodeDataUrl) => ({
      secret,
      qrCodeDataUrl,
      otpauthUrl,
    }));
  }

  verifyCode(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret });
  }
}
