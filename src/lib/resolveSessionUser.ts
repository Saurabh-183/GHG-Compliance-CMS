import 'server-only';

import { IUserDocument, UserModel } from '@/models/User';
import { isMongoObjectId } from '@/lib/db';
import type { IAuthUserSession } from '@/types';

/** Load Mongo user for a JWT session (demo ids like USR_CLIENT_DEMO resolve by email). */
export async function findUserForSession(
  session: IAuthUserSession
): Promise<IUserDocument | null> {
  if (isMongoObjectId(session.userId)) {
    const byId = await UserModel.findById(session.userId);
    if (byId) return byId;
  }
  if (session.email) {
    return UserModel.findOne({ email: session.email.toLowerCase().trim() });
  }
  return null;
}