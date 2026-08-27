"""initial_schema_with_audit_logs

Revision ID: 092c91e832d1
Revises: 
Create Date: 2026-08-27 07:12:27.269327

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '092c91e832d1'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Crear tabla audit_logs si no existe
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('user_email', sa.String(), nullable=True),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('resource', sa.String(length=200), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='SUCCESS'),
        sa.Column('details', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_id'), 'audit_logs', ['id'], unique=False)
    op.create_index(op.f('ix_audit_logs_timestamp'), 'audit_logs', ['timestamp'], unique=False)
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)

    with op.batch_alter_table('documents', schema=None) as batch_op:
        batch_op.alter_column('synced',
                   existing_type=sa.BOOLEAN(),
                   nullable=False,
                   existing_server_default=sa.text('0'))


def downgrade() -> None:
    with op.batch_alter_table('documents', schema=None) as batch_op:
        batch_op.alter_column('synced',
                   existing_type=sa.BOOLEAN(),
                   nullable=True,
                   existing_server_default=sa.text('0'))

    op.drop_index(op.f('ix_audit_logs_user_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_timestamp'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_action'), table_name='audit_logs')
    op.drop_table('audit_logs')

