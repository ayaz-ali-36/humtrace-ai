import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { CONTACT_REQUEST_STATUS } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";

const actions = {
  accept: CONTACT_REQUEST_STATUS.ACCEPTED,
  decline: CONTACT_REQUEST_STATUS.DECLINED,
  cancel: CONTACT_REQUEST_STATUS.CANCELLED
};

function contactValue(user) {
  if (user.preferredContactMethod === "PHONE" && user.phone) return { method: "PHONE", value: user.phone };
  return { method: "EMAIL", value: user.email };
}

export async function PATCH(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    }

    const body = await request.json();
    const status = actions[body.action];
    if (!status) {
      return NextResponse.json({ error: "Invalid contact request action." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const contactRequest = await tx.contactRequest.findUnique({
        where: { id: params.id },
        include: {
          requester: true,
          recipient: true,
          targetReport: true,
          requesterReport: true
        }
      });

      if (!contactRequest) return { error: "Contact request not found.", statusCode: 404 };

      const isRecipient = contactRequest.recipientId === user.id;
      const isRequester = contactRequest.requesterId === user.id;

      if ((body.action === "accept" || body.action === "decline") && !isRecipient) {
        return { error: "Only the request recipient can accept or decline.", statusCode: 403 };
      }

      if (body.action === "cancel" && !isRequester) {
        return { error: "Only the requester can cancel this request.", statusCode: 403 };
      }

      if (["accept", "decline"].includes(body.action)) {
        const target = contactRequest.targetReport;
        const source = contactRequest.requesterReport;
        const targetAvailable = target && target.lifecycleStatus === "ACTIVE" && target.visibility === "PUBLIC" && target.publicVisible && target.consentToContact;
        const sourceAvailable = !source || (source.lifecycleStatus === "ACTIVE" && source.visibility === "PUBLIC" && source.publicVisible);
        if (!targetAvailable || !sourceAvailable) {
          if (contactRequest.status === CONTACT_REQUEST_STATUS.PENDING) {
            await tx.contactRequest.update({ where: { id: contactRequest.id }, data: { status: CONTACT_REQUEST_STATUS.CANCELLED, activeKey: null } });
          }
          return { error: "This request is no longer available because a linked report left the public workflow.", statusCode: 409 };
        }
      }

      if (contactRequest.status !== CONTACT_REQUEST_STATUS.PENDING) {
        if (contactRequest.status === status) return { contactRequest };
        return { error: "This contact request has already been reviewed.", statusCode: 409 };
      }

      const updated = await tx.contactRequest.update({
        where: { id: contactRequest.id },
        data: {
          status,
          activeKey: null
        },
        include: {
          requester: true,
          recipient: true,
          targetReport: true,
          requesterReport: true
        }
      });

      const linkedReport = updated.targetReport || updated.requesterReport;
      if (linkedReport) {
        await tx.timelineEvent.create({
          data: {
            reportId: linkedReport.id,
            title: `Contact request ${status.toLowerCase()}`,
            description: "Contact details remain consent-controlled. Acceptance does not confirm identity."
          }
        });
      }

      await tx.notification.create({
        data: {
          userId: body.action === "cancel" ? updated.recipientId : updated.requesterId,
          reportId: linkedReport?.id,
          title: `Contact request ${status.toLowerCase()}`,
          message: `A contact request was ${status.toLowerCase()}. This does not confirm identity.`
        }
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          reportId: linkedReport?.id,
          action: `Contact request ${status.toLowerCase()}`,
          resource: updated.id,
          status
        }
      });

      return { contactRequest: updated };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode });
    }

    const updated = result.contactRequest;
    const participant = updated.requesterId === user.id ? updated.recipient : updated.requester;
    return NextResponse.json({
      ok: true,
      id: updated.id,
      status: updated.status,
      contact: updated.status === CONTACT_REQUEST_STATUS.ACCEPTED ? contactValue(participant) : null
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to update contact request." }, { status: 500 });
  }
}
