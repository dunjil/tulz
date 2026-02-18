"""Add feedback table for reviews and suggestions

Revision ID: add_feedback_table
Revises: add_country_fields
Create Date: 2024-12-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'add_feedback_table'
down_revision: Union[str, None] = 'add_country_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create feedback_type enum
    feedback_type = postgresql.ENUM('review', 'suggestion', 'bug_report', 'feature_request', name='feedbacktype')
    feedback_type.create(op.get_bind(), checkfirst=True)

    # Create feedback_status enum
    feedback_status = postgresql.ENUM('pending', 'reviewed', 'in_progress', 'completed', 'dismissed', name='feedbackstatus')
    feedback_status.create(op.get_bind(), checkfirst=True)

    # Create feedback table
    op.create_table(
        'feedback',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('type', sa.Enum('review', 'suggestion', 'bug_report', 'feature_request', name='feedbacktype'), nullable=False, default='review'),
        sa.Column('subject', sa.String(200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('tool_name', sa.String(100), nullable=True),
        sa.Column('status', sa.Enum('pending', 'reviewed', 'in_progress', 'completed', 'dismissed', name='feedbackstatus'), nullable=False, default='pending'),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('guest_email', sa.String(255), nullable=True),
        sa.Column('guest_name', sa.String(100), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create indexes
    op.create_index('ix_feedback_status', 'feedback', ['status'], unique=False)
    op.create_index('ix_feedback_type', 'feedback', ['type'], unique=False)
    op.create_index('ix_feedback_created_at', 'feedback', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_feedback_created_at', table_name='feedback')
    op.drop_index('ix_feedback_type', table_name='feedback')
    op.drop_index('ix_feedback_status', table_name='feedback')
    op.drop_table('feedback')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS feedbackstatus')
    op.execute('DROP TYPE IF EXISTS feedbacktype')
