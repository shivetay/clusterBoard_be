import mongoose from 'mongoose';
import { LOCALES } from '../locales';

const STAGE_NAME_MIN = 1;
const STAGE_NAME_MAX = 10;

const STAGE_DESCRIPTION_MAX = 25;

const projectStages = new mongoose.Schema(
  {
    cluster_project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClusterProject',
      required: true,
    },
    stage_name: {
      type: String,
      required: [true, LOCALES.PROJECT_STAGE_NAME],
      trim: true,
      minlength: [STAGE_NAME_MIN, LOCALES.PROJECT_STAGE_NAME_MIN_LENGTH],
      maxlength: [STAGE_NAME_MAX, LOCALES.PROJECT_STAGE_NAME_MAX_LENGTH],
    },
    stage_description: {
      type: String,
      trim: true,
      maxlength: [
        STAGE_DESCRIPTION_MAX,
        LOCALES.PROJECT_DESCRIPTION_STAGE_NAME_MAX_LENGTH,
      ],
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

projectStages.virtual('stage_tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'stage_id',
  justOne: false,
});

const ProjectStages = mongoose.model('ProjectStages', projectStages);

export default ProjectStages;
