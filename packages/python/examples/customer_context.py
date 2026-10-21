"""Ordinary server integration functions; constructing/importing performs no I/O."""
from insidedm import InsideDM


def sync_customer(client: InsideDM, *, name: str, phone: str, change_id: str) -> str:
    customer = client.contacts.create(name=name, phone=phone, idempotency_key=change_id + "/contact")
    client.contacts.tags.replace(customer.data.contact_id, tags=["repeat-buyer"], idempotency_key=change_id + "/tags")
    return customer.data.contact_id


def start_order_flow(client: InsideDM, *, binding_id: str, contact_id: str, order_id: str) -> str:
    accepted = client.events.publish(
        id="orders/" + order_id + "/paid",
        binding=binding_id,
        subject={"contact_id": contact_id},
        properties={"orderId": order_id},
    )
    return accepted.data.id


def inspect_customers(client: InsideDM) -> None:
    for customer in client.contacts.iter_items(limit=50, max_items=100):
        print(customer.id)
