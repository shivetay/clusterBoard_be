import cron from 'node-cron';
import Invitation from '../model/invitationModel';

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const result = await Invitation.updateMany(
      {
        status: 'pending',
        expires_at: { $lt: new Date() },
      },
      { status: 'expired' },
    );
    console.log(`Expired ${result.modifiedCount} invitations`);
  } catch (error) {
    console.error('Error expiring invitations:', error);
  }
});
