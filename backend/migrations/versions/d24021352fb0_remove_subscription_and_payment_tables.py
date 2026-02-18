"""remove_subscription_and_payment_tables

Revision ID: d24021352fb0
Revises: add_donations_table
Create Date: 2026-02-12 23:37:47.256326

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'd24021352fb0'
down_revision: Union[str, None] = 'add_donations_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None




def upgrade() -> None:
    """Drop subscription and payment tables - moving to 100% free model."""
    # Drop payments table first (has foreign key to subscriptions)
    op.drop_table('payments')
    
    # Drop subscriptions table (has foreign key to users)
    op.drop_table('subscriptions')


def downgrade() -> None:
    """Recreate subscription and payment tables if needed."""
    # Note: This is a destructive migration. Downgrade would require
    # recreating the tables from scratch. If you need to rollback,
    # restore from a database backup instead.
    pass
