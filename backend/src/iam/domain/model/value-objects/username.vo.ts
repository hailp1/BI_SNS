export class Username {
  private constructor(public readonly value: string) {}

  static create(raw: string): Username {
    const normalized = (raw || '').toLowerCase().trim();
    if (!normalized || normalized.length < 3) {
      throw new Error('Username phải có tối thiểu 3 ký tự!');
    }
    return new Username(normalized);
  }
}
