import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY_PORT, UserRepositoryPort } from '../ports/user.repository.port';

@Injectable()
export class GetUsersQuery {
  constructor(@Inject(USER_REPOSITORY_PORT) private readonly userRepo: UserRepositoryPort) {}

  async listAll() {
    const users = await this.userRepo.findAll();
    return users.map((u) => u.toAdminView());
  }

  async findByUsername(username: string) {
    const user = await this.userRepo.findByUsername(username);
    return user ? user.toAdminView() : null;
  }
}
