export class PasswordPolicy {
  static readonly MIN_LENGTH = 8;

  static validate(plain: string): string {
    const clean = (plain || '').trim();
    if (clean.length < PasswordPolicy.MIN_LENGTH) {
      throw new Error(`Mật khẩu phải có tối thiểu ${PasswordPolicy.MIN_LENGTH} ký tự!`);
    }
    return clean;
  }
}
