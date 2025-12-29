import Invitation from '../model/invitationModel';
import ClusterProject from '../model/projectModel';
import type { IClusterProjectSchema, IInvitationSchema } from '../model/types';
import User from '../model/userModel';
import { STATUSES } from '../utils';
import AppError from '../utils/appError';
import { sendInvestorInvitationEmail } from './email-service';

// biome-ignore lint/complexity/noStaticOnlyClass: <email>
export class InvitationService {
  /**
   * Create and send invitation
   */
  static async createAndSendInvitation(
    projectId: string,
    inviterId: string,
    inviteeEmail: string,
    message?: string,
  ): Promise<IInvitationSchema> {
    // Verify project exists
    const project = await ClusterProject.findById(projectId);
    if (!project) {
      throw new AppError('PROJECT_NOT_FOUND', STATUSES.NOT_FOUND);
    }

    // Check if email can be invited (using model method)
    const { canInvite, reason } = await project.canInviteEmail(inviteeEmail);
    if (!canInvite) {
      throw new AppError(reason ?? 'INVITE_NOT_ALLOWED', STATUSES.BAD_REQUEST);
    }

    // Create invitation (using model static method)
    const invitation = await Invitation.createInvitation(
      project._id,
      inviterId,
      inviteeEmail,
      message,
    );

    // Get inviter info for email
    const inviter = await User.findOne({ clerk_id: inviterId });

    // Send email (non-blocking, log errors but don't fail)
    try {
      const inviterNameValue = inviter?.user_name ?? inviter?.clerk_id;
      await sendInvestorInvitationEmail({
        inviteeEmail: invitation.invitee_email,
        projectName: project.project_name,
        invitationLink: `/invite/accept?token=${invitation.token}`,
        ...(inviterNameValue ? { inviterName: inviterNameValue } : {}),
        ...(invitation.message ? { message: invitation.message } : {}),
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Optionally: mark invitation with a flag for retry
      try {
        await Invitation.updateOne(
          { _id: invitation._id },
          {
            $set: {
              email_send_failed: true,
              last_email_error: String(emailError),
              last_email_error_at: new Date(),
            },
          },
        );
      } catch (markError) {
        console.error('Failed to mark invitation for email retry:', markError);
      }
    }

    return invitation;
  }

  /**
   * Accept invitation
   */
  static async acceptInvitation(
    token: string,
    clerkId: string,
    userEmail: string,
  ): Promise<{ project: IClusterProjectSchema; alreadyInvestor: boolean }> {
    const invitation = await Invitation.findByToken(token);

    if (!invitation) {
      throw new AppError('INVITATION_NOT_FOUND', STATUSES.NOT_FOUND);
    }

    // Accept using model method (includes email verification)
    return invitation.acceptInvitation(clerkId, userEmail);
  }
}
