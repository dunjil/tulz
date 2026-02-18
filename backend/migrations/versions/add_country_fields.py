"""Add country fields to usage_history

Revision ID: add_country_fields
Revises:
Create Date: 2024-12-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_country_fields'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add country_code column
    op.add_column('usage_history', sa.Column('country_code', sa.String(2), nullable=True))
    op.add_column('usage_history', sa.Column('country_name', sa.String(100), nullable=True))

    # Create index on country_code for faster filtering
    op.create_index('ix_usage_history_country_code', 'usage_history', ['country_code'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_usage_history_country_code', table_name='usage_history')
    op.drop_column('usage_history', 'country_name')
    op.drop_column('usage_history', 'country_code')
