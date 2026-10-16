"""One authored question bank, preserving the original question IDs."""
from number_theory_questions import QUESTIONS as NUMBER_THEORY_QUESTIONS
from algebra_questions import QUESTIONS as ALGEBRA_QUESTIONS


def label_question(question, week):
    result = dict(question, week=week)
    if result["topic"] == "Foundations":
        result["topic"] = "Remainder foundations" if week == 1 else "Algebra foundations"
    return result


QUESTIONS = ([label_question(q, 1) for q in NUMBER_THEORY_QUESTIONS]
             + [label_question(q, 2) for q in ALGEBRA_QUESTIONS])
