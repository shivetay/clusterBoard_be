import type { NextFunction, Request, Response } from 'express';
import ClusterProject from '../model/projectModel';
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
    const project = await ClusterProject.findById(id);

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

    if (!req.user) {
      next(new AppError('AUTH_ERROR_NOT_LOGGED_IN', STATUSES.UNAUTHORIZED));
      return;
    }

    const isSelf = req.user.id === id;
    const isSuperUser = req.user.role === 'cluster_god';

    if (!isSelf && !isSuperUser) {
      next(new AppError('AUTH_ERROR_FORBIDDEN', STATUSES.FORBIDDEN));
      return;
    }

    const user = await User.findById(id);

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
    if (!req.user) {
      next(new AppError('AUTH_ERROR_NOT_LOGGED_IN', STATUSES.UNAUTHORIZED));
      return;
    }

    const { project_name, owner, investors } = req.body;

    const ownerId =
      req.user.role === 'cluster_god' && owner ? owner : req.user.id;

    const checkUserId = await User.findById(ownerId);

    if (!checkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    const newProject = await ClusterProject.create({
      project_name,
      owner: ownerId,
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
    if (!req.user) {
      next(new AppError('AUTH_ERROR_NOT_LOGGED_IN', STATUSES.UNAUTHORIZED));
      return;
    }

    const { id } = req.params;

    const removeUnmutableData = filterAllowedFields(
      req.body,
      'project_name',
      'investors',
    );

    const updateOptions =
      req.user.role === 'cluster_god'
        ? { new: true, runValidators: true }
        : {
            new: true,
            runValidators: true,
            current_user: req.user.id,
          };

    const updatedProject = await ClusterProject.findByIdAndUpdate(
      id,
      removeUnmutableData,
      updateOptions,
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
    if (!req.user) {
      next(new AppError('AUTH_ERROR_NOT_LOGGED_IN', STATUSES.UNAUTHORIZED));
      return;
    }

    const { id } = req.params;

    const deleteOptions =
      req.user.role === 'cluster_god'
        ? undefined
        : { current_user: req.user.id };

    const deletedProject = await ClusterProject.findByIdAndDelete(
      id,
      deleteOptions,
    );

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
    if (!req.user) {
      next(new AppError('AUTH_ERROR_NOT_LOGGED_IN', STATUSES.UNAUTHORIZED));
      return;
    }

    const { id } = req.params;

    const removeUnmutableData = filterAllowedFields(req.body, 'status');

    const updateOptions =
      req.user.role === 'cluster_god'
        ? { new: true, runValidators: true }
        : {
            new: true,
            runValidators: true,
            current_user: req.user.id,
          };

    const updatedStatus = await ClusterProject.findByIdAndUpdate(
      id,
      removeUnmutableData,
      updateOptions,
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
