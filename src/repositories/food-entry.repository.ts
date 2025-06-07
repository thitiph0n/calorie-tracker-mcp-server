import { FoodEntry, AddEntryParams, UpdateEntryParams, ListEntriesParams } from '../types/index.js';

export class FoodEntryRepository {
  constructor(private db: any) {}

  async create(entryData: AddEntryParams, userId: string): Promise<string> {
    const entryId = crypto.randomUUID();
    const entryDate = entryData.entry_date || new Date().toISOString().split('T')[0];

    await this.db.prepare(
      `
      INSERT INTO food_entries (id, user_id, food_name, calories, protein_g, carbs_g, fat_g, meal_type, entry_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
      .bind(
        entryId,
        userId,
        entryData.food_name,
        entryData.calories,
        entryData.protein_g || null,
        entryData.carbs_g || null,
        entryData.fat_g || null,
        entryData.meal_type || null,
        entryDate
      )
      .run();

    return entryId;
  }

  async findByUserAndDate(userId: string, params: ListEntriesParams): Promise<FoodEntry[]> {
    const { date, limit = 10, offset = 0 } = params;

    const result = await this.db.prepare(
      `
      SELECT * FROM food_entries
      WHERE user_id = ? AND entry_date = COALESCE(?, CURRENT_DATE)
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
      `
    )
      .bind(userId, date || null, limit, offset)
      .all();

    return result.results;
  }

  async update(entryId: string, userId: string, updateData: Omit<UpdateEntryParams, 'entry_id'>): Promise<boolean> {
    const updates: string[] = [];
    const values: any[] = [];

    if (updateData.food_name !== undefined) {
      updates.push('food_name = ?');
      values.push(updateData.food_name);
    }
    if (updateData.calories !== undefined) {
      updates.push('calories = ?');
      values.push(updateData.calories);
    }
    if (updateData.protein_g !== undefined) {
      updates.push('protein_g = ?');
      values.push(updateData.protein_g);
    }
    if (updateData.carbs_g !== undefined) {
      updates.push('carbs_g = ?');
      values.push(updateData.carbs_g);
    }
    if (updateData.fat_g !== undefined) {
      updates.push('fat_g = ?');
      values.push(updateData.fat_g);
    }
    if (updateData.meal_type !== undefined) {
      updates.push('meal_type = ?');
      values.push(updateData.meal_type);
    }

    if (updates.length === 0) {
      return false;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(entryId, userId);

    const result = await this.db.prepare(
      `
      UPDATE food_entries 
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
      `
    )
      .bind(...values)
      .run();

    return result.meta.changes > 0;
  }

  async delete(entryId: string, userId: string): Promise<boolean> {
    const result = await this.db.prepare(
      `DELETE FROM food_entries WHERE id = ? AND user_id = ?`
    )
      .bind(entryId, userId)
      .run();

    return result.meta.changes > 0;
  }
}