import type { Document } from 'mongoose';

export interface IStageTaskSchema extends Document {
  stage_id: string;
  task_name: string;
  task_description?: string;
  is_done: boolean;
  is_edited?: boolean;
  createdAt: Date;
  updatedAt: Date;
  owner: string;
}
