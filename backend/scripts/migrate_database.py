"""One-off migration that moves the existing EnginX SQLite database into the
persistent location that Docker Compose mounts.

Background
----------
EnginX used ``DATABASE_URL=sqlite:///./enginx.db``, a relative path. Running from
the backend directory put the database at ``backend/enginx.db``; running inside
the container put it in the container's ephemeral filesystem. Neither survives a
container rebuild, so learner data disappeared.

The container now uses ``sqlite:////app/data/enginx.db`` behind a bind mount from
``./backend/data``. Pointing the application there while a real database already
exists at the old relative location would make it create an *empty* database and
hide every existing user, submission, badge and lesson record.

This script performs that move explicitly, verifiably and reversibly:

1. Locate the source database (auto-detected, or pass ``--from``).
2. Checkpoint any WAL data so unflushed frames are included in the copy.
3. Back up an existing destination to ``<dest>.<UTC-timestamp>.bak``.
4. Reproduce the source with ``VACUUM INTO``, which yields one self-consistent
   file with no ``-wal``/``-shm`` sidecars to forget.
5. Open the destination and compare the table set, column definitions and row
   counts against the source.
6. Exit non-zero on any mismatch, leaving the source untouched.

The source database is never deleted, truncated or modified in place.
"""

from __future__ import annotations

import argparse
import shutil
import sqlite3
import sys
import time
from pathlib import Path
from urllib.parse import unquote, urlsplit

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent

# Ordered by likelihood.  The first two are the documented historical locations
# for the relative DATABASE_URL, depending on which directory uvicorn was started
# from.  The others catch a stray copy rather than ignoring it.
CANDIDATE_SOURCES = [
    BACKEND_DIR / "enginx.db",
    PROJECT_DIR / "enginx.db",
    Path.cwd() / "enginx.db",
]

# A real EnginX database must contain these.  Missing any of them means the file
# is not the learner database and copying it would discard real data.
CRITICAL_TABLES = frozenset({"users"})


def resolve_database_path(database_url: str | None = None) -> Path:
    """Resolve DATABASE_URL (or its default) to an absolute filesystem path.

    Kept intentionally in sync with ``backend/config.py`` so the migration targets
    exactly the file the application will open.  Uses only the standard library so
    the script runs without the backend's dependencies installed.
    """
    if not database_url:
        database_url = "sqlite:///./enginx.db"
    if not database_url.startswith("sqlite"):
        raise SystemExit(
            f"Unsupported DATABASE_URL {database_url!r}: only sqlite URLs are "
            "handled by this migration."
        )

    # ``sqlite:///./enginx.db`` -> "./enginx.db"
    # ``sqlite:////app/data/enginx.db`` -> "/app/data/enginx.db" (absolute)
    path = unquote(urlsplit(database_url).path)
    if not path:
        raise SystemExit(f"DATABASE_URL {database_url!r} names no database file.")

    if not Path(path).is_absolute():
        # Relative URLs resolve against the process working directory, matching
        # how SQLAlchemy interprets them.
        path = str(Path.cwd() / path)
    return Path(path).resolve()


# ---------------------------------------------------------------------------
# Inspection
# ---------------------------------------------------------------------------

def connect(path: Path, timeout: float = 30.0) -> sqlite3.Connection:
    return sqlite3.connect(path, timeout=timeout)


def checkpoint_wal(connection: sqlite3.Connection) -> None:
    """Flush any WAL segment into the main database file before copying.

    If the source was last written with WAL enabled, uncommitted-by-the-writer
    frames live in ``-wal``.  ``VACUUM INTO`` reads through a connection, so
    checkpointing first guarantees those rows are included in the copy.
    """
    connection.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    connection.commit()


def table_names(connection: sqlite3.Connection) -> set[str]:
    rows = connection.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' "
        "AND name NOT LIKE 'sqlite_%'"
    ).fetchall()
    return {row[0] for row in rows}


def column_signature(connection: sqlite3.Connection, table: str) -> list[tuple]:
    """(name, declared type, notnull) for each column, in declared order."""
    rows = connection.execute(f'PRAGMA table_info("{table}")').fetchall()
    return [(row[1], row[2], bool(row[3])) for row in rows]


def row_counts(connection: sqlite3.Connection) -> dict[str, int]:
    return {
        name: connection.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0]
        for name in sorted(table_names(connection))
    }


def snapshot(connection: sqlite3.Connection) -> tuple[set[str], dict[str, int], dict[str, list[tuple]]]:
    """Capture everything verification needs, so the source can be closed."""
    tables = table_names(connection)
    return (
        tables,
        row_counts(connection),
        {table: column_signature(connection, table) for table in sorted(tables)},
    )


# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------

def verify_destination(destination: Path) -> tuple[set[str], dict[str, int], dict[str, list[tuple]]]:
    connection = connect(destination)
    try:
        return snapshot(connection)
    finally:
        connection.close()


def compare(source, destination, label) -> None:
    """Raise ValueError unless the destination mirrors the source exactly."""
    source_tables, source_counts, source_columns = source
    dest_tables, dest_counts, dest_columns = destination

    missing = sorted(source_tables - dest_tables)
    extra = sorted(dest_tables - source_tables)
    if missing or extra:
        raise ValueError(
            f"{label}: table mismatch; missing=" + (", ".join(missing) or "none")
            + " extra=" + (", ".join(extra) or "none")
        )

    bad_columns = [
        table for table in sorted(source_tables)
        if source_columns[table] != dest_columns[table]
    ]
    if bad_columns:
        raise ValueError(f"{label}: column definition mismatch in " + ", ".join(bad_columns))

    bad_counts = {
        table: (source_counts[table], dest_counts[table])
        for table in sorted(source_counts)
        if source_counts[table] != dest_counts[table]
    }
    if bad_counts:
        detail = ", ".join(
            f"{table}: expected {expected}, got {actual}"
            for table, (expected, actual) in bad_counts.items()
        )
        raise ValueError(f"{label}: row count mismatch ({detail})")


def remove_stale_sidecars(destination: Path) -> None:
    """Drop leftover -wal/-shm files so SQLite never reads them.

    ``VACUUM INTO`` produces a clean main file with no sidecars.  A stale pair
    from an earlier partial run would otherwise be picked up and could confuse
    SQLite about the active WAL generation.
    """
    for suffix in ("-wal", "-shm"):
        sidecar = destination.with_suffix(destination.suffix + suffix)
        if sidecar.exists():
            sidecar.unlink()
            print(f"Removed stale sidecar {sidecar.name}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def detect_source() -> Path | None:
    return next((path for path in CANDIDATE_SOURCES if path.is_file()), None)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Migrate the existing EnginX SQLite database into the persistent location.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Examples:\n"
               "  python backend\\scripts\\migrate_database.py --dry-run\n"
               "  python backend\\scripts\\migrate_database.py --from backend\\enginx.db\n",
    )
    parser.add_argument(
        "--from", dest="source", type=Path, default=None,
        help="Source database file. Omit to auto-detect from the usual locations.",
    )
    parser.add_argument(
        "--to", dest="destination", type=Path, default=None,
        help="Destination database file. Defaults to the resolved DATABASE_URL.",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Report what would happen without writing anything.",
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Proceed even if the destination already holds data (a backup is still taken).",
    )
    args = parser.parse_args()

    source = (args.source.resolve() if args.source else detect_source())
    if source is None:
        raise SystemExit(
            "No source database found. Looked in:\n  "
            + "\n  ".join(str(path) for path in CANDIDATE_SOURCES)
            + "\nCreate the database once, then re-run, or pass --from explicitly."
        )
    if not source.is_file():
        raise SystemExit(f"Source database does not exist: {source}")

    destination = args.destination.resolve() if args.destination else resolve_database_path()

    print(f"Source      : {source}")
    print(f"Destination : {destination}")

    if source == destination:
        print("Source and destination are the same file; nothing to do.")
        return 0

    # -- Inspect the source before writing anything --------------------------
    connection = connect(source)
    try:
        checkpoint_wal(connection)
        source_snapshot = snapshot(connection)
    finally:
        connection.close()

    source_tables, source_counts, _ = source_snapshot
    if not source_tables:
        raise SystemExit(
            f"Source {source} contains no tables. Refusing to copy an empty file."
        )
    missing_critical = CRITICAL_TABLES - source_tables
    if missing_critical:
        raise SystemExit(
            f"Source is missing critical table(s): {', '.join(sorted(missing_critical))}. "
            "It does not look like a real EnginX database."
        )

    total_rows = sum(source_counts.values())
    print(f"Source tables: {len(source_tables)}, total rows: {total_rows}")
    for table, count in source_counts.items():
        print(f"  {table}: {count} row(s)")

    if args.dry_run:
        print("\nDry run: no files were written.")
        if destination.exists():
            print(f"  existing destination would be backed up: {destination}")
        else:
            print(f"  would create {destination}")
        return 0

    # -- Guard against overwriting data that is not ours ---------------------
    if destination.exists():
        try:
            dest_tables, dest_counts, _ = verify_destination(destination)
            existing_rows = sum(dest_counts.values())
        except sqlite3.Error as exc:
            raise SystemExit(
                f"Destination exists but is not readable SQLite ({exc}). "
                "Inspect it before migrating."
            )

        if existing_rows and not args.force:
            raise SystemExit(
                f"Destination {destination} already holds {existing_rows} row(s). "
                "Refusing to overwrite; re-run with --force if intended."
            )

        if dest_tables and existing_rows == 0:
            print("Destination exists but is empty; replacing it.")

    # -- Backup, copy, verify ------------------------------------------------
    destination.parent.mkdir(parents=True, exist_ok=True)

    backup = None
    if destination.exists():
        stamp = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
        backup = destination.with_suffix(destination.suffix + f".{stamp}.bak")
        shutil.copy2(destination, backup)
        print(f"Backed up existing destination to {backup}")

    try:
        with connect(source) as writer:
            writer.execute("VACUUM INTO", (str(destination),))
    except sqlite3.Error as exc:
        raise SystemExit(f"Copy failed (VACUUM INTO): {exc}")

    print(f"Copied to {destination}")
    remove_stale_sidecars(destination)

    try:
        compare(source_snapshot, verify_destination(destination), "destination")
    except ValueError as exc:
        print(f"\nMigration FAILED verification: {exc}")
        if backup:
            print(f"Pre-migration backup kept at {backup}")
        return 1

    print("\nMigration succeeded and verified: table set, column definitions "
          "and row counts all match.")
    print("The source database was left in place unchanged.")
    if backup:
        print(f"Pre-migration backup kept at {backup}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except SystemExit as exc:
        print(str(exc))
        sys.exit(exc.code or 1)
