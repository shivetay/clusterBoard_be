import mongoose from 'mongoose';
import { LOCALES } from '../locales';
import type { ICommentsSchema } from './types';

const MAX_LENGTH = 250;

const commentsSchema = new mongoose.Schema<ICommentsSchema>(
  {
    author: {
      type: String,
      ref: 'User',
      required: true,
    },
    author_name: {
      type: String,
      required: true,
    },
    task_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    comment_text: {
      type: String,
      required: true,
      maxlength: [MAX_LENGTH, LOCALES.COMMENT_MAX_LENGTH],
    },
    is_edited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);
const Comment = mongoose.model('Comment', commentsSchema);

export default Comment;
