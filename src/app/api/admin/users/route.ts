import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { getSessionFromRequest, authorizeRole } from '@/lib/auth';
import { UserModel } from '@/models/User';
import { FacilityModel } from '@/models/Facility';
import { ClientGroupModel } from '@/models/ClientGroup';
import { Notification } from '@/models/Notification';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!authorizeRole(session, ['ADMIN'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    await connectToDatabase();
    const users = await UserModel.find({}).select('-passwordHash').sort({ createdAt: -1 }).lean();
    return NextResponse.json({
      success: true,
      data: users.map((u) => ({
        ...u,
        _id: u._id.toString(),
        clientGroupId: u.clientGroupId?.toString(),
        clientGroupIds: (u.clientGroupIds || []).map((id) => id.toString()),
        mobileNo: u.mobileNo,
        managerName: u.managerName,
        capacity: u.capacity,
      })),
    });
  } catch (error) {
    console.error('Admin user listing failed:', error);
    return NextResponse.json({ error: 'Unable to load users.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!authorizeRole(session, ['ADMIN'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const role = body.role;
    const designation = typeof body.designation === 'string' ? body.designation.trim() : '';
    const mobileNo =
      typeof body.mobileNo === 'string'
        ? body.mobileNo.trim()
        : typeof body.phone === 'string'
          ? body.phone.trim()
          : '';
    const managerName = typeof body.managerName === 'string' ? body.managerName.trim() : '';
    const capacity = typeof body.capacity === 'string' ? body.capacity.trim() : '';

    if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['ADMIN','CONSULTANT','CLIENT'].includes(role) || password.length < 12 || password.length > 128) {
      return NextResponse.json({ error: 'Provide a valid name, email, role and a password of at least 12 characters.' }, { status: 400 });
    }
    await connectToDatabase();
    if (await UserModel.exists({ email })) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });

    let clientGroupId: mongoose.Types.ObjectId | undefined;
    let authorizedFacilityIds: string[] = [];
    if (role === 'CLIENT') {
      const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : '';
      const providedGroupId = typeof body.clientGroupId === 'string' ? body.clientGroupId.trim() : '';

      if (!companyName && !providedGroupId) {
        return NextResponse.json({ error: 'Company name is required for client accounts.' }, { status: 400 });
      }

      if (providedGroupId && mongoose.Types.ObjectId.isValid(providedGroupId)) {
        clientGroupId = new mongoose.Types.ObjectId(providedGroupId);
        if (capacity || managerName || mobileNo) {
          await ClientGroupModel.updateOne(
            { _id: clientGroupId },
            {
              $set: {
                ...(capacity ? { capacity } : {}),
                ...(managerName ? { managerName, 'contactPerson.name': managerName } : {}),
                ...(mobileNo ? { 'contactPerson.phone': mobileNo } : {}),
              },
            }
          );
        }
      } else if (companyName) {
        // Look up by company name (case-insensitive)
        let group = await ClientGroupModel.findOne({
          name: { $regex: new RegExp(`^${companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        });

        if (!group) {
          // Generate unique uppercase code
          const baseCode =
            companyName
              .replace(/[^a-zA-Z0-9]/g, '_')
              .toUpperCase()
              .slice(0, 16) || 'CLIENT';
          let uniqueCode = baseCode;
          let counter = 1;
          while (await ClientGroupModel.exists({ code: uniqueCode })) {
            uniqueCode = `${baseCode}_${counter++}`;
          }

          const enabledFrameworks = Array.isArray(body.enabledFrameworks) && body.enabledFrameworks.length > 0
            ? body.enabledFrameworks
            : ['RCO', 'RPO', 'PAT', 'CCTS'];

          group = await ClientGroupModel.create({
            name: companyName,
            code: uniqueCode,
            industry: typeof body.industry === 'string' && body.industry.trim() ? body.industry.trim() : 'Industrial / Manufacturing',
            headquarters: typeof body.headquarters === 'string' && body.headquarters.trim() ? body.headquarters.trim() : 'India',
            capacity: capacity || '',
            managerName: managerName || name,
            enabledFrameworks,
            contactPerson: {
              name: managerName || name,
              email,
              phone: mobileNo || 'Not provided',
            },
          });
        } else if (capacity || managerName || mobileNo || body.enabledFrameworks) {
          const updateFields: Record<string, unknown> = {};
          if (capacity) updateFields.capacity = capacity;
          if (managerName) {
            updateFields.managerName = managerName;
            updateFields['contactPerson.name'] = managerName;
          }
          if (mobileNo) updateFields['contactPerson.phone'] = mobileNo;
          if (Array.isArray(body.enabledFrameworks) && body.enabledFrameworks.length > 0) {
            updateFields.enabledFrameworks = body.enabledFrameworks;
          }
          await ClientGroupModel.updateOne(
            { _id: group._id },
            { $set: updateFields }
          );
        }
        clientGroupId = group._id as mongoose.Types.ObjectId;
      } else {
        return NextResponse.json({ error: 'A valid company name or company group is required for client accounts.' }, { status: 400 });
      }

      const facilities = await FacilityModel.find({ clientGroupId, status: { $ne: 'INACTIVE' } }).select('facilityId').lean();
      authorizedFacilityIds = facilities.map((f) => f.facilityId.toUpperCase());

      // If an assigned consultant was selected for this client
      const assignedConsultantId = typeof body.assignedConsultantId === 'string' ? body.assignedConsultantId.trim() : '';
      if (assignedConsultantId && mongoose.Types.ObjectId.isValid(assignedConsultantId) && clientGroupId) {
        await UserModel.updateOne(
          { _id: assignedConsultantId, role: 'CONSULTANT' },
          {
            $addToSet: {
              clientGroupIds: clientGroupId,
              authorizedFacilityIds: { $each: authorizedFacilityIds },
            },
          }
        );
        if (authorizedFacilityIds.length > 0) {
          await FacilityModel.updateMany(
            { clientGroupId },
            { $set: { assignedConsultantId: new mongoose.Types.ObjectId(assignedConsultantId) } }
          );
        }
      }

      // Ensure all active consultants have visibility into newly registered client companies
      if (clientGroupId) {
        await UserModel.updateMany(
          { role: 'CONSULTANT' },
          {
            $addToSet: {
              clientGroupIds: clientGroupId,
              ...(authorizedFacilityIds.length > 0 ? { authorizedFacilityIds: { $each: authorizedFacilityIds } } : {}),
            },
          }
        );
      }
    } else if (role === 'CONSULTANT') {
      const rawGroupIds: string[] = Array.isArray(body.clientGroupIds)
        ? body.clientGroupIds.map((id: unknown) => String(id).trim()).filter(Boolean)
        : [];

      let consultantClientGroupIds: mongoose.Types.ObjectId[] = [];
      if (rawGroupIds.length > 0) {
        consultantClientGroupIds = rawGroupIds
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id));

        const matchedFacilities = await FacilityModel.find({
          clientGroupId: { $in: consultantClientGroupIds },
          status: { $ne: 'INACTIVE' },
        }).select('facilityId').lean();

        authorizedFacilityIds = matchedFacilities.map((f) => f.facilityId.toUpperCase());
      } else {
        const requested: string[] = Array.isArray(body.authorizedFacilityIds)
          ? Array.from(
              new Set<string>(
                body.authorizedFacilityIds
                  .map((id: unknown): string => String(id).trim().toUpperCase())
                  .filter((id: string) => id.length > 0)
              )
            )
          : [];
        if (!requested.length) return NextResponse.json({ error: 'Please select at least one client company for the consultant.' }, { status: 400 });
        const matched = await FacilityModel.find({
          facilityId: { $in: requested },
          status: { $ne: 'INACTIVE' },
        } as any).select('facilityId').lean();
        if (matched.length !== requested.length) return NextResponse.json({ error: 'One or more facility assignments are invalid.' }, { status: 400 });
        authorizedFacilityIds = requested;
      }

      (body as any)._resolvedClientGroupIds = consultantClientGroupIds;
    }

    const user = await UserModel.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role,
      status: 'ACTIVE',
      mustChangePassword: true,
      designation,
      mobileNo,
      managerName,
      capacity,
      clientGroupId,
      clientGroupIds: role === 'CONSULTANT' ? ((body as any)._resolvedClientGroupIds || []) : undefined,
      authorizedFacilityIds,
    });
    if (role === 'CONSULTANT') {
      const resolvedGroupIds = (body as any)._resolvedClientGroupIds || [];
      if (resolvedGroupIds.length > 0) {
        await FacilityModel.updateMany(
          { clientGroupId: { $in: resolvedGroupIds } },
          { $set: { assignedConsultantId: user._id } }
        );
      } else if (authorizedFacilityIds.length) {
        await FacilityModel.updateMany({ facilityId: { $in: authorizedFacilityIds } }, { $set: { assignedConsultantId: user._id } });
      }
    }

    try {
      await Notification.create({
        recipientRole: 'ADMIN',
        senderRole: session!.role,
        senderName: session!.name,
        type: 'USER_CREATED',
        title: `New ${role.toLowerCase()} account created`,
        message: `${name} (${email}) was registered by ${session!.name}.`,
        linkUrl: '/admin/users',
        isRead: false,
      });
    } catch (notifErr) {
      console.warn('User notification warning:', notifErr);
    }
    return NextResponse.json({
      success: true,
      data: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        designation: user.designation,
        mobileNo: user.mobileNo,
        managerName: user.managerName,
        capacity: user.capacity,
        clientGroupId: user.clientGroupId?.toString(),
        authorizedFacilityIds: user.authorizedFacilityIds,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Admin user creation failed:', error);
    return NextResponse.json({ error: 'Unable to create user.' }, { status: 500 });
  }
}
