from pydantic import BaseModel, Field
from typing import List, Optional


class Subtopic(BaseModel):
    title: str


class Topic(BaseModel):
    title: str
    subtopics: List[Subtopic]


class Unit(BaseModel):
    number: str
    title: str
    topics: List[Topic]


class Syllabus(BaseModel):
    course_title: str
    units: List[Unit]


class TimeSlot(BaseModel):
    start: str  # HH:MM or H:MM AM/PM
    end: str    # HH:MM or H:MM AM/PM


class ScheduleRequest(BaseModel):
    syllabus: Optional[Syllabus] = None
    start_date: str        # YYYY-MM-DD or DD-MM-YYYY
    end_date: str          # YYYY-MM-DD or DD-MM-YYYY
    time_slots: List[TimeSlot]
    timezone: str = "Asia/Kolkata"


class AnswerKeyRequest(BaseModel):
    syllabus: Optional[Syllabus] = None


class TodoItem(BaseModel):
    title: str
    level: str  # unit | topic | subtopic
    children: List["TodoItem"] = Field(default_factory=list)
    completed: bool = False


class SyllabusTodo(BaseModel):
    course_title: str
    items: List[TodoItem]


TodoItem.model_rebuild()
