from __future__ import annotations

from typing import Any, Dict, List, Tuple
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from models import Syllabus


AnswerKeyEntry = Dict[str, str]


def _clean_answer_text(raw_text: str) -> str:
    text = (raw_text or "").strip()
    if text.startswith("```"):
        text = text.strip("`").strip()
    return text


def _fallback_answer(
    course_title: str,
    unit_title: str,
    topic_title: str,
    subtopic_title: str,
) -> str:
    return (
        f"This section covers {subtopic_title} from {topic_title} in {unit_title} "
        f"for the course {course_title}. Re-run answer key generation to request "
        "a more detailed explanation from the model."
    )


def _generate_subtopic_answer(
    llm_client: Any,
    model_name: str,
    course_title: str,
    unit_title: str,
    topic_title: str,
    subtopic_title: str,
) -> str:
    prompt = (
        "Write a complete answer-key explanation for students.\n"
        "Return plain text only.\n"
        "Structure:\n"
        "1) Definition or core idea\n"
        "2) Detailed explanation\n"
        "3) Real-world or practical example\n"
        "4) Common mistakes to avoid\n"
        "5) Quick revision bullets\n"
        "Keep it detailed but concise (around 220-320 words).\n\n"
        f"Course: {course_title}\n"
        f"Unit: {unit_title}\n"
        f"Topic: {topic_title}\n"
        f"Subtopic: {subtopic_title}\n"
    )

    try:
        completion = llm_client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You create high-quality answer keys for students."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=900,
        )
        content = completion.choices[0].message.content or ""
        cleaned = _clean_answer_text(content)
        if cleaned:
            return cleaned
    except Exception:
        pass

    return _fallback_answer(
        course_title=course_title,
        unit_title=unit_title,
        topic_title=topic_title,
        subtopic_title=subtopic_title,
    )


def generate_answer_key_entries(
    syllabus: Syllabus,
    llm_client: Any,
    model_name: str,
) -> List[AnswerKeyEntry]:
    entries: List[AnswerKeyEntry] = []

    for unit in syllabus.units:
        unit_title = f"Unit {unit.number}: {unit.title}".strip()
        for topic in unit.topics:
            if topic.subtopics:
                for subtopic in topic.subtopics:
                    entries.append(
                        {
                            "unit": unit_title,
                            "topic": topic.title,
                            "subtopic": subtopic.title,
                            "answer": _generate_subtopic_answer(
                                llm_client=llm_client,
                                model_name=model_name,
                                course_title=syllabus.course_title,
                                unit_title=unit_title,
                                topic_title=topic.title,
                                subtopic_title=subtopic.title,
                            ),
                        }
                    )
            else:
                entries.append(
                    {
                        "unit": unit_title,
                        "topic": topic.title,
                        "subtopic": "Overview",
                        "answer": _generate_subtopic_answer(
                            llm_client=llm_client,
                            model_name=model_name,
                            course_title=syllabus.course_title,
                            unit_title=unit_title,
                            topic_title=topic.title,
                            subtopic_title=f"{topic.title} (overview)",
                        ),
                    }
                )

    return entries


def _as_paragraph(text: str) -> str:
    escaped = escape(text)
    return escaped.replace("\n", "<br/>")


def _build_answer_key_pdf(
    syllabus: Syllabus,
    entries: List[AnswerKeyEntry],
    output_path: str,
) -> None:
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "AnswerBookTitle",
        parent=styles["Title"],
        fontSize=24,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=16,
        alignment=1,
    )
    unit_style = ParagraphStyle(
        "UnitHeader",
        parent=styles["Heading1"],
        fontSize=16,
        textColor=colors.HexColor("#1E3A8A"),
        spaceBefore=12,
        spaceAfter=8,
    )
    topic_style = ParagraphStyle(
        "TopicHeader",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=colors.HexColor("#0F766E"),
        spaceBefore=8,
        spaceAfter=4,
    )
    subtopic_style = ParagraphStyle(
        "SubtopicHeader",
        parent=styles["Heading3"],
        fontSize=11,
        textColor=colors.HexColor("#111827"),
        spaceBefore=6,
        spaceAfter=4,
    )
    answer_style = ParagraphStyle(
        "AnswerBody",
        parent=styles["BodyText"],
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#111827"),
        spaceAfter=12,
    )

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
        title=f"{syllabus.course_title} Answer Key Book",
    )

    entry_map: Dict[Tuple[str, str, str], str] = {
        (entry["unit"], entry["topic"], entry["subtopic"]): entry["answer"]
        for entry in entries
    }

    story = [
        Paragraph(_as_paragraph(f"{syllabus.course_title} - Answer Key Book"), title_style),
        Paragraph(
            _as_paragraph(
                "Detailed answers are aligned by Unit, Topic, and Subtopic for quick revision."
            ),
            styles["BodyText"],
        ),
        Spacer(1, 12),
    ]

    for unit in syllabus.units:
        unit_title = f"Unit {unit.number}: {unit.title}".strip()
        story.append(Paragraph(_as_paragraph(unit_title), unit_style))
        for topic in unit.topics:
            story.append(Paragraph(_as_paragraph(topic.title), topic_style))
            if topic.subtopics:
                for subtopic in topic.subtopics:
                    answer_text = entry_map.get(
                        (unit_title, topic.title, subtopic.title),
                        _fallback_answer(
                            course_title=syllabus.course_title,
                            unit_title=unit_title,
                            topic_title=topic.title,
                            subtopic_title=subtopic.title,
                        ),
                    )
                    story.append(Paragraph(_as_paragraph(subtopic.title), subtopic_style))
                    story.append(Paragraph(_as_paragraph(answer_text), answer_style))
            else:
                answer_text = entry_map.get(
                    (unit_title, topic.title, "Overview"),
                    _fallback_answer(
                        course_title=syllabus.course_title,
                        unit_title=unit_title,
                        topic_title=topic.title,
                        subtopic_title=f"{topic.title} (overview)",
                    ),
                )
                story.append(Paragraph(_as_paragraph("Overview"), subtopic_style))
                story.append(Paragraph(_as_paragraph(answer_text), answer_style))

    doc.build(story)


def generate_answer_key_book_pdf(
    syllabus: Syllabus,
    llm_client: Any,
    model_name: str,
    output_path: str,
) -> Dict[str, int]:
    entries = generate_answer_key_entries(
        syllabus=syllabus,
        llm_client=llm_client,
        model_name=model_name,
    )
    _build_answer_key_pdf(
        syllabus=syllabus,
        entries=entries,
        output_path=output_path,
    )
    return {"sections_generated": len(entries)}
