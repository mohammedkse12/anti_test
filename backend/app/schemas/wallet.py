"""Wallet and Transaction Marshmallow Schemas.

Provides validation and serialization for digital wallets, top-up operations,
and ledger transaction history in FoodX.
"""

from marshmallow import Schema, fields, validate


class WalletSchema(Schema):
    """Serialization schema for user digital wallet balance."""

    id = fields.String(dump_only=True)
    user_id = fields.String(dump_only=True)
    balance = fields.Decimal(as_string=True, dump_only=True)
    currency = fields.String(dump_only=True, load_default="SDG")
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class TopUpSchema(Schema):
    """Validation schema for wallet top-up requests."""

    amount = fields.Decimal(
        required=True,
        as_string=True,
        validate=validate.Range(min=0.01, error="Top-up amount must be greater than zero."),
    )
    payment_method = fields.String(
        load_default="bank_transfer",
        validate=validate.OneOf(
            ["bank_transfer", "card", "cash"],
            error="Payment method must be one of: bank_transfer, card, cash.",
        ),
    )
    reference = fields.String(
        load_default=None,
        allow_none=True,
        validate=validate.Length(max=100),
    )


class WalletTransactionSchema(Schema):
    """Serialization schema for wallet credit/debit transaction log entries."""

    id = fields.String(dump_only=True)
    wallet_id = fields.String(dump_only=True)
    order_id = fields.String(dump_only=True, allow_none=True)
    amount = fields.Decimal(as_string=True, dump_only=True)
    type = fields.Function(
        lambda obj: obj.type.value if hasattr(obj.type, "value") else str(obj.type),
        dump_only=True,
    )
    transaction_type = fields.Function(
        lambda obj: obj.type.value if hasattr(obj.type, "value") else str(obj.type),
        dump_only=True,
    )
    source = fields.Function(
        lambda obj: obj.source.value if hasattr(obj.source, "value") else str(obj.source),
        dump_only=True,
    )
    reference_type = fields.Function(
        lambda obj: obj.source.value if hasattr(obj.source, "value") else str(obj.source),
        dump_only=True,
    )
    reference = fields.String(dump_only=True, allow_none=True)
    reference_id = fields.String(attribute="reference", dump_only=True, allow_none=True)
    description = fields.String(dump_only=True, allow_none=True)
    balance_after = fields.Decimal(as_string=True, dump_only=True)
    created_at = fields.DateTime(dump_only=True)

