import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { MedusaError } from "@medusajs/framework/utils";
import Stripe from "stripe";
import { retrieveCallerCartPaymentSessions } from "../../helpers";

const stripe = new Stripe(process.env.STRIPE_API_KEY);

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params;

  const sessions = await retrieveCallerCartPaymentSessions(
    req,
    req.query.cart_id
  );

  if (!sessions.some((session) => session.data?.payment_method_id === id)) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Payment method not found"
    );
  }

  const paymentMethod = await stripe.paymentMethods.retrieve(id);
  res.status(200).json(paymentMethod);
};
