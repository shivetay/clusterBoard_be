import type mongoose from 'mongoose';
import type { Document } from 'mongoose';

export interface ICommentsSchema extends Document {
  author: string;
  author_name: string;
  task_id: mongoose.Types.ObjectId;
  comment_text: string;
  is_edited?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
