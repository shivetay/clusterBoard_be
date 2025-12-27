import type { NextFunction, Request, Response } from 'express';
import ClusterProject from '../model/projectModel';
import ProjectStages from '../model/stageModel';
import Task from '../model/taskModel';
import User from '../model/userModel';
import { filterAllowedFields, STATUSES } from '../utils';
import AppError from '../utils/appError';
import { parseTaskNames } from '../utils/taskHelpers';

// GET all projects

export const getAllProjects = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const projects = await ClusterProject.find().populate({
      path: 'investors_name',
      select: 'user_name',
    });

    const projectsWithOwnerName = projects.map((project) => ({
      ...project.toObject(),
      owner_name: project.owner?.owner_name,
    }));

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      results: projectsWithOwnerName.length,
      data: {
        projects: projectsWithOwnerName,
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

    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    const project = await ClusterProject.findById(id)
      .populate({
        path: 'project_stages',
        populate: {
          path: 'stage_tasks',
        },
      })
      .populate({
        path: 'investors_name',
        select: 'user_name',
      });

    if (!project) {
      next(new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    // Add access level information like getAllUserProjects does
    const accessLevel = project.getUserAccessLevel(
      req.clerkUserId,
      req.user.role,
    );

    const projectWithAccess = {
      ...project.toObject(),
      user_access: accessLevel,
      is_owner: accessLevel === 'owner',
      is_investor: accessLevel === 'investor',
      owner_name: project.owner?.owner_name,
    };

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      data: {
        project: projectWithAccess,
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
  // try {
  //   const { id } = req.params;
  //   const user = await User.findOne({ clerk_id: id });
  //   if (!user) {
  //     next(new AppError('USER_NOT_FOUND', STATUSES.NOT_FOUND));
  //     return;
  //   }

  //   const projects = await ClusterProject.find({
  //     $or: [{ 'owner.owner_id': id }, { investors: id }],
  //   }).populate({
  //     path: 'investors_name',
  //     select: 'user_name',
  //   });

  //   res.status(STATUSES.SUCCESS).json({
  //     status: 'success',
  //     results: projects.length,
  //     data: {
  //       projects,
  //     },
  //   });
  // } catch (error) {
  //   next(error);
  // }

  try {
    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    const projects = await ClusterProject.find({
      $or: [
        { 'owner.owner_id': req.clerkUserId },
        { investors: req.clerkUserId },
      ],
    }).populate({
      path: 'investors_name',
      select: 'user_name',
    });

    const projectsWithAccess = projects.map((project) => {
      const accessLevel = project.getUserAccessLevel(
        req.clerkUserId!,
        req.user!.role,
      );

      return {
        ...project.toObject(),
        user_access: accessLevel,
        is_owner: accessLevel === 'owner',
        is_investor: accessLevel === 'investor',
        owner_name: project.owner?.owner_name,
      };
    });

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      results: projectsWithAccess.length,
      data: {
        projects: projectsWithAccess,
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
    const {
      project_name,
      owner: { owner_id, owner_name },
      investors,
      start_date,
      end_date,
      project_description,
    } = req.body;

    const checkUserId = await User.findOne({ clerk_id: owner_id });

    if (!checkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    const newProject = await ClusterProject.create({
      project_name,
      owner: { owner_id, owner_name },
      investors,
      start_date,
      end_date,
      project_description,
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
      'project_description',
      'start_date',
      'end_date',
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
      const projectStages = await ProjectStages.find({
        cluster_project_id: id,
      }).select('_id');

      const stageIds = projectStages.map((stage) => stage._id);

      if (stageIds.length > 0) {
        await Task.deleteMany({ stage_id: { $in: stageIds } });
      }

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

    const removeUnmutableData = filterAllowedFields(req.body, 'project_status');

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

    const createdStage = await ProjectStages.create({
      cluster_project_id: id,
      stage_name: req.body.stage_name,
      stage_description: req.body.stage_description,
      owner: req.clerkUserId,
    });

    // Tasks are optional during stage creation - they can be added separately
    if (req.body.stage_tasks) {
      const taskNames = parseTaskNames(req.body.stage_tasks, next);

      // If parseTaskNames returns null, it means it already called next() with an error
      if (!taskNames) {
        return;
      }

      // Only create tasks if at least one task name was provided after parsing
      if (taskNames.length > 0) {
        const mappedTasks = taskNames.map((name) => ({
          stage_id: createdStage._id,
          task_name: name,
          is_done: false,
          owner: req.clerkUserId,
        }));

        await Task.insertMany(mappedTasks);
      }
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
