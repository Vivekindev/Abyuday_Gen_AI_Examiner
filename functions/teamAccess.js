import mongoose from 'mongoose';
import Team from '../models/team.js';

export const getTeamMembership = async (teamId, userId) => {
  if (!mongoose.isValidObjectId(teamId)) return null;
  const team = await Team.findOne({ _id: teamId, 'members.user': userId });
  if (!team) return null;
  const member = team.members.find((item) => String(item.user) === String(userId));
  return { team, role: member.role };
};

export const canManageTeam = (role) => role === 'owner' || role === 'admin';
