"""Operator commands: python -m app.cli create-user | seed"""
import argparse
import getpass
import sys

from sqlalchemy import select

from .db import Base, SessionLocal, engine
from .models import User
from .security import hash_password
from .services import references


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="rescue-ai")
    sub = p.add_subparsers(dest="cmd", required=True)
    cu = sub.add_parser("create-user")
    cu.add_argument("username")
    cu.add_argument("--role", default="paramedic", choices=["paramedic", "admin", "auditor"])
    cu.add_argument("--password-stdin", action="store_true")
    sub.add_parser("seed")
    sub.add_parser("init-db", help="development only; production uses alembic upgrade head")
    args = p.parse_args(argv)

    if args.cmd == "init-db":
        Base.metadata.create_all(engine)
        return 0
    db = SessionLocal()
    try:
        if args.cmd == "seed":
            print(f"protocol metadata entries added: {references.seed(db)}")
        elif args.cmd == "create-user":
            if db.scalar(select(User).where(User.username == args.username)):
                print("user exists", file=sys.stderr)
                return 1
            pw = sys.stdin.readline().strip() if args.password_stdin else getpass.getpass()
            if len(pw) < 10:
                print("password must be at least 10 characters", file=sys.stderr)
                return 1
            db.add(User(username=args.username, password_hash=hash_password(pw), role=args.role))
            db.commit()
            print(f"created {args.role} {args.username}")
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
