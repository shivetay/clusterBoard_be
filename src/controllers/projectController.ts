import type { NextFunction, Request, Response } from 'express';
import ClusterProject from '../model/projectModel';
import ProjectStages from '../model/stageModel';
import Task from '../model/taskModel';
import User from '../model/userModel';
import { filterAllowedFields, STATUSES } from '../utils';
import AppError from '../utils/appError';

// GET all projects

export const getAllProjects = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const projects = await ClusterProject.find();

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      results: projects.length,
      data: {
        projects,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET project by :id

export const getProjectById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const project = await ClusterProject.findById(id).populate({
      path: 'project_stages',
      populate: {
        path: 'stage_tasks',
      },
    });

    if (!project) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      data: {
        project,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET all user's projects (where user is owner or investor)
export const getAllUserProjects = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ clerk_id: id });

    if (!user) {
      next(new AppError('USER_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    const projects = await ClusterProject.find({
      $or: [{ owner: id }, { investors: id }],
    });
    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      results: projects.length,
      data: {
        projects,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST create project

export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { project_name, owner, investors } = req.body;

    const checkUserId = await User.findOne({ clerk_id: owner });

    if (!checkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    const newProject = await ClusterProject.create({
      project_name,
      owner,
      investors,
    });

    res.status(STATUSES.CREATED).json({
      status: 'success',
      data: {
        project: newProject,
      },
      message: 'PROJECT_CREATED',
    });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    // Ensure user is authenticated (should be set by requireAuth middleware)
    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    // Find the project first to verify ownership
    const project = await ClusterProject.findById(id);

    if (!project) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    try {
      project.verifyOwner(req.clerkUserId, req.user.role);
    } catch (ownershipError) {
      next(ownershipError);
      return;
    }

    const removeUnmutableData = filterAllowedFields(
      req.body,
      'project_name',
      'investors',
    );

    const updatedProject = await ClusterProject.findByIdAndUpdate(
      id,
      removeUnmutableData,
      { new: true, runValidators: true },
    );

    if (!updatedProject) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      data: {
        project: updatedProject,
      },
      message: 'PROJECT_UPDATED',
    });
  } catch (error) {
    next(error);
  }
};

// DELETE project

export const deleteProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    // Ensure user is authenticated (should be set by requireAuth middleware)
    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    const project = await ClusterProject.findById(id);

    if (!project) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    try {
      project.verifyOwner(req.clerkUserId, req.user.role);
    } catch (ownershipError) {
      next(ownershipError);
      return;
    }

    //remove stages and tasks associated with the project
    try {
      await Task.deleteMany({ stage_id: id });
      await ProjectStages.deleteMany({
        cluster_project_id: id,
      });
    } catch (_error) {
      next(
        new AppError(
          'ERROR_DELETING_ASSOCIATED_STAGES_TASKS',
          STATUSES.SERVER_ERROR,
        ),
      );
    }

    const deletedProject = await ClusterProject.findByIdAndDelete(id);

    if (!deletedProject) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      message: 'PROJECT_DELETED',
    });
  } catch (error) {
    next(error);
  }
};

// PATCH change project status

export const changeProjectStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    // Ensure user is authenticated (should be set by requireAuth middleware)
    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    // Find the project first to verify ownership
    const project = await ClusterProject.findById(id);

    if (!project) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    try {
      project.verifyOwner(req.clerkUserId, req.user.role);
    } catch (ownershipError) {
      next(ownershipError);
      return;
    }

    const removeUnmutableData = filterAllowedFields(req.body, 'status');

    const updatedStatus = await ClusterProject.findByIdAndUpdate(
      id,
      removeUnmutableData,
      { new: true, runValidators: true },
    );

    if (!updatedStatus) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      data: {
        project: updatedStatus,
      },
      message: 'PROJECT_STATUS_UPDATED',
    });
  } catch (error) {
    next(error);
  }
};

// PATCH add project stage

export const addProjectStage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    // Ensure user is authenticated (should be set by requireAuth middleware)
    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    // Find the project first to verify ownership
    const project = await ClusterProject.findById(id);

    if (!project) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    try {
      project.verifyOwner(req.clerkUserId, req.user.role);
    } catch (ownershipError) {
      next(ownershipError);
      return;
    }

    const removeUnmutableData = filterAllowedFields(
      req.body,
      'project_name',
      'project_description',
      'investors',
    );

    const createdStage = await ProjectStages.create({
      cluster_project_id: id,
      stage_name: req.body.stage_name,
      stage_description: req.body.stage_description,
      removeUnmutableData,
    });

    if (!createdStage) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      data: {
        stage: createdStage,
      },
      message: 'STAGE_ADDED_TO_PROJECT',
    });
  } catch (error) {
    next(error);
  }
};

// TODO end project
