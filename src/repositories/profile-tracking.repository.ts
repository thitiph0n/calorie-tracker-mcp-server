import { ProfileTracking } from '../types/index.js';
import { randomUUID } from 'crypto';

export class ProfileTrackingRepository {
  constructor(private db: any) {}

  async createTracking(
    tracking: Omit<ProfileTracking, 'id' | 'created_at'>
  ): Promise<ProfileTracking> {
    const id = randomUUID();

    const stmt = this.db.prepare(`
      INSERT INTO profile_tracking (
        id, user_id, weight_kg, muscle_mass_kg, body_fat_percentage, 
        bmr_calories, tdee_calories, recorded_date, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      RETURNING *
    `);

    const result = await stmt
      .bind(
        id,
        tracking.user_id,
        tracking.weight_kg || null,
        tracking.muscle_mass_kg || null,
        tracking.body_fat_percentage || null,
        tracking.bmr_calories || null,
        tracking.tdee_calories || null,
        tracking.recorded_date
      )
      .first();

    if (!result) {
      throw new Error('Failed to create tracking entry');
    }

    return result as ProfileTracking;
  }

  async getTrackingByUserId(
    userId: string,
    options: {
      date?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ProfileTracking[]> {
    let query = 'SELECT * FROM profile_tracking WHERE user_id = ?';
    const params = [userId];

    if (options.date) {
      query += ' AND recorded_date = ?';
      params.push(options.date);
    } else {
      if (options.startDate) {
        query += ' AND recorded_date >= ?';
        params.push(options.startDate);
      }
      if (options.endDate) {
        query += ' AND recorded_date <= ?';
        params.push(options.endDate);
      }
    }

    query += ' ORDER BY recorded_date DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit.toString());
    }

    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset.toString());
    }

    const stmt = this.db.prepare(query);
    const results = await stmt.bind(...params).all();

    return results.results as ProfileTracking[];
  }

  async getLatestTracking(userId: string): Promise<ProfileTracking | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM profile_tracking 
      WHERE user_id = ?
      ORDER BY recorded_date DESC, created_at DESC
      LIMIT 1
    `);

    const result = await stmt.bind(userId).first();
    return result as ProfileTracking | null;
  }

  async updateTracking(
    trackingId: string,
    updates: Partial<Omit<ProfileTracking, 'id' | 'user_id' | 'created_at'>>
  ): Promise<ProfileTracking> {
    const fields = [];
    const values = [];

    if (updates.weight_kg !== undefined) {
      fields.push('weight_kg = ?');
      values.push(updates.weight_kg);
    }
    if (updates.muscle_mass_kg !== undefined) {
      fields.push('muscle_mass_kg = ?');
      values.push(updates.muscle_mass_kg);
    }
    if (updates.body_fat_percentage !== undefined) {
      fields.push('body_fat_percentage = ?');
      values.push(updates.body_fat_percentage);
    }
    if (updates.bmr_calories !== undefined) {
      fields.push('bmr_calories = ?');
      values.push(updates.bmr_calories);
    }
    if (updates.tdee_calories !== undefined) {
      fields.push('tdee_calories = ?');
      values.push(updates.tdee_calories);
    }
    if (updates.recorded_date !== undefined) {
      fields.push('recorded_date = ?');
      values.push(updates.recorded_date);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(trackingId);

    const stmt = this.db.prepare(`
      UPDATE profile_tracking 
      SET ${fields.join(', ')}
      WHERE id = ?
      RETURNING *
    `);

    const result = await stmt.bind(...values).first();

    if (!result) {
      throw new Error('Tracking entry not found or update failed');
    }

    return result as ProfileTracking;
  }

  async deleteTracking(trackingId: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM profile_tracking WHERE id = ?');
    const result = await stmt.bind(trackingId).run();
    return result.changes > 0;
  }

  async getTrackingByDate(
    userId: string,
    date: string
  ): Promise<ProfileTracking | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM profile_tracking 
      WHERE user_id = ? AND recorded_date = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const result = await stmt.bind(userId, date).first();
    return result as ProfileTracking | null;
  }
}
