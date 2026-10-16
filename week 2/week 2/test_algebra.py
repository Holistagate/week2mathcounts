"""Independent answer checks, edge cases, reproducibility, and HTTP routes."""
import json
import math
import random
import threading
import unittest
from fractions import Fraction
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from algebra import TrainerHandler, grade_assessment, make_assessment, public_question, practice_feedback
from explorers import balance, systems, quadratics, identities, IDENTITIES, api
from questions import QUESTIONS
from question_generator import TEMPLATES, generate_question, question_from_id


class AlgebraTests(unittest.TestCase):
    def test_authored_answers_independently(self):
        roots = lambda a,b,c: [Fraction(n,2) for n in range(-40,41) if a*Fraction(n,2)**2+b*Fraction(n,2)+c == 0]
        expected = {
            "distribute": (3*(2*1-5)+4)-(3*(2*0-5)),
            "negative-distribution": 7-2*(3*0-4),
            "balance": next(x for x in range(50) if 4*x+7 == 31),
            "both-sides": next(x for x in range(50) if 5*x-8 == 2*x+13),
            "fraction-equation": next(x for x in range(50) if Fraction(x,3)+Fraction(x,4) == 14),
            "nested": next(x for x in range(50) if 2*(3*x-(x-4)) == 36),
            "system-add": next(x for x in range(20) for y in range(20) if x+y == 13 and x-y == 5),
            "system-substitute": next(x for x in range(20) if x+(2*x+1) == 16),
            "system-subtract": next(y for x in range(20) for y in range(20) if 3*x+2*y == 24 and x+2*y == 12),
            "system-scale": next(x for x in range(20) for y in range(20) if 2*x+3*y == 23 and 3*x-2*y == 2),
            "tickets": next(a for a in range(19) if 4*(18-a)+7*a == 96),
            "target-combination": next(x+y for x in range(20) for y in range(20) if 2*x+y == 11 and x+2*y == 13),
            "system-fraction": next(n for n in range(30) for y in range(30) if n+y == 8 and 2*n-2*y == 4),
            "dependent": sum(x+y == 7 and 2*x+2*y == 14 for x in range(8) for y in range(8)),
            "inconsistent": 0,
            "factor-roots": max(roots(1,-7,12)), "square-roots": len(roots(1,0,-49)),
            "zero-root": min(roots(1,-5,0)), "nonmonic": max(roots(2,-7,3)),
            "rectangle": next(w for w in range(1,55) if w*(w+3) == 54),
            "root-sum": sum(roots(1,-11,18)), "complete-square": max(roots(1,6,-16)),
            "discriminant": 0, "root-squares": (4+math.sqrt(6))**2+(4-math.sqrt(6))**2,
            "difference-squares": 53**2-47**2,
            "square-binomial": (4+3)**2-4**2-3**2,
            "cube-difference": (12**3-7**3)//(12-7),
            "sum-product": 10**2+4**2, "sum-cubes": 7**3+2**3,
            "cancellation-domain": next(x for x in range(-20,21) if x != 5 and Fraction(x*x-25,x-5) == 12),
        }
        self.assertEqual(len(QUESTIONS), 30)
        self.assertEqual(len({q["id"] for q in QUESTIONS}), 30)
        self.assertEqual(set(expected), {q["id"] for q in QUESTIONS})
        for q in QUESTIONS:
            self.assertAlmostEqual(q["answer"], expected[q["id"]], msg=q["id"])
            self.assertEqual(len(q["hints"]), 3)
            self.assertEqual(len(q["methods"]), 4)
            self.assertNotIn("answer", public_question(q))
            self.assertTrue(practice_feedback({"id":[q["id"]],"action":["answer"],"value":[str(q["answer"])]})["correct"])

    def test_balance_handles_all_solution_counts(self):
        self.assertEqual(balance(4,7,0,31)["x"], "6")
        self.assertEqual(balance(2,0,0,1)["x"], "1/2")
        self.assertEqual(balance(0,1,0,1)["status"], "infinite")
        self.assertEqual(balance(2,1,2,3)["status"], "none")

    def test_systems_and_degenerate_equations(self):
        for a,b,d,e in [(2,3,3,-2),(-3,2,0,5),(0,2,3,0),(1,0,0,1),(4,7,2,5)]:
            for x,y in [(Fraction(1,2),Fraction(3,2)),(-4,7),(0,0)]:
                c,f=a*x+b*y,d*x+e*y
                result=systems(a,b,c,d,e,f)
                self.assertEqual(Fraction(result["x"]),x)
                self.assertEqual(Fraction(result["y"]),y)
        for coefficients,status in [((1,1,7,2,2,14),"infinite"),((1,1,7,2,2,15),"none"),
                                    ((0,0,0,0,0,0),"infinite"),((0,0,1,0,0,0),"none"),
                                    ((0,0,0,1,2,3),"infinite"),((0,0,1,1,2,3),"none")]:
            self.assertEqual(systems(*coefficients)["status"],status)

    def test_quadratic_roots_satisfy_original(self):
        for a in [-4,-1,1,2,5]:
            for r in range(-5,6):
                for s in range(-5,6):
                    result=quadratics(a,-a*(r+s),a*r*s)
                    self.assertEqual({Fraction(x) for x in result["roots"]},{r,s})
        self.assertEqual(quadratics(1,2,5)["status"],"none")
        irrational=quadratics(1,0,-2)
        for r in irrational["approximations"]:
            self.assertAlmostEqual(r*r,2)
        self.assertEqual(irrational["roots"],["−√2","√2"])
        self.assertEqual(quadratics(0,2,-3)["roots"],["3/2"])
        self.assertEqual(quadratics(0,0,0)["status"],"infinite")
        self.assertEqual(quadratics(0,0,1)["status"],"none")

    def test_identities_match_including_negatives_and_zero(self):
        for key in IDENTITIES:
            for x in range(-8,9):
                for y in range(-8,9):
                    r=identities(x,y,key)
                    self.assertEqual(r["left"],r["right"])
        for query in [{"a":["1.5"]},{"a":["101"]},{"a":["NaN"]}]:
            with self.assertRaises(ValueError): api("/api/quadratics",query)

    def test_1800_generated_variants_independently(self):
        for key in TEMPLATES:
            for seed in range(150):
                q=generate_question(key,seed);m=q["audit"];kind=m["kind"]
                if kind=="linear": answer=Fraction(m["d"]-m["b"],m["a"]-m["c"])
                elif kind=="nested": answer=Fraction(m["total"]-m["a"]*m["d"],m["a"]*(m["c"]-1))
                elif kind=="sum_difference": answer=Fraction(m["total"]+m["difference"],2)
                elif kind=="tickets": answer=next(y for y in range(m["count"]+1) if m["low"]*(m["count"]-y)+m["high"]*y == m["revenue"])
                elif kind=="system_squares": answer=next(x*x+y*y for x in range(1,41) for y in range(1,36) if 2*x+y==m["first"] and x+2*y==m["second"])
                elif kind=="quadratic": answer=max(x for x in range(-60,61) if m["a"]*x*x+m["b"]*x+m["c"]==0)
                elif kind=="rectangle": answer=next(w for w in range(1,50) if w*(w+m["extra"])==m["area"])
                elif kind in ["root_squares","sum_cubes"]:
                    x,y=next((x,y) for x in range(1,76) for y in range(1,76) if x+y==m["total"] and x*y==m["product"])
                    power=2 if kind=="root_squares" else 3;answer=x**power+y**power
                elif kind=="difference_squares": answer=m["high"]**2-m["low"]**2
                else: answer=Fraction(m["high"]**3-m["low"]**3,m["high"]-m["low"])
                self.assertEqual(q["answer"],answer,(key,seed))
                self.assertEqual(question_from_id(q["id"]),q)

    def test_assessments_all_topics_levels_and_sources(self):
        for topic in ["All topics","Foundations","Systems","Quadratics","Identities"]:
            for level in ["All levels","Warm-up","Contest","Stretch","Contest + Stretch"]:
                for source in ["bank","mixed","generated"]:
                    assessment=make_assessment({"count":["20"],"topic":[topic],"level":[level],"source":[source]},random.Random(73))
                    self.assertEqual(len({q["prompt"] for q in assessment["questions"]}),assessment["count"])
                    if source!="bank": self.assertEqual(assessment["count"],20)
                    by_id={q["id"]:q for q in QUESTIONS}
                    answers=[dict(id=q["id"],answer=(by_id[q["id"]] if q["id"] in by_id else question_from_id(q["id"]))["answer"]) for q in assessment["questions"]]
                    report=grade_assessment({"items":answers})
                    self.assertEqual(report["score"],report["total"])
        with self.assertRaises(ValueError): grade_assessment({"items":[{"id":"unknown","answer":0}]})


class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=ThreadingHTTPServer(("127.0.0.1",0),TrainerHandler)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
        cls.url=f"http://127.0.0.1:{cls.server.server_port}"
    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join()
    def test_assets_and_api(self):
        for path in ["/","/style.css","/algebra.css","/assessment.js","/lessons.js","/app.js","/explorer-ui.js"]:
            with urlopen(self.url+path) as response: self.assertEqual(response.status,200)
        for path in ["balance","systems","quadratics","identities","questions","generate","assessment"]:
            with urlopen(self.url+"/api/"+path) as response: self.assertIsInstance(json.load(response),dict)
        request=Request(self.url+"/api/grade",data=json.dumps({"items":[{"id":"system-add","answer":9}]}).encode(),headers={"Content-Type":"application/json"})
        with urlopen(request) as response: self.assertEqual(json.load(response)["score"],1)
        with self.assertRaises(HTTPError) as context: urlopen(self.url+"/questions.py")
        self.assertEqual(context.exception.code,404)


if __name__=="__main__": unittest.main()
