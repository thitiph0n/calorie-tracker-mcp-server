import { User, RegisterUserParams } from '../types/index.js';

export class UserRepository {
  constructor(private db: any) {}

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.prepare(
      'SELECT * FROM users WHERE email = ?'
    )
      .bind(email)
      .first();

    return result || null;
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db.prepare(
      'SELECT * FROM users WHERE id = ?'
    )
      .bind(id)
      .first();

    return result || null;
  }

  async findByApiKeyHash(apiKeyHash: string): Promise<User | null> {
    const result = await this.db.prepare(
      'SELECT * FROM users WHERE api_key_hash = ?'
    )
      .bind(apiKeyHash)
      .first();

    return result || null;
  }

  async create(userData: RegisterUserParams, apiKeyHash: string): Promise<string> {
    const userId = crypto.randomUUID();

    await this.db.prepare(
      `
      INSERT INTO users (id, name, email, api_key_hash, role)
      VALUES (?, ?, ?, ?, 'user')
      `
    )
      .bind(userId, userData.name, userData.email, apiKeyHash)
      .run();

    return userId;
  }

  async revokeApiKey(userId: string): Promise<boolean> {
    const result = await this.db.prepare(
      'UPDATE users SET api_key_hash = NULL WHERE id = ?'
    )
      .bind(userId)
      .run();

    return result.meta.changes > 0;
  }
}