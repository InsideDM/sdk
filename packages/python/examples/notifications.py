"""Send a template notification with a stable, caller-owned intent key.

Requires configured WhatsApp, an approved template and an authorized recipient.
Run directly for sync usage, or import send_async from your asyncio application.
"""
import os

from insidedm import AsyncInsideDM, InsideDM
from insidedm.types.inputs import BusinessMessagesSendArguments


def notification() -> BusinessMessagesSendArguments:
    return {
        "to": {"phone": os.environ["INSIDEDM_RECIPIENT_PHONE"]},
        "content": {"type": "template", "template": {"id": os.environ["INSIDEDM_TEMPLATE_ID"]},
                    "variables": {"name": os.environ["INSIDEDM_RECIPIENT_NAME"]}},
        "idempotency_key": os.environ["INSIDEDM_INTENT_KEY"],
    }


def send() -> str:
    with InsideDM(api_key=os.environ["INSIDEDM_API_KEY"]) as client:
        result = client.messages.send(**notification())
        print(result.data.state, result.meta.request_id)
        return result.data.id


async def send_async() -> str:
    async with AsyncInsideDM(api_key=os.environ["INSIDEDM_API_KEY"]) as client:
        result = await client.messages.send(**notification())
        print(result.data.state, result.meta.request_id)
        return result.data.id


if __name__ == "__main__":
    send()
