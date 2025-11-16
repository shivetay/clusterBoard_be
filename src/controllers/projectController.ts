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
    return;
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
    }

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      data: {
        project,
      },
    });
  } catch (error) {
    next(error);
    return;
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

    const checkUserId = await User.findById(owner);

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
    return;
  }
};

export const updateProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!id) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    const removeUnmutableData = filterAllowedFields(
      req.body,
      'project_name',
      'investors',
    );

    const updatedProject = await ClusterProject.findByIdAndUpdate(
      req.params.id,
      removeUnmutableData,
      { new: true, runValidators: true, current_user: req.body.current_user },
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
    return;
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

    if (!id) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
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
    return;
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

    if (!id) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    const removeUnmutableData = filterAllowedFields(req.body, 'status');

    const updatedStatus = await ClusterProject.findByIdAndUpdate(
      req.params.id,
      removeUnmutableData,
      { new: true, runValidators: true, current_user: req.body.current_user },
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
