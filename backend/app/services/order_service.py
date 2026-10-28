"""Order management service handling order creation, status transitions, stock, and cancellation."""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from app.extensions import db
from app.models.cart import CartItem
from app.models.delivery import Delivery, DeliveryStatus
from app.models.order import (
    Order,
    OrderItem,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    generate_order_number,
)
from app.models.product import Product
from app.models.user import User
from app.models.vendor import Vendor
from app.models.wallet import Wallet, WalletTransaction
from app.services.wallet_service import WalletService


def _to_uuid(val: str | uuid.UUID) -> uuid.UUID:
    """Helper to convert string or UUID to uuid.UUID instance."""
    if isinstance(val, uuid.UUID):
        return val
    return uuid.UUID(str(val))


# Valid forward status transitions
VALID_TRANSITIONS: Dict[OrderStatus, List[OrderStatus]] = {
    OrderStatus.PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    OrderStatus.CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    OrderStatus.PREPARING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    OrderStatus.SHIPPED: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
    OrderStatus.DELIVERED: [],
    OrderStatus.CANCELLED: [],
}


class OrderService:
    """Core business logic for B2B grocery order placement, fulfillment, and cancellation."""

    @staticmethod
    def create_order(
        user_id: str | uuid.UUID,
        data: Optional[Dict[str, Any]] = None,
    ) -> List[Order]:
        """Place orders from user's shopping cart grouped by vendor.

        Validates cart, locks products, checks inventory, manages wallet payment,
        decrements stock, creates order records, and clears cart in a single transaction.

        Args:
            user_id: UUID of the retailer placing the order.
            data: Optional dictionary with payment_method, notes, delivery_fee.

        Returns:
            List of created Order instances (one per vendor).

        Raises:
            ValueError: On invalid cart, stock deficit, or payment failure.
        """
        payload = data or {}
        uid = _to_uuid(user_id)

        # 1. Fetch user's cart items
        cart_items_stmt = (
            db.select(CartItem)
            .where(CartItem.user_id == uid)
            .order_by(CartItem.created_at.asc())
        )
        cart_items = db.session.execute(cart_items_stmt).scalars().all()

        if not cart_items:
            raise ValueError("Your shopping cart is empty.")

        # 2. Parse payment method
        pm_raw = payload.get("payment_method", "wallet")
        try:
            payment_method = PaymentMethod(pm_raw.lower())
        except (ValueError, AttributeError):
            raise ValueError(
                f"Invalid payment method '{pm_raw}'. Supported: {', '.join(p.value for p in PaymentMethod)}"
            )

        delivery_notes = payload.get("notes")

        # 3. Group cart items by vendor and validate product stock with row locking
        vendor_groups: Dict[uuid.UUID, List[Dict[str, Any]]] = defaultdict(list)
        total_order_amount = Decimal("0.00")

        try:
            for item in cart_items:
                product_stmt = (
                    db.select(Product)
                    .where(Product.id == item.product_id)
                    .with_for_update()
                )
                product = db.session.execute(product_stmt).scalar_one_or_none()

                if not product or not product.is_active:
                    raise ValueError(
                        f"Product '{getattr(product, 'name_en', str(item.product_id))}' is currently unavailable."
                    )

                if item.quantity < product.min_order_qty:
                    raise ValueError(
                        f"Minimum order quantity for '{product.name_en}' is {product.min_order_qty} (requested: {item.quantity})."
                    )

                if product.stock_qty < item.quantity:
                    raise ValueError(
                        f"Insufficient stock for '{product.name_en}'. Available: {product.stock_qty}, requested: {item.quantity}."
                    )

                item_unit_price = Decimal(str(product.price))
                item_total = item_unit_price * item.quantity

                vendor_groups[product.vendor_id].append({
                    "product": product,
                    "quantity": item.quantity,
                    "unit_price": item_unit_price,
                    "total_price": item_total,
                })
                total_order_amount += item_total

            # 4. Handle wallet deduction if wallet payment
            wallet_to_charge = None
            if payment_method == PaymentMethod.WALLET:
                wallet_stmt = (
                    db.select(Wallet)
                    .where(Wallet.user_id == uid)
                    .with_for_update()
                )
                wallet_to_charge = db.session.execute(wallet_stmt).scalar_one_or_none()

                if not wallet_to_charge or wallet_to_charge.balance < total_order_amount:
                    current_bal = wallet_to_charge.balance if wallet_to_charge else Decimal("0.00")
                    raise ValueError(
                        f"Insufficient wallet balance. Total required: {total_order_amount:.2f} SDG, "
                        f"available: {current_bal:.2f} SDG."
                    )

            # 5. Create Order + OrderItems for each vendor group
            created_orders: List[Order] = []

            for vendor_id, items_info in vendor_groups.items():
                group_subtotal = sum(i["total_price"] for i in items_info)
                group_delivery_fee = Decimal("0.00")
                group_total = group_subtotal + group_delivery_fee

                order = Order(
                    order_number=generate_order_number(),
                    retailer_id=uid,
                    vendor_id=vendor_id,
                    subtotal=group_subtotal,
                    delivery_fee=group_delivery_fee,
                    total=group_total,
                    payment_method=payment_method,
                    payment_status=(
                        PaymentStatus.PAID
                        if payment_method == PaymentMethod.WALLET
                        else PaymentStatus.PENDING
                    ),
                    order_status=OrderStatus.PENDING,
                    notes=delivery_notes,
                )
                db.session.add(order)
                db.session.flush()

                for item_info in items_info:
                    product = item_info["product"]
                    order_item = OrderItem(
                        order_id=order.id,
                        product_id=product.id,
                        quantity=item_info["quantity"],
                        unit_price=item_info["unit_price"],
                        total_price=item_info["total_price"],
                    )
                    db.session.add(order_item)

                    # Deduct stock
                    product.stock_qty -= item_info["quantity"]

                # Create associated Delivery record
                delivery = Delivery(
                    order_id=order.id,
                    status=DeliveryStatus.PENDING,
                    delivery_notes=delivery_notes,
                )
                db.session.add(delivery)

                # Process per-order wallet ledger debit
                if payment_method == PaymentMethod.WALLET and wallet_to_charge:
                    wallet_to_charge.balance -= group_total
                    txn = WalletTransaction(
                        wallet_id=wallet_to_charge.id,
                        order_id=order.id,
                        type=TransactionType.DEBIT,
                        source=TransactionSource.PAYMENT,
                        amount=group_total,
                        balance_after=wallet_to_charge.balance,
                        reference=f"ORD-{order.order_number}",
                        description=f"Payment for order {order.order_number}",
                    )
                    db.session.add(txn)

                created_orders.append(order)

            # 6. Clear user cart
            delete_cart_stmt = db.delete(CartItem).where(CartItem.user_id == uid)
            db.session.execute(delete_cart_stmt)

            # 7. Commit full transaction
            db.session.commit()
            return created_orders

        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def update_order_status(
        order_id: str | uuid.UUID,
        new_status: str | OrderStatus,
        user_id: Optional[str | uuid.UUID] = None,
        is_admin: bool = False,
    ) -> Order:
        """Advance order fulfillment status following valid transition workflow.

        Args:
            order_id: UUID of order to update.
            new_status: Target status string or enum.
            user_id: ID of user making the request.
            is_admin: Flag whether requester is an administrator.

        Returns:
            Updated Order instance.

        Raises:
            ValueError: If order not found, unauthorized, or invalid transition.
        """
        oid = _to_uuid(order_id)
        stmt = db.select(Order).where(Order.id == oid)
        order = db.session.execute(stmt).scalar_one_or_none()

        if not order:
            raise ValueError(f"Order with ID '{order_id}' was not found.")

        # Vendor ownership check if not admin
        if not is_admin and user_id is not None:
            uid = _to_uuid(user_id)
            vendor_stmt = db.select(Vendor).where(Vendor.user_id == uid)
            vendor = db.session.execute(vendor_stmt).scalar_one_or_none()
            if not vendor or order.vendor_id != vendor.id:
                raise ValueError("Unauthorized: You do not have permission to manage this order.")

        try:
            target_status = OrderStatus(new_status.lower() if isinstance(new_status, str) else new_status)
        except ValueError:
            valid_statuses = ", ".join(s.value for s in OrderStatus)
            raise ValueError(f"Invalid status '{new_status}'. Valid choices: {valid_statuses}")

        if target_status == OrderStatus.CANCELLED:
            return OrderService.cancel_order(order_id=oid, user_id=user_id, is_admin=is_admin)

        allowed = VALID_TRANSITIONS.get(order.order_status, [])
        if target_status not in allowed:
            raise ValueError(
                f"Cannot transition order from '{order.order_status.value}' to '{target_status.value}'. "
                f"Allowed transitions: {', '.join(s.value for s in allowed) if allowed else 'None'}."
            )

        order.order_status = target_status

        # Synchronize delivery status
        delivery_stmt = db.select(Delivery).where(Delivery.order_id == order.id)
        delivery = db.session.execute(delivery_stmt).scalar_one_or_none()

        if target_status == OrderStatus.SHIPPED:
            if delivery:
                delivery.status = DeliveryStatus.IN_TRANSIT
            else:
                delivery = Delivery(order_id=order.id, status=DeliveryStatus.IN_TRANSIT)
                db.session.add(delivery)

        elif target_status == OrderStatus.DELIVERED:
            now_utc = datetime.now(timezone.utc)
            if delivery:
                delivery.status = DeliveryStatus.DELIVERED
                delivery.delivered_at = now_utc
            else:
                delivery = Delivery(
                    order_id=order.id,
                    status=DeliveryStatus.DELIVERED,
                    delivered_at=now_utc,
                )
                db.session.add(delivery)

            # Auto-mark COD as paid on confirmed delivery
            if order.payment_method == PaymentMethod.COD:
                order.payment_status = PaymentStatus.PAID

        db.session.commit()
        return order

    @staticmethod
    def cancel_order(
        order_id: str | uuid.UUID,
        user_id: Optional[str | uuid.UUID] = None,
        is_admin: bool = False,
    ) -> Order:
        """Cancel an order, replenish product inventory, and refund wallet if applicable.

        Args:
            order_id: UUID of order.
            user_id: ID of user requesting cancellation.
            is_admin: Whether the user is admin.

        Returns:
            Cancelled Order instance.

        Raises:
            ValueError: If order already delivered, cancelled, or not found.
        """
        oid = _to_uuid(order_id)
        stmt = db.select(Order).where(Order.id == oid).with_for_update()
        order = db.session.execute(stmt).scalar_one_or_none()

        if not order:
            raise ValueError(f"Order with ID '{order_id}' was not found.")

        # Permission check
        if not is_admin and user_id is not None:
            uid = _to_uuid(user_id)
            vendor_stmt = db.select(Vendor).where(Vendor.user_id == uid)
            vendor = db.session.execute(vendor_stmt).scalar_one_or_none()
            is_owner = order.retailer_id == uid
            is_assigned_vendor = vendor and order.vendor_id == vendor.id

            if not (is_owner or is_assigned_vendor):
                raise ValueError("Unauthorized: You do not have permission to cancel this order.")

        if order.order_status == OrderStatus.DELIVERED:
            raise ValueError("Delivered orders cannot be cancelled.")

        if order.order_status == OrderStatus.CANCELLED:
            raise ValueError("Order is already cancelled.")

        # 1. Update order status
        order.order_status = OrderStatus.CANCELLED

        # 2. Replenish product stock quantities
        for item in order.items:
            product = db.session.get(Product, item.product_id)
            if product:
                product.stock_qty += item.quantity

        # 3. Refund wallet balance if paid via wallet
        if order.payment_method == PaymentMethod.WALLET and order.payment_status == PaymentStatus.PAID:
            WalletService.refund(
                user_id=order.retailer_id,
                amount=order.total,
                order_id=order.id,
                reference=f"REFUND-{order.order_number}",
                description=f"Refund for cancelled order {order.order_number}",
                commit=False,
            )
            order.payment_status = PaymentStatus.REFUNDED

        # 4. Update delivery status
        delivery_stmt = db.select(Delivery).where(Delivery.order_id == order.id)
        delivery = db.session.execute(delivery_stmt).scalar_one_or_none()
        if delivery:
            delivery.status = DeliveryStatus.FAILED
            delivery.delivery_notes = (
                f"{delivery.delivery_notes or ''} [Cancelled by user/system]".strip()
            )

        db.session.commit()
        return order
