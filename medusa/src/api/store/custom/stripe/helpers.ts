import { AuthenticatedMedusaRequest } from '@medusajs/framework';
import {
  ContainerRegistrationKeys,
  MedusaError,
} from '@medusajs/framework/utils';

type OwnedCartPaymentSession = {
  id: string;
  data: Record<string, unknown> | null;
};

export const retrieveCallerCartPaymentSessions = async (
  req: AuthenticatedMedusaRequest,
  cartId: unknown,
): Promise<OwnedCartPaymentSession[]> => {
  if (typeof cartId !== 'string' || !cartId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'cart_id is required',
    );
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const {
    data: [cart],
  } = await query.graph({
    entity: 'cart',
    filters: { id: cartId },
    fields: [
      'id',
      'customer_id',
      'customer.has_account',
      'payment_collection.payment_sessions.id',
      'payment_collection.payment_sessions.data',
    ],
  });

  const actorId = req.auth_context?.actor_id;
  const belongsToAnotherAccount =
    cart?.customer?.has_account && cart.customer_id !== actorId;

  if (!cart || belongsToAnotherAccount) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Cart not found');
  }

  return (cart.payment_collection?.payment_sessions ?? []).filter(
    (session): session is OwnedCartPaymentSession => !!session,
  );
};
