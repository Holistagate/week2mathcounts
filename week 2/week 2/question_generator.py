"""Versioned, reproducible algebra templates with integer answers."""
import random
import re
from questions import question

TOPICS = ("Foundations", "Systems", "Quadratics", "Identities")
LEVELS = ("Warm-up", "Contest", "Stretch")
TEMPLATES = {f"{topic.lower()}_{i}": dict(key=f"{topic.lower()}_{i}", topic=topic, level=level)
             for topic in TOPICS for i, level in enumerate(LEVELS)}


def build(key, rng):
    spec = TEMPLATES[key]
    family, difficulty = key.split("_")
    difficulty = int(difficulty)
    x, y = rng.randint(2, 40), rng.randint(2, 35)
    a, b = rng.randint(2, 12), rng.randint(1, 25)
    if family == "foundations":
        if difficulty == 0:
            prompt = f"Solve {a}x + {b} = {a*x+b}. What is x?"
            method = "Subtract the constant, then divide by the coefficient"
            solution = f"Subtract {b}: {a}x = {a*x}. Divide by {a} to get x = {x}."
            hints = ["Use the same operation on both sides.", f"First subtract {b}.", f"Then divide by {a}."]
            meta = dict(kind="linear", a=a, b=b, c=0, d=a*x+b)
        elif difficulty == 1:
            c = a + rng.randint(1, 9)
            d = (a-c)*x+b
            prompt = f"Solve {a}x + {b} = {c}x + ({d}). What is x?"
            method = "Collect the variable terms on one side"
            solution = f"Subtract {c}x and {b}: ({a-c})x = {d-b}. Thus x = {x}."
            hints = ["Move all x terms together.", f"Subtract {c}x from both sides.", f"The result is ({a-c})x = {d-b}."]
            meta = dict(kind="linear", a=a, b=b, c=c, d=d)
        else:
            c = rng.randint(2, 9)
            d = rng.randint(1, 8)
            total = a*(c*x-(x-d))
            prompt = f"Solve {a}[{c}x − (x − {d})] = {total}. What is x?"
            method = "Distribute the inner minus sign before combining terms"
            solution = f"Inside the brackets is {c-1}x + {d}. Thus {a*(c-1)}x + {a*d} = {total}, giving x = {x}."
            hints = ["−(x − d) = −x + d.", f"Combine {c}x − x.", "Distribute the outer factor, then solve."]
            meta = dict(kind="nested", a=a, c=c, d=d, total=total)
        answer = x
    elif family == "systems":
        if difficulty == 0:
            prompt = f"If x + y = {x+y} and x − y = {x-y}, what is x?"
            method = "Add the equations to eliminate y"
            solution = f"Adding gives 2x = {2*x}, so x = {x}. Substitution gives y = {y}."
            hints = ["The y coefficients are opposites.", "Add left sides and right sides.", "Divide the resulting equation by 2."]
            answer = x
            meta = dict(kind="sum_difference", total=x+y, difference=x-y)
        elif difficulty == 1:
            low, extra = rng.randint(2, 8), rng.randint(1, 6)
            high, total = low+extra, x+y
            revenue = low*x+high*y
            prompt = f"A club sells {total} tickets costing either ${low} or ${high}. Revenue is ${revenue}. How many ${high} tickets were sold?"
            method = "Subtract the revenue if all tickets cost the lower price"
            solution = f"All tickets at ${low} would bring ${low*total}. The extra ${revenue-low*total} is ${extra} per higher-price ticket, so there are {y}."
            hints = ["Write equations for the count and the revenue.", f"Compute the all-${low} revenue.", f"Divide the extra revenue by {extra}."]
            answer = y
            meta = dict(kind="tickets", count=total, low=low, high=high, revenue=revenue)
        else:
            prompt = f"If 2x + y = {2*x+y} and x + 2y = {x+2*y}, what is x² + y²?"
            method = "Solve the system by elimination, then evaluate the squares"
            solution = f"Twice the first minus the second gives 3x = {3*x}, so x = {x} and y = {y}. Then x² + y² = {x*x+y*y}."
            hints = ["First find x and y.", "Multiply the first equation by 2 and subtract the second.", "Substitute to find y, then square and add."]
            answer = x*x+y*y
            meta = dict(kind="system_squares", first=2*x+y, second=x+2*y)
    elif family == "quadratics":
        if difficulty == 0:
            y = x + rng.randint(1, 12)
            prompt = f"What is the larger solution of x² − {x+y}x + {x*y} = 0?"
            method = "Factor using the sum and product of the roots"
            solution = f"(x − {x})(x − {y}) = 0 gives roots {x} and {y}; the larger is {y}."
            hints = ["Find two numbers whose sum is the x coefficient's magnitude and whose product is the constant.", "Write a product of two binomials.", "Set each factor equal to zero and compare the roots."]
            answer = y
            meta = dict(kind="quadratic", a=1, b=-(x+y), c=x*y)
        elif difficulty == 1:
            extra = rng.randint(1, 10)
            area = x*(x+extra)
            prompt = f"A rectangle has area {area} square units and length {extra} units more than its width. What is the width?"
            method = "Use width times length and reject the negative root"
            solution = f"w(w + {extra}) = {area}, so (w − {x})(w + {x+extra}) = 0. Only w = {x} is a positive width."
            hints = ["Let the width be w.", f"The length is w + {extra}.", "Solve the quadratic and use the positive root."]
            answer = x
            meta = dict(kind="rectangle", extra=extra, area=area)
        else:
            prompt = f"The roots of x² − {x+y}x + {x*y} = 0 are r and s. What is r² + s²?"
            method = "Use (r + s)² − 2rs and the coefficients"
            solution = f"r + s = {x+y} and rs = {x*y}. Thus r² + s² = {x+y}² − 2({x*y}) = {x*x+y*y}."
            hints = ["Use the sum and product of the roots.", "r² + s² = (r + s)² − 2rs.", "Substitute the coefficient relationships."]
            answer = x*x+y*y
            meta = dict(kind="root_squares", total=x+y, product=x*y)
    else:
        if difficulty == 0:
            high, low = x+50, y
            prompt = f"What is {high}² − {low}²?"
            method = "Use (a − b)(a + b)"
            solution = f"({high} − {low})({high} + {low}) = {high-low} × {high+low} = {high*high-low*low}."
            hints = ["Recognize a difference of squares.", "Find the difference and the sum.", "Multiply those two factors."]
            answer = high*high-low*low
            meta = dict(kind="difference_squares", high=high, low=low)
        elif difficulty == 1:
            high, low = x+40, y
            prompt = f"What is ({high}³ − {low}³)/({high} − {low})?"
            method = "Factor the difference of cubes and cancel the nonzero factor"
            solution = f"a³ − b³ = (a − b)(a² + ab + b²). Cancel the nonzero denominator to get {high*high} + {high*low} + {low*low} = {high*high+high*low+low*low}."
            hints = ["Use a³ − b³ = (a − b)(a² + ab + b²).", "The denominator is nonzero here.", "Evaluate a² + ab + b²."]
            answer = high*high+high*low+low*low
            meta = dict(kind="difference_cubes", high=high, low=low)
        else:
            prompt = f"If x + y = {x+y} and xy = {x*y}, what is x³ + y³?"
            method = "Use (x + y)³ − 3xy(x + y)"
            solution = f"x³ + y³ = {x+y}³ − 3({x*y})({x+y}) = {x**3+y**3}."
            hints = ["Expand the cube of a sum.", "Remove the mixed terms, which equal 3xy(x + y).", "Substitute the given sum and product."]
            answer = x**3+y**3
            meta = dict(kind="sum_cubes", total=x+y, product=x*y)
    distractors = {
        "foundations_0": ["Add the constant before dividing", "Divide only the left side", "Treat the coefficient as an exponent"],
        "foundations_1": ["Divide each side by its own x coefficient", "Subtract the constants and stop", "Ignore the x term on the right"],
        "foundations_2": ["Distribute the inner minus to x only", "Cancel parentheses without changing signs", "Multiply only the first term by the outside factor"],
        "systems_0": ["Subtract the equations and report the result as x", "Multiply the two right sides", "Set y equal to zero"],
        "systems_1": ["Divide all revenue by the higher ticket price", "Assume half the tickets have each price", "Subtract the ticket count from the revenue"],
        "systems_2": ["Square the sum without subtracting 2xy", "Add the right sides and call that x² + y²", "Square only the first equation's right side"],
        "quadratics_0": ["Set x equal to the constant term", "Divide the constant by the x coefficient", "Ignore the x term and take a square root"],
        "quadratics_1": ["Use width² = area", "Divide area by the difference of the sides", "Add the side difference to the area"],
        "quadratics_2": ["Square the sum of the roots with no correction", "Use the product of the roots as the answer", "Add the magnitudes of the two coefficients"],
        "identities_0": ["Square the difference of the two numbers", "Multiply the two numbers only", "Subtract the bases without squaring"],
        "identities_1": ["Square the difference of the two bases", "Use a² − b² after cancellation", "Use a² − ab + b² after cancellation"],
        "identities_2": ["Cube the sum without a correction", "Cube the product", "Use the formula for a difference of cubes"],
    }
    methods = [method, *distractors[key]]
    q = question("", "Fresh algebra problem", spec["topic"], spec["level"], prompt, answer, methods, 0, hints, solution)
    q["audit"] = meta
    return q


def generator_catalog():
    return list(TEMPLATES.values())


def matching_templates(topic="All topics", level="All levels"):
    return [s for s in TEMPLATES.values() if (topic == "All topics" or s["topic"] == topic)
            and (level == "All levels" or s["level"] == level
                 or level == "Contest + Stretch" and s["level"] != "Warm-up")]


def generate_question(key, seed):
    if key not in TEMPLATES or isinstance(seed, bool) or not isinstance(seed, int) or not 0 <= seed < 2**64:
        raise ValueError("Unknown generated question.")
    rng = random.Random(seed)
    q = build(key, rng)
    order = list(range(4))
    rng.shuffle(order)
    q["methods"] = [q["methods"][i] for i in order]
    q["best_method"] = order.index(0)
    q.update(id=f"alg-v1:{key}:{seed:016x}", generated=True, template=key)
    return q


def question_from_id(question_id):
    match = re.fullmatch(r"alg-v1:([a-z_0-9]+):([0-9a-f]{16})", question_id) if isinstance(question_id, str) else None
    if not match:
        raise ValueError("Unknown generated question.")
    return generate_question(match[1], int(match[2], 16))
