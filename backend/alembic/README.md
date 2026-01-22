# Alembic Migrations

This directory contains database migration files.

## Creating a new migration

```bash
alembic revision --autogenerate -m "Description of changes"
```

## Applying migrations

```bash
alembic upgrade head
```

## Rolling back

```bash
alembic downgrade -1
```

