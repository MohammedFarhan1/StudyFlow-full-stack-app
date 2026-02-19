from icalendar import Calendar, Event
from datetime import datetime
import pytz
import uuid


def generate_ics(events, course_title, timezone):
    cal = Calendar()
    cal.add("prodid", "-//StudyFlow//Academic Scheduler//EN")
    cal.add("version", "2.0")
    cal.add("calscale", "GREGORIAN")

    tz = pytz.timezone(timezone)

    for e in events:
        event = Event()
        event.add("uid", str(uuid.uuid4()))
        event.add("summary", f"{e['unit']} - {e['title']}")
        if e.get("description"):
            event.add("description", e["description"])

        start_dt = tz.localize(
            datetime.strptime(
                f"{e['date']} {e['start']}", "%Y-%m-%d %H:%M"
            )
        )

        end_dt = tz.localize(
            datetime.strptime(
                f"{e['date']} {e['end']}", "%Y-%m-%d %H:%M"
            )
        )

        event.add("dtstart", start_dt)
        event.add("dtend", end_dt)
        event.add("dtstamp", datetime.utcnow())

        cal.add_component(event)

    return cal.to_ical()
