import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { IPaymentModuleService } from "@medusajs/framework/types";
import { MedusaError, Modules } from "@medusajs/framework/utils";
import Stripe from "stripe";
import { retrieveCallerCartPaymentSessions } from "../helpers";

const stripe = new Stripe(process.env.STRIPE_API_KEY);

export const POST = async (
  req: AuthenticatedMedusaRequest<{
    cart_id: string;
    session_id: string;
    token: string;
  }>,
  res: MedusaResponse
) => {
  const paymentModuleService: IPaymentModuleService = req.scope.resolve(
    Modules.PAYMENT
  );

  const cartSessions = await retrieveCallerCartPaymentSessions(
    req,
    req.body.cart_id
  );

  if (
    typeof req.body.session_id !== "string" ||
    !cartSessions.some((cartSession) => cartSession.id === req.body.session_id)
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Payment session not found"
    );
  }

  const session = await paymentModuleService.retrievePaymentSession(
    req.body.session_id
  );

  if (!req.body.token) {
    await paymentModuleService.updatePaymentSession({
      ...session,
      data: {
        ...session.data,
        payment_method_id: null,
      },
    });
    res.status(200).json({ success: true });
    return;
  }

  const paymentMethod = await stripe.paymentMethods.create({
    type: "card",
    card: { token: req.body.token },
  });

  await stripe.paymentIntents.update(session.data.id as string, {
    payment_method: paymentMethod.id,
  });
  await paymentModuleService.updatePaymentSession({
    ...session,
    data: {
      ...session.data,
      payment_method_id: paymentMethod.id,
    },
  });
  res.status(200).json({ success: true });
};
