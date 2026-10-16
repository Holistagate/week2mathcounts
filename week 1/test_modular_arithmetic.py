"""Run with: python3 -m unittest -v test_modular_arithmetic.py"""

import json
import math
import random
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from modular_arithmetic import (TrainerHandler, clock_arithmetic,
                                congruence_classes, power_cycle,
                                practice_feedback, public_questions,
                                remainder, solve_congruence, make_assessment,
                                grade_assessment, resolve_question)
from questions import QUESTIONS


class ArithmeticTests(unittest.TestCase):
    def test_remainder_identity_including_negative_numbers(self):
        for n in range(1, 121):
            for a in (-10**9, -137, -17, -1, 0, 1, 17, 137, 10**9):
                d = remainder(a, n)
                self.assertEqual(a, d["quotient"] * n + d["remainder"])
                self.assertTrue(0 <= d["remainder"] < n)
                self.assertTrue(d["lower_multiple"] <= a < d["upper_multiple"])

    def test_classes_and_difference_agree(self):
        for n in range(1, 31):
            for a in range(-15, 16):
                d = congruence_classes(a, a + 3 * n, n)
                self.assertTrue(d["equivalent"])
                self.assertIn(a, d["members"])
                self.assertTrue(all(x % n == a % n for x in d["members"]))
                if n > 1:
                    self.assertFalse(congruence_classes(a, a + 1, n)["equivalent"])

    def test_clock_arithmetic_and_reduced_operands(self):
        for n in range(1, 31):
            for a, b in ((9, 17), (2, -5), (-9, 5), (-7, -8), (0, 0)):
                for operation, expected in (("add", a+b), ("subtract", a-b), ("multiply", a*b)):
                    d = clock_arithmetic(a, b, n, operation)
                    self.assertEqual(d["raw"], expected)
                    self.assertEqual(d["result"], expected % n)
        with self.assertRaises(ValueError):
            clock_arithmetic(1, 2, 7, "divide")

    def test_power_cycle_known_examples(self):
        d = power_cycle(2, 7, 100)
        self.assertEqual(d["cycle"], [2, 4, 1])
        self.assertEqual((d["cycle_start"], d["period"], d["result"]), (1, 3, 2))
        d = power_cycle(2, 8, 50)
        self.assertEqual(d["transient"], [2, 4])
        self.assertEqual(d["cycle"], [0])
        self.assertEqual((d["cycle_start"], d["period"], d["result"]), (3, 1, 0))
        self.assertEqual(power_cycle(7, 10, 2026)["result"], 9)

    def test_cycles_match_independent_modular_powers(self):
        for n in range(1, 61):
            for base in range(-8, 9):
                d = power_cycle(base, n, 1000000000)
                self.assertLessEqual(len(d["residues"]), n)
                self.assertEqual(len(set(d["residues"])), len(d["residues"]))
                for exponent in range(1, 150):
                    if exponent < d["cycle_start"]:
                        predicted = d["transient"][exponent - 1]
                    else:
                        predicted = d["cycle"][(exponent - d["cycle_start"]) % d["period"]]
                    self.assertEqual(predicted, pow(base, exponent, n))
                self.assertEqual(d["result"], pow(base, d["reduced_exponent"], n))

    def test_zero_exponent_and_zero_base(self):
        self.assertEqual(power_cycle(3, 7, 0)["result"], 1)
        self.assertEqual(power_cycle(0, 7, 10)["cycle"], [0])
        self.assertEqual(power_cycle(3, 1, 0)["result"], 0)
        with self.assertRaises(ValueError):
            power_cycle(0, 7, 0)

    def test_every_congruence_solution_against_brute_force(self):
        # Enumeration independently checks inverses, cancellation, and gcd.
        for n in range(1, 36):
            for a in range(-12, 13):
                for b in range(-12, 13):
                    expected = [x for x in range(n) if (a*x - b) % n == 0]
                    d = solve_congruence(a, b, n)
                    self.assertEqual(d["solutions"], expected, (a, b, n))
                    self.assertEqual(d["solvable"], bool(expected))
                    if expected:
                        self.assertEqual(len(expected), math.gcd(a, n))

    def test_congruence_examples(self):
        self.assertEqual(solve_congruence(3, 5, 7)["solutions"], [4])
        self.assertEqual(solve_congruence(4, 6, 10)["solutions"], [4, 9])
        self.assertEqual(solve_congruence(4, 5, 10)["solutions"], [])
        self.assertEqual(solve_congruence(0, 0, 7)["solutions"], list(range(7)))
        self.assertEqual(solve_congruence(0, 1, 7)["solutions"], [])

    def test_invalid_moduli(self):
        for n in (0, -1, 121, 2.5, True):
            with self.assertRaises(ValueError):
                remainder(17, n)


class PracticeTests(unittest.TestCase):
    def test_all_question_answers_independently(self):
        actual = {
            "remainder": 137 % 9, "negative": -23 % 6,
            "sum": (98+103+207) % 7, "clock": (9+17) % 12,
            "product": (48*53) % 7, "digit-sum": 987654 % 9,
            "units": pow(7, 2026, 10), "power7": pow(2, 100, 7),
            "minus-one": pow(6, 101, 7), "transient": pow(2, 50, 8),
            "power-sum": (pow(2, 20, 5)+pow(3, 20, 5)) % 5,
            "inverse": min(x for x in range(7) if (3*x-5) % 7 == 0),
            "multiple-solutions": sum((4*x-6) % 10 == 0 for x in range(10)),
            "no-solution": sum((4*x-5) % 10 == 0 for x in range(10)),
            "two-remainders": min(x for x in range(1, 36) if x % 5 == 2 and x % 7 == 3),
            "factorial": (math.factorial(10)+3) % 11,
            "bead-bags": 253 % 8, "club-calendar": (5*6) % 7 + 1,
            "full-trays": (-87) % 6,
            "sticker-pages": sum((page-3) % 4 == 0 for page in range(3,101)),
            "square-eight": 17**2 % 8,
            "three-factor-product": (99*100*101) % 7,
            "hundred-sum": sum(range(1,101)) % 7,
            "alternating-sum": sum(n if n % 2 else -n for n in range(1,101)) % 9,
            "six-digit-eleven": 123456 % 11,
            "missing-nine-digit": next(d for d in range(10) if int(f"5{d}28") % 9 == 0),
            "greatest-four-digit": max(n for n in range(1000,10000) if n % 7 == 0),
            "last-two-digits": 3**20 % 100,
            "sum-units-powers": (2**2025+5**2025) % 10,
            "thirteen-power": 13**37 % 10,
            "three-power-seven": 3**55 % 7,
            "four-power-nine": pow(4,2026,9),
            "ten-power-seven": 10**50 % 7,
            "neighbor-powers": (pow(9,2025,10)+pow(9,2026,10)) % 10,
            "six-five-clue": next(n for n in range(6,100,6) if n % 5 == 3),
            "coin-groups": next(n for n in range(2,100) if all(n % d == 1 for d in (4,6,9))),
            "one-less-345": next(n for n in range(1,100) if all(n % d == d-1 for d in (3,4,5))),
            "five-x-twelve": next(x for x in range(1,13) if (5*x) % 12 == 7),
            "six-x-fifteen": sum((6*x) % 15 == 9 for x in range(15)),
            "seven-x-eleven": next(n for n in range(1,12) if (7*n) % 11 == 4),
            "three-digit-two-clues": sum(n % 5 == 2 and n % 7 == 2 for n in range(100,1000)),
            "class-count-200": sum(n % 4 == 1 for n in range(1,201)),
            "divisors-thousand": sum(1000 % d == 0 and d % 3 == 0 for d in range(1,1001)),
            "square-divisible-eight": sum(n*n % 8 == 0 for n in range(1,101)),
            "six-not-nine": sum(n % 6 == 0 and n % 9 != 0 for n in range(1,1001)),
            "ordered-pair-five": sum((a+b) % 5 == 0 for a in range(1,13) for b in range(1,13)),
            "odd-square-eight": sum(n*n % 8 == 1 for n in range(1,101)),
            "fifty-odd-sum": sum(range(1,100,2)) % 7,
            "repeated-123": int("123"*100) % 9,
            "repeated-year-eleven": 20262026 % 11,
            "repeated-two-digits": 4747 % 101,
            "thirty-one-multiplier": next(k for k in range(1,13) if (31*k) % 12 == 0),
            "missing-eleven-digit": next(d for d in range(10) if int(f"72{d}5") % 11 == 0),
            "multiples-five-class-six": sum(n % 5 == 0 and n % 6 == 4 for n in range(1,100)),
            "repeating-digits-sum": sum([1,4,2,8][i % 4] for i in range(2026)) % 9,
            "jersey-overlap": sum(n % 4 == 0 and n % 6 == 0 for n in range(1,61)),
            "packing-one-short": next(n for n in range(1,100) if all((n+1) % d == 0 for d in (2,3,4,5))),
            "consecutive-product-three": sum(n*(n+1) % 3 == 0 for n in range(12)),
            "square-residue-five": sum({n*n % 5 for n in range(5)}),
            "factorial-sum-units": sum(math.factorial(n) for n in range(1,21)) % 10,
        }
        self.assertEqual(len({q["id"] for q in QUESTIONS}), len(QUESTIONS))
        self.assertEqual(set(actual), {q["id"] for q in QUESTIONS})
        for q in QUESTIONS:
            self.assertEqual(q["answer"], actual[q["id"]], q["id"])
            self.assertEqual(len(q["hints"]), 3)
            self.assertTrue(0 <= q["best_method"] < len(q["methods"]))
        self.assertEqual(len(QUESTIONS), 60)

    def test_feedback_and_solution_reveal(self):
        for q in QUESTIONS:
            for action, value in (("method", q["best_method"]), ("answer", q["answer"])):
                response = practice_feedback({"id":[q["id"]], "action":[action], "value":[str(value)]})
                self.assertTrue(response["correct"])
            wrong = practice_feedback({"id":[q["id"]], "action":["answer"], "value":[str(q["answer"]+1)]})
            self.assertFalse(wrong["correct"])
            response = practice_feedback({"id":[q["id"]], "action":["solution"]})
            self.assertEqual(response["answer"], q["answer"])

    def test_public_questions_do_not_reveal_answers(self):
        for q in public_questions():
            self.assertNotIn("answer", q)
            self.assertNotIn("solution", q)
            self.assertNotIn("best_method", q)


class AssessmentTests(unittest.TestCase):
    def test_random_draws_are_unique_balanced_and_keep_answers_hidden(self):
        first = make_assessment({"count":["10"]}, random.Random(1))
        second = make_assessment({"count":["10"]}, random.Random(2))
        self.assertNotEqual([q["id"] for q in first["questions"]], [q["id"] for q in second["questions"]])
        self.assertEqual(len({q["id"] for q in first["questions"]}), 10)
        self.assertEqual(len({q["topic"] for q in first["questions"]}), 6)
        for q in first["questions"]:
            self.assertNotIn("answer", q)
            self.assertNotIn("solution", q)
            self.assertNotIn("best_method", q)
            self.assertNotEqual(q["level"], "Warm-up")
            self.assertEqual(sorted(q["method_order"]), [0,1,2,3])

    def test_filters_and_small_pool_do_not_duplicate_questions(self):
        data = make_assessment({"count":["20"],"topic":["Digits"],"level":["Warm-up"],"source":["bank"]})
        self.assertEqual(data["count"], 2)
        self.assertEqual(data["requested_count"], 20)
        for q in data["questions"]:
            self.assertEqual((q["topic"],q["level"]), ("Digits","Warm-up"))
        for query in ({"count":["0"]}, {"count":["21"]}, {"topic":["Unknown"]},
                      {"level":["Unknown"]}, {"source":["unknown"]},
                      {"source":["bank"],"topic":["Congruences"],"level":["Warm-up"]}):
            with self.assertRaises(ValueError):
                make_assessment(query)

    def test_grading_correct_wrong_skipped_and_strategy_choices(self):
        result = grade_assessment({"items":[
            {"id":"remainder","answer":"2","method":1},
            {"id":"negative","answer":"5","method":0},
            {"id":"units","answer":"","method":None},
        ]})
        self.assertEqual((result["score"],result["total"],result["answered"],result["skipped"]), (1,3,2,1))
        self.assertEqual(result["percent"], 33)
        self.assertEqual((result["strategy_score"],result["strategy_answered"]), (1,2))
        self.assertEqual([r["status"] for r in result["results"]], ["correct","incorrect","skipped"])
        self.assertTrue(all(r["solution"] for r in result["results"]))
        self.assertEqual(sum(t["total"] for t in result["topics"]), 3)
        self.assertEqual(sum(t["correct"] for t in result["topics"]), 1)

    def test_all_bank_answers_grade_correctly(self):
        for start in range(0,len(QUESTIONS),20):
            batch=QUESTIONS[start:start+20]
            result=grade_assessment({"items":[{"id":q["id"],"answer":q["answer"]} for q in batch]})
            self.assertEqual(result["score"], len(batch))
            self.assertEqual(result["strategy_answered"], 0)

    def test_invalid_submissions(self):
        for payload in (None, {}, {"items":[]}, {"items":[{}]},
                        {"items":[{"id":"unknown"}]},
                        {"items":[{"id":"units"},{"id":"units"}]},
                        {"items":[{"id":"units","answer":"1.5"}]},
                        {"items":[{"id":"units","answer":True}]},
                        {"items":[{"id":"units","method":4}]},
                        {"items":[{"id":"units","method":True}]},
                        {"items":[{"id":q["id"]} for q in QUESTIONS[:21]]}):
            with self.assertRaises(ValueError):
                grade_assessment(payload)


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), TrainerHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def get_json(self, path, query):
        with urlopen(self.url + path + "?" + urlencode(query), timeout=3) as response:
            return json.load(response)

    def test_assets_and_api_routes(self):
        for path, mime in (("/", "text/html"), ("/style.css", "text/css"), ("/app.js", "text/javascript"), ("/assessment.js", "text/javascript")):
            with urlopen(self.url + path, timeout=3) as response:
                self.assertTrue(response.headers["Content-Type"].startswith(mime))
                self.assertTrue(response.read())
        for endpoint, query, field, expected in (
                ("remainder", {"a":-17,"n":5}, "remainder", 3),
                ("classes", {"a":17,"b":2,"n":5}, "equivalent", True),
                ("clock", {"a":2,"b":5,"n":7,"operation":"subtract"}, "result", 4),
                ("powers", {"base":2,"n":8,"exponent":50}, "transient", [2,4]),
                ("congruence", {"a":4,"b":6,"n":10}, "solutions", [4,9])):
            self.assertEqual(self.get_json("/api/"+endpoint, query)[field], expected)
        self.assertEqual(len(self.get_json("/api/questions", {})["questions"]), len(QUESTIONS))

    def test_assessment_draw_and_post_grading(self):
        draw = self.get_json("/api/assessment", {"count":5})
        self.assertEqual(len(draw["questions"]), 5)
        payload={"items":[{"id":q["id"],"answer":resolve_question(q["id"])["answer"]} for q in draw["questions"]]}
        request=Request(self.url+"/api/grade",data=json.dumps(payload).encode(),headers={"Content-Type":"application/json"})
        with urlopen(request,timeout=3) as response:
            self.assertEqual(json.load(response)["score"], 5)
        malformed=Request(self.url+"/api/grade",data=b"{bad-json",headers={"Content-Type":"application/json"})
        with self.assertRaises(HTTPError) as failure:
            urlopen(malformed,timeout=3)
        self.assertEqual(failure.exception.code, 400)

    def test_generated_question_hints_and_assessment_grading_over_http(self):
        q=self.get_json("/api/generate", {"topic":"Digits","level":"Warm-up"})["question"]
        self.assertTrue(q["generated"])
        self.assertNotIn("answer",q)
        hint=self.get_json("/api/practice", {"id":q["id"],"action":"hint"})
        self.assertTrue(hint["hint"])
        solution=self.get_json("/api/practice", {"id":q["id"],"action":"solution"})
        self.assertTrue(self.get_json("/api/practice", {
            "id":q["id"],"action":"answer","value":solution["answer"]})["correct"])
        request=Request(self.url+"/api/grade", data=json.dumps({"items":[
            {"id":q["id"],"answer":solution["answer"]}]}).encode(), headers={"Content-Type":"application/json"})
        with urlopen(request,timeout=3) as response:
            result=json.load(response)
            self.assertEqual((result["score"],result["generated_count"]),(1,1))

    def test_invalid_inputs_return_actionable_errors(self):
        for query in ({"n":0}, {"n":121}, {"a":"2.5"}, {"n":""}, {"a":"x"}, {"a":10**10}):
            with self.assertRaises(HTTPError) as failure:
                self.get_json("/api/remainder", query)
            self.assertEqual(failure.exception.code, 400)
            self.assertIn("error", json.load(failure.exception))

    def test_other_local_files_are_not_served(self):
        for path in ("/questions.py", "/../sprint.pdf", "/api/unknown"):
            with self.assertRaises(HTTPError) as failure:
                urlopen(self.url + path, timeout=3)
            self.assertIn(failure.exception.code, (400, 404))


if __name__ == "__main__":
    unittest.main()
