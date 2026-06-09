import asyncio
import os
from turing_agent_sdk import query


def assistant_text(message):
    if getattr(message, "type", None) != "assistant":
        return ""
    content = getattr(getattr(message, "message", None), "content", []) or []
    return "".join(getattr(block, "text", "") for block in content if getattr(block, "type", None) == "text")


async def main():
    options = {
        "cwd": os.getcwd(),
        "max_turns": 2,
        "permission_mode": "plan",
        "allowed_tools": [],
    }
    if os.environ.get("TURING_BINARY_PATH"):
        options["path_to_turing_executable"] = os.environ["TURING_BINARY_PATH"]

    async for message in query(prompt="只回复 ok", options=options):
        text = assistant_text(message)
        if text:
            print(text, end="")
    print()


if __name__ == "__main__":
    asyncio.run(main())
