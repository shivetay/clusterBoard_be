import mongoose from 'mongoose';
import { LOCALES } from '../locales';

const MIN_TASK_NAME_LENGTH = 3;

const taskSchema = new mongoose.Schema(
  {
    stage_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectStages',
      required: true,
    },
    task_name: {
      type: String,
      required: [true, LOCALES.TASK_NAME],
      trim: true,
      minlength: [MIN_TASK_NAME_LENGTH, LOCALES.TASK_NAME_MIN_LENGTH],
    },
    is_done: {
      type: Boolean,
      default: false,
    },
    owner: {
      type: String,
      ref: 'User',
      required: true,
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

taskSchema.virtual('task_comments', {
  ref: 'Comment',
  foreignField: 'task_id',
  localField: '_id',
  justOne: false,
});

const Task = mongoose.model('Task', taskSchema);

export default Task;
