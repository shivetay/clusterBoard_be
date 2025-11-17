import type { Document } from 'mongoose';

export interface IClusterProjectSchema extends Document {
  project_name: string;
  status: TProjectStatusType;
  investors: Array<string>;
  owner: string;
}

export type TProjectStatusType =
  | 'planning'
  | 'active'
  | 'completed'
  | 'on_hold'
  | 'cancelled';
