
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { connectToDatabase } from '@/lib/db';
import { getSessionFromRequest, authorizeRole } from '@/lib/auth';
import { UserModel } from '@/models/User';
import { FacilityModel } from '@/models/Facility';

type Context = {
  params: Promise<{ id: string }>;
};

type AccountStatus = 'ACTIVE' | 'DISABLED' | 'LOCKED';

const VALID_STATUSES: AccountStatus[] = [
  'ACTIVE',
  'DISABLED',
  'LOCKED'
];

function normalizeFacilityIds(values: unknown[]): string[] | null {
  if (values.some((value) => typeof value !== 'string')) {
    return null;
  }

  const ids = values.map((value) =>
    (value as string).trim().toUpperCase()
  );

  if (ids.some((id) => !id)) {
    return null;
  }

  if (new Set(ids).size !== ids.length) {
    return null;
  }

  return ids;
}

/**
 * PATCH /api/admin/users/:id
 *
 * ADMIN only.
 *
 * Supports:
 * - Updating name
 * - Updating designation
 * - Updating account status
 * - Resetting password
 * - Updating consultant facility assignments
 */
export async function PATCH(
  request: NextRequest,
  context: Context
) {
  const session = getSessionFromRequest(request);

  if (!authorizeRole(session, ['ADMIN'])) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: 'Invalid user ID.' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await UserModel.findById(id);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    // ---------------------------------------
    // UPDATE NAME
    // ---------------------------------------

    if (body.name !== undefined) {
      if (
        typeof body.name !== 'string' ||
        !body.name.trim()
      ) {
        return NextResponse.json(
          { error: 'Name is required.' },
          { status: 400 }
        );
      }

      user.name = body.name.trim();
    }

    // ---------------------------------------
    // UPDATE DESIGNATION
    // ---------------------------------------

    if (body.designation !== undefined) {
      if (typeof body.designation !== 'string') {
        return NextResponse.json(
          { error: 'Invalid designation.' },
          { status: 400 }
        );
      }

      user.designation = body.designation.trim();
    }

    // ---------------------------------------
    // UPDATE ACCOUNT STATUS
    // ---------------------------------------

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: 'Invalid account status.' },
          { status: 400 }
        );
      }

      // An administrator cannot disable or lock themselves.
      if (
        session?.userId === id &&
        body.status !== 'ACTIVE'
      ) {
        return NextResponse.json(
          { error: 'You cannot disable or lock your own account.' },
          { status: 400 }
        );
      }

      // Prevent disabling or locking the last active administrator.
      if (
        user.role === 'ADMIN' &&
        body.status !== 'ACTIVE'
      ) {
        const activeAdmins = await UserModel.countDocuments({
          role: 'ADMIN',
          status: { $nin: ['DISABLED', 'LOCKED'] },
          _id: { $ne: user._id }
        });

        if (activeAdmins === 0) {
          return NextResponse.json(
            {
              error: 'Cannot disable the only active administrator.'
            },
            { status: 400 }
          );
        }
      }

      user.status = body.status as AccountStatus;
    }

    // ---------------------------------------
    // RESET PASSWORD
    // ---------------------------------------

    if (body.password !== undefined) {
      if (
        typeof body.password !== 'string' ||
        body.password.length < 12 ||
        body.password.length > 128
      ) {
        return NextResponse.json(
          {
            error: 'Password must be between 12 and 128 characters.'
          },
          { status: 400 }
        );
      }

      user.passwordHash = await bcrypt.hash(
        body.password,
        12
      );

      user.passwordChangedAt = new Date();
      user.mustChangePassword = true;
    }

    // ---------------------------------------
    // UPDATE CONSULTANT CLIENT ASSIGNMENTS
    // ---------------------------------------

    if (body.clientGroupIds !== undefined) {
      if (user.role !== 'CONSULTANT' || !Array.isArray(body.clientGroupIds)) {
        return NextResponse.json(
          { error: 'Client company assignments can only be updated for consultants.' },
          { status: 400 }
        );
      }

      const clientGroupIds = (body.clientGroupIds as string[])
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      const matchedFacilities = clientGroupIds.length > 0
        ? await FacilityModel.find({
            clientGroupId: { $in: clientGroupIds },
            status: { $ne: 'INACTIVE' },
          }).select('facilityId').lean()
        : [];

      const facilityIds = matchedFacilities.map((f) => f.facilityId.toUpperCase());

      // Remove previous assignments for this consultant
      await FacilityModel.updateMany(
        { assignedConsultantId: user._id },
        { $unset: { assignedConsultantId: 1 } }
      );

      // Apply new assignments
      if (clientGroupIds.length > 0) {
        await FacilityModel.updateMany(
          { clientGroupId: { $in: clientGroupIds } },
          { $set: { assignedConsultantId: user._id } }
        );
      }

      user.clientGroupIds = clientGroupIds;
      user.authorizedFacilityIds = facilityIds;
    }

    // ---------------------------------------
    // UPDATE CONSULTANT FACILITY ASSIGNMENTS
    // ---------------------------------------

    if (body.authorizedFacilityIds !== undefined) {
      if (
        user.role !== 'CONSULTANT' ||
        !Array.isArray(body.authorizedFacilityIds)
      ) {
        return NextResponse.json(
          {
            error: 'Facility assignments can only be updated for consultants.'
          },
          { status: 400 }
        );
      }

      const ids = normalizeFacilityIds(
        body.authorizedFacilityIds
      );

      if (ids === null) {
        return NextResponse.json(
          {
            error: 'Facility IDs must be valid, non-empty and unique strings.'
          },
          { status: 400 }
        );
      }

      // An empty array is allowed.
      // It means removing all facility assignments.

      const matches = ids.length > 0
        ? await FacilityModel.find({
            facilityId: { $in: ids },
            status: { $ne: 'INACTIVE' }
          } as any)
            .select('facilityId assignedConsultantId')
            .lean()
        : [];

      // Every requested facility must exist and be active.
      if (matches.length !== ids.length) {
        return NextResponse.json(
          {
            error: 'One or more facility IDs are invalid or inactive.'
          },
          { status: 400 }
        );
      }

      // Prevent taking facilities from another consultant.
      const alreadyAssigned = matches.filter(
        (facility: any) =>
          facility.assignedConsultantId &&
          String(facility.assignedConsultantId) !==
            String(user._id)
      );

      if (alreadyAssigned.length > 0) {
        return NextResponse.json(
          {
            error: 'Some facilities are already assigned to another consultant.',
            facilityIds: alreadyAssigned.map(
              (facility: any) => facility.facilityId
            )
          },
          { status: 409 }
        );
      }

      // Remove previous assignments belonging to this consultant.
      await FacilityModel.updateMany(
        {
          assignedConsultantId: user._id
        } as any,
        {
          $unset: {
            assignedConsultantId: 1
          }
        }
      );

      // Apply the new assignments.
      if (ids.length > 0) {
        await FacilityModel.updateMany(
          {
            facilityId: { $in: ids }
          } as any,
          {
            $set: {
              assignedConsultantId: user._id
            }
          }
        );
      }

      user.authorizedFacilityIds = ids;
    }

    // ---------------------------------------
    // SAVE USER
    // ---------------------------------------

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'User updated successfully.',
      data: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        designation: user.designation,
        clientGroupId: user.clientGroupId?.toString(),
        authorizedFacilityIds:
          user.authorizedFacilityIds || [],
        mustChangePassword: user.mustChangePassword
      }
    });

  } catch (error) {
    console.error('Admin user update failed:', error);

    return NextResponse.json(
      { error: 'Unable to update user.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/:id
 *
 * ADMIN only.
 *
 * Prevents:
 * - Deleting yourself
 * - Deleting the last active administrator
 *
 * Also removes consultant facility assignment references.
 */
export async function DELETE(
  request: NextRequest,
  context: Context
) {
  const session = getSessionFromRequest(request);

  if (!authorizeRole(session, ['ADMIN'])) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: 'Invalid user ID.' },
      { status: 400 }
    );
  }

  if (session?.userId === id) {
    return NextResponse.json(
      { error: 'You cannot delete your own account.' },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const user = await UserModel.findById(id);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    // Protect the last active administrator.
    if (user.role === 'ADMIN') {
      const activeAdmins = await UserModel.countDocuments({
        role: 'ADMIN',
        status: { $nin: ['DISABLED', 'LOCKED'] }
      });

      const targetIsActive =
        user.status !== 'DISABLED' &&
        user.status !== 'LOCKED';

      if (targetIsActive && activeAdmins <= 1) {
        return NextResponse.json(
          {
            error: 'Cannot delete the only active administrator.'
          },
          { status: 400 }
        );
      }
    }

    // Clear consultant assignments before deleting the account.
    if (user.role === 'CONSULTANT') {
      await FacilityModel.updateMany(
        {
          assignedConsultantId: user._id
        } as any,
        {
          $unset: {
            assignedConsultantId: 1
          }
        }
      );
    }

    await user.deleteOne();

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully.'
    });

  } catch (error) {
    console.error('Admin user deletion failed:', error);

    return NextResponse.json(
      { error: 'Unable to delete user.' },
      { status: 500 }
    );
  }
}
