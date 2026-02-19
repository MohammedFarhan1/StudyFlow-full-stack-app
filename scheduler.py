from datetime import datetime, timedelta
from models import ScheduleRequest


def _parse_date(date_str: str) -> datetime:
    # Accept both YYYY-MM-DD and DD-MM-YYYY to be lenient with client input.
    for fmt in ("%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    raise ValueError(
        f"Invalid date '{date_str}'. Expected YYYY-MM-DD or DD-MM-YYYY."
    )


def _normalize_time(time_str: str) -> str:
    # Accept 24-hour (HH:MM) or 12-hour with AM/PM (H:MM AM/PM).
    raw = time_str.strip()
    for fmt in ("%H:%M", "%I:%M %p", "%I:%M%p"):
        try:
            return datetime.strptime(raw, fmt).strftime("%H:%M")
        except ValueError:
            continue
    raise ValueError(
        f"Invalid time '{time_str}'. Expected HH:MM or H:MM AM/PM."
    )


def _flatten_syllabus(req: ScheduleRequest):
    items = []
    for unit in req.syllabus.units:
        unit_title = f"Unit {unit.number}: {unit.title}".strip()
        for topic in unit.topics:
            if topic.subtopics:
                for subtopic in topic.subtopics:
                    items.append({
                        "unit": unit_title,
                        "title": subtopic.title,
                        "kind": "subtopic",
                        "parent_topic": topic.title,
                    })
            else:
                items.append({
                    "unit": unit_title,
                    "title": topic.title,
                    "kind": "topic",
                    "parent_topic": None,
                })
    return items


def generate_structured_schedule(req: ScheduleRequest):
    start = _parse_date(req.start_date)
    end = _parse_date(req.end_date)

    current_day = start
    events = []

    syllabus_items = _flatten_syllabus(req)
    item_idx = 0

    while current_day <= end and item_idx < len(syllabus_items):
        for slot in req.time_slots:
            if item_idx >= len(syllabus_items):
                break

            item = syllabus_items[item_idx]

            start_time = _normalize_time(slot.start)
            end_time = _normalize_time(slot.end)

            description = ""
            if item["kind"] == "subtopic" and item["parent_topic"]:
                description = f"Parent topic: {item['parent_topic']}"

            events.append({
                "date": current_day.strftime("%Y-%m-%d"),
                "start": start_time,
                "end": end_time,
                "unit": item["unit"],
                "title": item["title"],
                "description": description,
            })

            item_idx += 1

        current_day += timedelta(days=1)

    return events
