export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Email {
    const normalized = (raw || '').trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new Error('Địa chỉ Email không hợp lệ!');
    }
    return new Email(normalized);
  }

  static mask(email: string): string {
    if (!email || !email.includes('@')) return '******@cjfoods.com.vn';
    const [name, domain] = email.split('@');
    if (name.length <= 2) {
      return `${name[0]}*@${domain}`;
    }
    const maskedName = name[0] + '*'.repeat(Math.max(name.length - 2, 3)) + name[name.length - 1];
    return `${maskedName}@${domain}`;
  }
}
