import { clerkClient } from '@clerk/express';
import type { NextFunction, Request, Response } from 'express';
import validator from 'validator';
import Invitation from '../model/invitationModel';
import ClusterProject from '../model/projectModel';
import User from '../model/userModel';
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
    await InvitationService.createAndSendInvitation(
      project_id,
      req.clerkUserId,
      invitee_email,
    );

    res.status(STATUSES.CREATED).json({
      status: 'success',

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

    // Find invitation by token regardless of status to check cancellation
    const invitation = await Invitation.findOne({ token });

    if (!invitation) {
      next(new AppError('INVITATION_NOT_FOUND', STATUSES.NOT_FOUND));
      return;
    }

    // Check if invitation is cancelled first
    if (invitation.status === 'cancelled') {
      next(new AppError('INVITATION_CANCELLED', STATUSES.BAD_REQUEST));
      return;
    }

    // Populate project if invitation exists
    await invitation.populate({
      path: 'project',
      select: 'project_name project_description owner',
    });

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

    // Populate project and inviter for all invitations
    await Promise.all(
      invitations.map((invitation) =>
        Promise.all([
          invitation.populate({
            path: 'project',
            select: 'project_name owner',
          }),
          invitation.populate({
            path: 'inviter',
            select: 'user_name',
          }),
        ]),
      ),
    );

    // Get recipient names by looking up users by email
    const invitationsWithRecipientNames = await Promise.all(
      invitations.map(async (invitation) => {
        const invitationObj = invitation.toObject();

        // Add inviter name if populated
        if (invitationObj.inviter?.user_name) {
          invitationObj.inviter_name = invitationObj.inviter.user_name;
        }
        // Remove inviter object to keep response clean
        delete invitationObj.inviter;

        // Look up user by email to get recipient name
        const recipientUser = await User.findOne({
          user_email: invitation.invitee_email.toLowerCase().trim(),
        });

        // Add recipient name if found
        if (recipientUser?.user_name) {
          invitationObj.recipient_name = recipientUser.user_name;
        }

        return invitationObj;
      }),
    );

    res.status(STATUSES.SUCCESS).json({
      status: 'success',
      results: invitationsWithRecipientNames.length,
      data: {
        invitations: invitationsWithRecipientNames,
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
