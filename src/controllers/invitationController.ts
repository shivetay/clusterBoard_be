import { clerkClient } from '@clerk/express';
import type { NextFunction, Request, Response } from 'express';
import validator from 'validator';
import Invitation from '../model/invitationModel';
import ClusterProject from '../model/projectModel';
import { InvitationService } from '../services';
import { STATUSES } from '../utils';
import AppError from '../utils/appError';

// POST invite investor (Recommended approach)
export const inviteInvestor = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { project_id, invitee_email, message } = req.body;

    // Validate input
    if (!project_id || !invitee_email) {
      next(new AppError('PROJECT_ID_AND_EMAIL_REQUIRED', STATUSES.BAD_REQUEST));
      return;
    }

    if (!validator.isEmail(invitee_email)) {
      next(new AppError('INVALID_EMAIL_FORMAT', STATUSES.BAD_REQUEST));
      return;
    }

    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    // Verify ownership
    const project = await ClusterProject.findById(project_id);
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

    // Use service layer (or model directly if no service layer)
    const invitation = await InvitationService.createAndSendInvitation(
      project_id,
      req.clerkUserId,
      invitee_email,
      message,
    );

    res.status(STATUSES.CREATED).json({
      status: 'success',
      data: { invitation },
      message: 'INVITATION_SENT',
    });
  } catch (error) {
    next(error);
  }
};

// GET invitation details by token
export const getInvitationByToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.params;

    if (!token) {
      next(new AppError('TOKEN_REQUIRED', STATUSES.BAD_REQUEST));
      return;
    }

    const invitation = await Invitation.findByToken(token);
    if (invitation) {
      await invitation.populate({
        path: 'project',
        select: 'project_name project_description owner',
      });
    }

    if (!invitation) {
      next(new AppError('INVITATION_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    if (!invitation.isValid()) {
      if (invitation.status === 'accepted') {
        next(new AppError('INVITATION_ALREADY_ACCEPTED', STATUSES.BAD_REQUEST));
        return;
      }
      if (invitation.expires_at <= new Date()) {
        next(new AppError('INVITATION_EXPIRED', STATUSES.BAD_REQUEST));
        return;
      }
      next(new AppError('INVITATION_INVALID', STATUSES.BAD_REQUEST));
      return;
    }

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      data: {
        invitation,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST accept invitation (Recommended approach with email verification)
export const acceptInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.body;
    if (!token) {
      next(new AppError('TOKEN_REQUIRED', STATUSES.BAD_REQUEST));
      return;
    }

    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    // Get user email (required for verification)
    const clerkUser = await clerkClient.users.getUser(req.clerkUserId);
    if (!clerkUser.emailAddresses[0]?.emailAddress) {
      next(new AppError('USER_EMAIL_NOT_FOUND', STATUSES.BAD_REQUEST));
      return;
    }

    // Use service layer (or model directly)
    const { project, alreadyInvestor } =
      await InvitationService.acceptInvitation(
        token,
        req.clerkUserId,
        clerkUser.emailAddresses[0]?.emailAddress,
      );

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      data: {
        project,
        alreadyInvestor,
      },
      message: alreadyInvestor ? 'ALREADY_INVESTOR' : 'INVITATION_ACCEPTED',
    });
  } catch (error) {
    next(error);
  }
};

// GET all invitations for a project
export const getProjectInvitations = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      next(new AppError('PROJECT_ID_REQUIRED', STATUSES.BAD_REQUEST));
      return;
    }

    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    const project = await ClusterProject.findById(projectId);

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

    const invitations = await Invitation.findByProject(projectId);
    await invitations[0]?.populate({
      path: 'project',
      select: 'project_name',
    });

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      results: invitations.length,
      data: {
        invitations,
      },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE cancel invitation
export const cancelInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { invitationId } = req.params;

    if (!req.user || !req.clerkUserId) {
      next(new AppError('AUTH_ERROR_USER_NOT_FOUND', STATUSES.UNAUTHORIZED));
      return;
    }

    const invitation =
      await Invitation.findById(invitationId).populate('project');

    if (!invitation) {
      next(new AppError('INVITATION_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    const project = await ClusterProject.findById(invitation.project_id);

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

    await invitation.cancel();

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      message: 'INVITATION_CANCELLED',
    });
  } catch (error) {
    next(error);
  }
};
