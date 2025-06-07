import { UserProfile, ProfileWithCalculations } from '../types/index.js';

export class UserProfileRepository {
  constructor(private db: any) {}

  async createProfile(
    profile: Omit<UserProfile, 'created_at' | 'updated_at'>
  ): Promise<UserProfile> {
    const stmt = this.db.prepare(`
      INSERT INTO user_profiles (user_id, height_cm, age, gender, activity_level, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `);

    const result = await stmt
      .bind(
        profile.user_id,
        profile.height_cm,
        profile.age,
        profile.gender,
        profile.activity_level
      )
      .first();

    if (!result) {
      throw new Error('Failed to create user profile');
    }

    return result as UserProfile;
  }

  async getProfileById(
    userId: string
  ): Promise<ProfileWithCalculations | null> {
    const stmt = this.db.prepare(`
      SELECT 
        up.*,
        pt.id as tracking_id,
        pt.weight_kg,
        pt.muscle_mass_kg,
        pt.body_fat_percentage,
        pt.bmr_calories,
        pt.tdee_calories,
        pt.recorded_date,
        pt.created_at as tracking_created_at
      FROM user_profiles up
      LEFT JOIN profile_tracking pt ON up.user_id = pt.user_id 
        AND pt.recorded_date = (
          SELECT MAX(recorded_date) 
          FROM profile_tracking 
          WHERE user_id = up.user_id
        )
      WHERE up.user_id = ?
    `);

    const result = await stmt.bind(userId).first();

    if (!result) {
      return null;
    }

    const profile: ProfileWithCalculations = {
      user_id: result.user_id,
      height_cm: result.height_cm,
      age: result.age,
      gender: result.gender,
      activity_level: result.activity_level,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };

    if (result.tracking_id) {
      profile.latest_tracking = {
        id: result.tracking_id,
        user_id: result.user_id,
        weight_kg: result.weight_kg,
        muscle_mass_kg: result.muscle_mass_kg,
        body_fat_percentage: result.body_fat_percentage,
        bmr_calories: result.bmr_calories,
        tdee_calories: result.tdee_calories,
        recorded_date: result.recorded_date,
        created_at: result.tracking_created_at,
      };

      profile.bmr_calories = result.bmr_calories;
      profile.tdee_calories = result.tdee_calories;
    }

    return profile;
  }

  async updateProfile(
    userId: string,
    updates: Partial<Omit<UserProfile, 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<UserProfile> {
    const fields = [];
    const values = [];

    if (updates.height_cm !== undefined) {
      fields.push('height_cm = ?');
      values.push(updates.height_cm);
    }
    if (updates.age !== undefined) {
      fields.push('age = ?');
      values.push(updates.age);
    }
    if (updates.gender !== undefined) {
      fields.push('gender = ?');
      values.push(updates.gender);
    }
    if (updates.activity_level !== undefined) {
      fields.push('activity_level = ?');
      values.push(updates.activity_level);
    }

    if (fields.length === 0) {
      const existing = await this.getProfileById(userId);
      if (!existing) {
        throw new Error('Profile not found');
      }
      return existing;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const stmt = this.db.prepare(`
      UPDATE user_profiles 
      SET ${fields.join(', ')}
      WHERE user_id = ?
      RETURNING *
    `);

    const result = await stmt.bind(...values).first();

    if (!result) {
      throw new Error('Profile not found or update failed');
    }

    return result as UserProfile;
  }

  async deleteProfile(userId: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM user_profiles WHERE user_id = ?');
    const result = await stmt.bind(userId).run();
    return result.changes > 0;
  }
}
