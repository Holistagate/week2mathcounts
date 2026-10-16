"""Independent answer checks for thousands of seeded problem variants."""
import json
import math
import random
import subprocess
import sys
import unittest
from pathlib import Path

from question_generator import TEMPLATES, generate_question, question_from_id, generator_catalog
from modular_arithmetic import make_assessment, make_generated_question, resolve_question, grade_assessment


def independent_answer(key, p):
    if key == "remainder":
        return p["a"] % p["n"]
    if key == "product":
        return p["a"]*p["b"] % p["n"]
    if key == "odd_sum":
        return sum(range(1,2*p["count"],2)) % p["n"]
    if key == "pattern_term":
        return (p["digits"]*((p["k"]//len(p["digits"]))+1))[p["k"]-1]
    if key in {"units_power", "power_remainder"}:
        return pow(p["base"],p["exponent"]) % p["n"]
    if key == "multiple_remainder":
        return next(x for x in range(1, p["step"]*p["divisor"]+1)
                    if x % p["step"] == 0 and x % p["divisor"] == p["r"])
    if key == "inverse":
        return next(x for x in range(1,p["n"]+1) if p["a"]*x % p["n"] == p["b"])
    if key == "solution_count":
        return sum(p["a"]*x % p["n"] == p["b"] for x in range(p["n"]))
    if key == "missing_digit":
        digits=[d for d in range(10) if (p["first"]*1000+d*100+p["third"]*10+p["fourth"]) % 9 == 0]
        if len(digits) != 1:
            raise AssertionError(f"Ambiguous missing digit: {p}")
        return digits[0]
    if key == "repeated_block":
        return int(str(p["block"])*p["count"]) % 11
    if key == "factorial_tail":
        return (sum(math.factorial(k) for k in range(1,p["end"]+1))+p["extra"]) % 10
    if key == "count_class":
        return sum(x % p["n"] == p["r"] for x in range(p["low"],p["high"]+1))
    if key == "exclude_overlap":
        return sum(x % p["a"] == 0 and x % p["b"] != 0 for x in range(1,p["high"]+1))
    if key == "square_classes":
        return sum(x*x % p["n"] == p["r"] for x in range(1,p["high"]+1))
    if key == "packaging":
        return next(x for x in range(p["size"]) if (p["total"]+x) % p["size"] == 0)
    if key == "meetings":
        day=p["start"]
        for _ in range(p["count"]-1):
            for _ in range(p["gap"]):
                day=(day+1) % 7
        return day+1
    if key == "grouping":
        return next(x for x in range(max(p["sizes"])+1, math.prod(p["sizes"])+p["r"]+1)
                    if all(x % size == p["r"] for size in p["sizes"]))
    raise AssertionError(f"No independent checker for {key}")


class GeneratorTests(unittest.TestCase):
    def test_5400_variants_against_independent_calculations(self):
        self.assertEqual(len(TEMPLATES),18)
        for key in TEMPLATES:
            for seed in range(300):
                q=generate_question(key,seed)
                with self.subTest(template=key,seed=seed):
                    self.assertEqual(q["answer"],independent_answer(key,q["_params"]))
                    self.assertEqual(len(q["methods"]),4)
                    self.assertEqual(len(set(q["methods"])),4)
                    self.assertTrue(0 <= q["best_method"] < 4)
                    self.assertEqual(len(q["hints"]),3)
                    self.assertTrue(q["solution"] and q["method_reason"])
                    self.assertIsInstance(q["answer"],int)
                    self.assertTrue(0 <= q["answer"] <= 10**9)
                    self.assertEqual(question_from_id(q["id"]),q)

    def test_each_topic_has_all_three_difficulties(self):
        catalog=generator_catalog()
        self.assertEqual(len({s["topic"] for s in catalog}),6)
        for topic in {s["topic"] for s in catalog}:
            self.assertEqual({s["level"] for s in catalog if s["topic"]==topic},{"Warm-up","Contest","Stretch"})
        self.assertTrue(all("builder" not in s for s in catalog))

    def test_reconstruction_in_a_new_python_process(self):
        expected=[generate_question(key,2**64-1) for key in TEMPLATES]
        script="import json; from question_generator import question_from_id; print(json.dumps([question_from_id(k) for k in json.loads(input())]))"
        result=subprocess.run([sys.executable,"-c",script], input=json.dumps([q["id"] for q in expected]),
                              text=True,capture_output=True,check=True,cwd=Path(__file__).parent)
        self.assertEqual(json.loads(result.stdout),expected)

    def test_invalid_identifiers_and_seeds(self):
        for bad in (None,"gen-v2:remainder:0000000000000000","gen-v1:unknown:0000000000000000",
                    "gen-v1:remainder:0","gen-v1:remainder:fffffffffffffffff","gen-v1:remainder:ZZZZZZZZZZZZZZZZ"):
            with self.assertRaises(ValueError):
                question_from_id(bad)
        for bad in (-1,2**64,True,1.5):
            with self.assertRaises(ValueError):
                generate_question("remainder",bad)

    def test_generated_filters_variation_and_hidden_answers(self):
        rng=random.Random(42)
        qs=[make_generated_question({"topic":["Digits"],"level":["Warm-up"]},rng)["question"] for _ in range(30)]
        self.assertGreater(len({q["prompt"] for q in qs}),20)
        for q in qs:
            self.assertEqual((q["topic"],q["level"]),("Digits","Warm-up"))
            self.assertTrue(q["generated"])
            self.assertFalse(set(q) & {"answer","best_method","solution","hints","_params"})


class GeneratedAssessmentTests(unittest.TestCase):
    def test_three_sources_and_mixed_balance(self):
        for source in ("bank","mixed","generated"):
            for seed in range(30):
                result=make_assessment({"count":["20"],"source":[source]},random.Random(seed))
                qs=result["questions"]
                self.assertEqual(len(qs),20)
                self.assertEqual(len({q["id"] for q in qs}),20)
                self.assertEqual(len({q["prompt"] for q in qs}),20)
                counts=[sum(q["topic"]==topic for q in qs) for topic in {q["topic"] for q in qs}]
                self.assertEqual(len(counts),6)
                self.assertLessEqual(max(counts)-min(counts),1)
                expected={"bank":0,"mixed":10,"generated":20}[source]
                self.assertEqual(result["generated_count"],expected)
                self.assertEqual(result["bank_count"],20-expected)
                graded=grade_assessment({"items":[{"id":q["id"],"answer":resolve_question(q["id"])["answer"],
                                         "method":resolve_question(q["id"])["best_method"]} for q in qs]})
                self.assertEqual((graded["score"],graded["strategy_score"]),(20,20))

    def test_fresh_sets_fill_all_topic_and_level_combinations(self):
        for spec in generator_catalog():
            for source in ("generated","mixed"):
                qs=make_assessment({"source":[source],"count":["20"],"topic":[spec["topic"]],
                                    "level":[spec["level"]]},random.Random(317))["questions"]
                self.assertEqual(len(qs),20)
                self.assertEqual(len({q["prompt"] for q in qs}),20)
                self.assertTrue(all((q["topic"],q["level"])==(spec["topic"],spec["level"]) for q in qs))

    def test_skipped_wrong_and_correct_generated_answers(self):
        qs=[generate_question(key,17) for key in ("missing_digit","grouping","inverse")]
        graded=grade_assessment({"items":[{"id":qs[0]["id"],"answer":qs[0]["answer"]},
            {"id":qs[1]["id"],"answer":qs[1]["answer"]+1},{"id":qs[2]["id"]}]})
        self.assertEqual((graded["score"],graded["skipped"],graded["generated_count"]),(1,1,3))
        self.assertEqual([r["status"] for r in graded["results"]],["correct","incorrect","skipped"])


if __name__ == "__main__":
    unittest.main()
