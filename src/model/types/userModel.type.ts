import type { Document } from 'mongoose';
import type { IClusterProjectSchema } from './projectModel.type';
import type { IProjectStagesSchema } from './projectStagesModel.type';
import type { IStageTaskSchema } from './taskModel.type';

export interface IUserSchema extends Document {
  role: TUserRoleType;
  cluster_projects: Array<IClusterProjectSchema>;
  project_stages: Array<IProjectStagesSchema>;
  stage_tasks: Array<IStageTaskSchema>;
  clerk_id: string;
  user_name?: string;
  user_email?: string;
}

export type TUserRoleType =
  | 'investor'
  | 'cluster_owner'
  | 'cluster_god'
  | 'team_member';
