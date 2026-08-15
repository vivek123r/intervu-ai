import secrets


class IdPrefix:
    USER = "user"
    INTERVIEW = "interview"
    ROUND = "round"
    TASK = "task"
    QUESTION = "q"
    SESSION = "session"
    REPORT = "report"
    JOB = "job"
    TICKET = "ticket"
    RESUME = "resume"
    JOB_DESCRIPTION = "jd"
    NOTIFICATION = "notif"


def new_id(prefix: str) -> str:
    return f"{prefix}-{secrets.token_hex(4)}"
