"""Regression checks for merging both weeks, filters, grading, and HTTP routes."""
import json
import random
import subprocess
import sys
import threading
import unittest
from collections import Counter
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import algebra_generator
import number_theory_generator
from algebra_questions import QUESTIONS as ALGEBRA_QUESTIONS
from number_theory_questions import QUESTIONS as NUMBER_THEORY_QUESTIONS
from questions import QUESTIONS, label_question
from question_generator import generate_question, generator_catalog, question_from_id
from mathcounts import (TrainerHandler, api, grade_assessment, make_assessment,
                       make_generated_question, practice_feedback, public_questions)


class CombinedTests(unittest.TestCase):
    def test_banks_are_preserved_with_distinct_foundations(self):
        self.assertEqual(len(QUESTIONS), 90)
        self.assertEqual(len({q['id'] for q in QUESTIONS}), 90)
        self.assertEqual(len({q['topic'] for q in QUESTIONS}), 10)
        self.assertEqual(Counter(q['week'] for q in QUESTIONS), {1: 60, 2: 30})
        for week, bank in [(1, NUMBER_THEORY_QUESTIONS), (2, ALGEBRA_QUESTIONS)]:
            merged = {q['id']: q for q in QUESTIONS if q['week'] == week}
            for original in bank:
                self.assertEqual(merged[original['id']], label_question(original, week))
        for q in public_questions():
            self.assertNotIn('answer', q)
            self.assertNotIn('best_method', q)
            self.assertNotIn('hints', q)
            self.assertNotEqual(q['topic'], 'Foundations')

    def test_stable_generators_reconstruct_both_original_id_formats(self):
        self.assertEqual(len(generator_catalog()), 30)
        self.assertEqual(len({s['key'] for s in generator_catalog()}), 30)
        for week, module in [(1, number_theory_generator), (2, algebra_generator)]:
            for key in module.TEMPLATES:
                for seed in [0, 12345, 2**64-1]:
                    original = module.generate_question(key, seed)
                    merged = generate_question(key, seed)
                    self.assertEqual(merged, label_question(original, week))
                    self.assertEqual(question_from_id(merged['id']), merged)

    def test_generated_ids_survive_a_new_python_process(self):
        ids = [generate_question('remainder', 37)['id'],
               generate_question('systems_2', 91)['id']]
        script = ('import json; from question_generator import question_from_id; '
                  f'print(json.dumps([question_from_id(i) for i in {ids!r}]))')
        reconstructed = json.loads(subprocess.check_output(
            [sys.executable, '-c', script], cwd=Path(__file__).parent, text=True))
        self.assertEqual(reconstructed, [question_from_id(i) for i in ids])

    def test_every_week_source_topic_and_difficulty_filter(self):
        rng = random.Random(43)
        for week in ['all', '1', '2']:
            topics = ['All topics'] + sorted({q['topic'] for q in QUESTIONS
                                              if week == 'all' or str(q['week']) == week})
            for topic in topics:
                for level in ['All levels', 'Warm-up', 'Contest', 'Stretch', 'Contest + Stretch']:
                    for source in ['bank', 'mixed', 'generated']:
                        query = {'week': [week], 'topic': [topic], 'level': [level],
                                 'source': [source], 'count': ['20']}
                        bank = [q for q in QUESTIONS
                                if (week == 'all' or str(q['week']) == week)
                                and (topic == 'All topics' or q['topic'] == topic)
                                and (level == 'All levels' or q['level'] == level
                                     or level == 'Contest + Stretch' and q['level'] != 'Warm-up')]
                        if source == 'bank' and not bank:
                            with self.assertRaises(ValueError):
                                make_assessment(query, rng)
                            continue
                        result = make_assessment(query, rng)
                        qs = result['questions']
                        self.assertEqual(len(qs), min(20, len(bank)) if source == 'bank' else 20)
                        self.assertEqual(len({q['id'] for q in qs}), len(qs))
                        self.assertEqual(len({q['prompt'] for q in qs}), len(qs))
                        for q in qs:
                            self.assertTrue(week == 'all' or str(q['week']) == week)
                            self.assertTrue(topic == 'All topics' or q['topic'] == topic)
                            self.assertTrue(level == 'All levels' or q['level'] == level
                                            or level == 'Contest + Stretch' and q['level'] != 'Warm-up')
                            self.assertEqual(sorted(q['method_order']), list(range(4)))
                        if source == 'generated':
                            self.assertTrue(all(q['generated'] for q in qs))
                        if source == 'bank':
                            self.assertFalse(any(q['generated'] for q in qs))

    def test_both_week_assessments_cover_all_ten_topics(self):
        for source in ['bank', 'mixed', 'generated']:
            result = make_assessment({'source': [source], 'count': ['20'],
                                      'level': ['All levels']}, random.Random(8))
            counts = Counter(q['topic'] for q in result['questions'])
            self.assertEqual(set(counts), {q['topic'] for q in QUESTIONS})
            self.assertEqual(set(counts.values()), {2})
            self.assertEqual({q['week'] for q in result['questions']}, {1, 2})

    def test_guided_feedback_and_grading_accept_both_banks_and_generators(self):
        all_questions = QUESTIONS + [generate_question(s['key'], 58) for s in generator_catalog()]
        for q in all_questions:
            self.assertTrue(practice_feedback({'id': [q['id']], 'action': ['answer'],
                                               'value': [str(q['answer'])]})['correct'])
        for offset in range(0, len(all_questions), 20):
            batch = all_questions[offset:offset+20]
            report = grade_assessment({'items': [{'id': q['id'], 'answer': q['answer'],
                                                  'method': q['best_method']} for q in batch]})
            self.assertEqual(report['score'], len(batch))
            self.assertEqual(report['strategy_score'], len(batch))

    def test_invalid_week_and_cross_week_filters_are_rejected(self):
        for week in ['0', '3', 'Both', '']:
            for operation in [make_assessment, make_generated_question]:
                with self.assertRaises(ValueError):
                    operation({'week': [week]})
        for operation in [make_assessment, make_generated_question]:
            with self.assertRaises(ValueError):
                operation({'week': ['1'], 'topic': ['Algebra foundations']})
        with self.assertRaises(ValueError):
            grade_assessment({'items': [{'id': 'unknown', 'answer': 1}]})

    def test_both_explorer_families_share_the_api(self):
        self.assertEqual(api('/api/remainder', {'a': ['-17'], 'n': ['5']})['remainder'], 3)
        self.assertEqual(api('/api/powers', {'base': ['2'], 'n': ['8'], 'exponent': ['50']})['result'], 0)
        self.assertEqual(api('/api/congruence', {'a': ['4'], 'b': ['6'], 'n': ['10']})['solutions'], [4, 9])
        self.assertEqual(api('/api/balance', {})['x'], '6')
        self.assertEqual((api('/api/systems', {})['x'], api('/api/systems', {})['y']), ('4', '5'))
        self.assertEqual(api('/api/quadratics', {})['roots'], ['3', '4'])
        self.assertEqual(api('/api/identities', {})['left'], 600)


class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), TrainerHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def test_assets_and_both_weeks_are_served_from_one_origin(self):
        for path in TrainerHandler.ASSETS:
            with urlopen(self.url+path) as response:
                self.assertEqual(response.status, 200)
        for endpoint in ['remainder', 'classes', 'clock', 'powers', 'congruence',
                         'balance', 'systems', 'quadratics', 'identities']:
            with urlopen(self.url+'/api/'+endpoint) as response:
                self.assertIsInstance(json.load(response), dict)
        for path in ['/mathcounts.py', '/questions.py', '/../week%201/questions.py']:
            with self.assertRaises(HTTPError) as error:
                urlopen(self.url+path)
            self.assertEqual(error.exception.code, 404)

    def test_combined_http_assessment_and_unknown_id_error(self):
        query = urlencode({'count': 20, 'source': 'mixed', 'level': 'All levels'})
        with urlopen(self.url+'/api/assessment?'+query) as response:
            qs = json.load(response)['questions']
        self.assertEqual({q['week'] for q in qs}, {1, 2})
        request = Request(self.url+'/api/grade', data=json.dumps({'items': [
            {'id': q['id'], 'answer': ''} for q in qs]}).encode(),
            headers={'Content-Type': 'application/json'})
        with urlopen(request) as response:
            self.assertEqual(json.load(response)['skipped'], 20)
        bad = Request(self.url+'/api/grade', data=b'{"items":[{"id":"unknown","answer":0}]}',
                      headers={'Content-Type': 'application/json'})
        with self.assertRaises(HTTPError) as error:
            urlopen(bad)
        self.assertEqual(error.exception.code, 400)


if __name__ == '__main__':
    unittest.main()
