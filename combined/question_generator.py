"""Combine both stable generator versions without changing saved IDs or answers."""
import number_theory_generator as number_theory
import algebra_generator as algebra
from questions import label_question


def generator_catalog():
    return ([label_question(spec, 1) for spec in number_theory.generator_catalog()]
            + [label_question(spec, 2) for spec in algebra.generator_catalog()])


def matching_templates(topic="All topics", level="All levels", week="all"):
    return [spec for spec in generator_catalog()
            if (week == "all" or str(spec["week"]) == str(week))
            and (topic == "All topics" or spec["topic"] == topic)
            and (level == "All levels" or spec["level"] == level
                 or level == "Contest + Stretch" and spec["level"] != "Warm-up")]


def generate_question(key, seed):
    if key in number_theory.TEMPLATES:
        return label_question(number_theory.generate_question(key, seed), 1)
    if key in algebra.TEMPLATES:
        return label_question(algebra.generate_question(key, seed), 2)
    raise ValueError("Unknown generated question.")


def question_from_id(question_id):
    if isinstance(question_id, str) and question_id.startswith("gen-v1:"):
        return label_question(number_theory.question_from_id(question_id), 1)
    if isinstance(question_id, str) and question_id.startswith("alg-v1:"):
        return label_question(algebra.question_from_id(question_id), 2)
    raise ValueError("Unknown generated question.")
