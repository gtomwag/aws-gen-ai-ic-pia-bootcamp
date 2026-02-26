"""
General utility functions
"""
import random
import string


def generate_pnr() -> str:
    """
    Generate a mock PNR (Passenger Name Record)
    """
    letters = ''.join(random.choices(string.ascii_uppercase, k=3))
    numbers = ''.join(random.choices(string.digits, k=3))
    return f"PNR-{letters}{numbers}"


def generate_id(prefix: str = "ID") -> str:
    """
    Generate a random ID with prefix
    """
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"{prefix}-{suffix}"
