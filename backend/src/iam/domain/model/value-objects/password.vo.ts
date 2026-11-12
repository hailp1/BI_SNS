export class PasswordPolicy {
  static readonly MIN_LENGTH = 8;

  static validate(plain: string): string {
    const clean = (plain || '').trim();
    if (clean.length < PasswordPolicy.MIN_LENGTH) {
      throw new Error(`Mật khẩu phải có tối thiểu ${PasswordPolicy.MIN_LENGTH} ký tự!`);
    }
    const classes = [/[a-z]/.test(clean), /[A-Z]/.test(clean), /[0-9]/.test(clean), /[^A-Za-z0-9]/.test(clean)].filter(
      Boolean,
    ).length;
    if (classes < 3) {
      throw new Error(
        'Mật khẩu phải bao gồm ít nhất 3 trong 4 nhóm ký tự: chữ hoa, chữ thường, chữ số, ký tự đặc biệt!',
      );
    }
    return clean;
  }
}
