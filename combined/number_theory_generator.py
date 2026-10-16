"""Versioned, seeded templates for fresh modular-arithmetic questions.

Each generated ID contains its template and 64-bit seed. Regeneration is pure,
so grading, hints, and saved assessments survive a Python-server restart.
Keep the v1 builders unchanged if introducing a future generator version.
"""
import math
import random
import re


TEMPLATES = {}


def template(key, topic, level):
    def register(builder):
        TEMPLATES[key] = {"key": key, "topic": topic, "level": level, "builder": builder}
        return builder
    return register


def question(prompt, answer, unit, best, alternatives, reason, hints, solution, params):
    return dict(prompt=prompt, answer=answer, unit=unit, methods=[best, *alternatives],
                best_method=0, method_reason=reason, hints=hints, solution=solution,
                _params=params)


@template("remainder", "Foundations", "Warm-up")
def remainder_problem(rng):
    n, quotient = rng.randint(3, 15), rng.randint(12, 75)
    r = rng.randrange(n)
    a = quotient*n+r
    return question(f"What is the remainder when {a} is divided by {n}?", r, "remainder",
        f"Subtract a nearby multiple of {n}", ["Multiply the number and divisor", "Use the units digit alone", "Use the quotient as the remainder"],
        "Full groups account for multiples of the divisor; the remainder is what is left.",
        [f"Find the largest multiple of {n} no greater than {a}.", f"{n} × {quotient} = {quotient*n}.", f"Subtract {quotient*n} from {a}."],
        f"{a} = {quotient} × {n} + {r}, so the remainder is {r}.", {"a":a,"n":n})


@template("product", "Foundations", "Contest")
def product_problem(rng):
    n = rng.choice([7, 9, 11, 13])
    c = rng.randint(2, n-2)
    a, b = rng.randint(8, 25)*n-1, rng.randint(8, 25)*n+c
    r = (-c) % n
    return question(f"What is the remainder when {a} × {b} is divided by {n}?", r, "remainder",
        f"Use {a} ≡ −1 and {b} ≡ {c} (mod {n})", ["Add the two factors", "Multiply just their units digits", "Multiply their division quotients"],
        "A representative of −1 makes the modular product especially short.",
        [f"{a} is one less than a multiple of {n}.", f"The factors are congruent to −1 and {c}.", f"Convert −{c} to a nonnegative remainder modulo {n}."],
        f"{a} × {b} ≡ (−1) × {c} = −{c} ≡ {r} (mod {n}).", {"a":a,"b":b,"n":n})


@template("odd_sum", "Foundations", "Stretch")
def odd_sum_problem(rng):
    count, n = rng.randint(125, 999), rng.choice([7, 9, 11, 13])
    r = count*count % n
    return question(f"What is the remainder when the sum of the first {count} positive odd integers is divided by {n}?", r, "remainder",
        "Use the fact that the first k odd integers sum to k²", ["Use the number of terms as the sum", "Multiply the number of terms by the modulus", "Add just the first and last terms"],
        "Recognizing the square replaces a long arithmetic progression with one modular product.",
        ["1 + 3 + … + (2k − 1) = k².", f"Here k = {count}, and {count} ≡ {count%n} (mod {n}).", f"Square {count%n} and reduce modulo {n}."],
        f"The sum is {count}². Modulo {n}, it equals {count%n}² ≡ {r}.", {"count":count,"n":n})


@template("pattern_term", "Cycles", "Warm-up")
def pattern_term_problem(rng):
    digits = rng.sample(range(1, 10), rng.choice([3, 4, 5]))
    k = rng.randint(101, 1500)
    position = (k-1) % len(digits)
    return question(f"The sequence {', '.join(map(str,digits))} repeats forever. What is its {k}th term?", digits[position], "term",
        "Reduce the term's zero-based position by the cycle length", ["Reduce the term number modulo 10", "Add the digits in one cycle", "Multiply the first term by the term number"],
        "Position k corresponds to index k − 1 in a repeating list.",
        [f"One cycle contains {len(digits)} terms.", f"({k} − 1) mod {len(digits)} = {position}.", f"Use position {position+1} of the listed cycle."],
        f"({k} − 1) mod {len(digits)} = {position}, so term {k} is entry {position+1}, which is {digits[position]}.", {"digits":digits,"k":k})


@template("units_power", "Cycles", "Contest")
def units_power_problem(rng):
    base = 10*rng.randint(1, 30)+rng.choice([2, 3, 7, 8])
    exponent = rng.randint(100, 9999)
    digit = base % 10
    cycle = [pow(digit,k,10) for k in range(1,5)]
    index = (exponent-1) % 4
    r = cycle[index]
    return question(f"What is the units digit of {base}^{exponent}?", r, "digit",
        "Reduce the base modulo 10 and find its four-term power cycle", ["Use the exponent's units digit", "Multiply the base by the exponent", "Reduce the exponent modulo the base"],
        "Units digits depend only on the base's residue modulo 10 and the power-cycle position.",
        [f"{base} ≡ {digit} (mod 10).", f"The cycle is {', '.join(map(str,cycle))}.", f"The exponent lands on cycle entry {index+1}."],
        f"The units digits cycle {', '.join(map(str,cycle))}. Since ({exponent} − 1) mod 4 = {index}, entry {index+1} gives {r}.", {"base":base,"exponent":exponent,"n":10})


@template("power_remainder", "Cycles", "Stretch")
def power_remainder_problem(rng):
    n = rng.choice([7, 9, 11, 13, 17])
    base = rng.choice([a for a in range(2,n-1) if math.gcd(a,n)==1])
    exponent = rng.randint(100, 5000)
    period, residue = 1, base % n
    while residue != 1:
        residue = residue*base % n
        period += 1
    reduced = exponent % period
    r = pow(base,exponent,n)
    return question(f"What is the remainder when {base}^{exponent} is divided by {n}?", r, "remainder",
        f"Find a power of {base} that is 1 modulo {n}", ["Reduce the exponent modulo the divisor automatically", "Use only the power's units digit", "Multiply the base by the exponent"],
        "A block of powers congruent to 1 allows the exponent to be reduced by the actual period.",
        [f"Compute successive powers of {base} modulo {n} until reaching 1.", f"{base}^{period} ≡ 1 (mod {n}).", f"{exponent} ≡ {reduced} (mod {period}); evaluate {base}^{reduced} modulo {n}."],
        f"{base}^{period} ≡ 1 (mod {n}). Thus {base}^{exponent} ≡ {base}^{reduced} ≡ {r} (mod {n}).", {"base":base,"exponent":exponent,"n":n})


@template("multiple_remainder", "Congruences", "Warm-up")
def multiple_remainder_problem(rng):
    divisor = rng.choice([5, 7, 11])
    step = rng.choice([a for a in range(3,10) if math.gcd(a,divisor)==1])
    r = rng.randint(1,divisor-1)
    k = next(k for k in range(1,divisor) if step*k % divisor == r)
    answer = step*k
    return question(f"What is the least positive multiple of {step} that leaves remainder {r} when divided by {divisor}?", answer, "integer",
        f"List multiples of {step} and test their remainders modulo {divisor}", ["Add the multiple and the remainder", "Multiply the two divisors and stop", "Use the remainder as the original number"],
        "The first matching positive multiple is the least one that satisfies both conditions.",
        [f"The candidates are {step}, {2*step}, {3*step}, …", f"Solve {step}k ≡ {r} (mod {divisor}).", f"The first working k is {k}."],
        f"The least working multiplier is k = {k}. The number is {step} × {k} = {answer}, and {answer} mod {divisor} = {r}.", {"step":step,"divisor":divisor,"r":r})


@template("inverse", "Congruences", "Contest")
def inverse_problem(rng):
    n = rng.choice([7, 11, 13, 17, 19])
    a, x = rng.randint(2,n-2), rng.randint(1,n-1)
    b, inverse = a*x % n, pow(a,-1,n)
    return question(f"What is the least positive integer x satisfying {a}x ≡ {b} (mod {n})?", x, "x",
        f"Multiply by the inverse of {a} modulo {n}", ["Divide the right side by the coefficient as an ordinary fraction", "Subtract the coefficient from both sides", "Reduce the coefficient modulo the right side"],
        "The coefficient is relatively prime to the modulus, so multiplication by its inverse isolates x.",
        [f"Find u with {a}u ≡ 1 (mod {n}).", f"The inverse is {inverse}.", f"Reduce {inverse} × {b} modulo {n}."],
        f"{a} × {inverse} ≡ 1 (mod {n}), so x ≡ {inverse} × {b} ≡ {x} (mod {n}). The least positive x is {x}.", {"a":a,"b":b,"n":n})


@template("solution_count", "Congruences", "Stretch")
def solution_count_problem(rng):
    n = rng.choice([10, 12, 15, 18, 20, 24, 28])
    a = rng.choice([a for a in range(2,n) if math.gcd(a,n)>1])
    b = rng.randrange(n)
    d = math.gcd(a,n)
    answer = d if b % d == 0 else 0
    works = [x for x in range(n) if a*x % n == b]
    return question(f"How many integers x from 0 through {n-1} satisfy {a}x ≡ {b} (mod {n})?", answer, "solutions",
        f"Check whether gcd({a}, {n}) divides {b}", ["Assume there is always exactly one solution", "Divide both sides by the coefficient but keep the modulus", "Use the right side as the solution count"],
        "The gcd test determines existence and the number of solution classes.",
        [f"gcd({a}, {n}) = {d}.", f"{d} {'divides' if answer else 'does not divide'} {b}.", f"{'The solutions are ' + ', '.join(map(str,works)) if answer else 'No residue can satisfy the congruence'}."],
        f"gcd({a}, {n}) = {d}, which {'divides' if answer else 'does not divide'} {b}. There are {answer} solutions{' (' + ', '.join(map(str,works)) + ')' if answer else ''} in the stated range.", {"a":a,"b":b,"n":n})


@template("missing_digit", "Digits", "Warm-up")
def missing_digit_problem(rng):
    while True:
        first, third, fourth = rng.randint(1,9), rng.randrange(10), rng.randrange(10)
        known = first+third+fourth
        if known % 9:
            break  # Exclude the ambiguous pair of digits 0 and 9.
    digit = (-known) % 9
    number = first*1000+digit*100+third*10+fourth
    return question(f"The four-digit number {first}d{third}{fourth} is divisible by 9, where d is a digit. What is d?", digit, "digit",
        "Make the digit sum a multiple of 9", ["Require the units digit to be 9", "Require the unknown digit to be 9", "Make just the last two digits divisible by 9"],
        "A number is divisible by 9 exactly when its digit sum is divisible by 9.",
        [f"The known digits sum to {known}.", f"{known} + d must be divisible by 9.", f"The required digit is {digit}."],
        f"{known} + d must be a multiple of 9. The only digit that works is d = {digit}, giving {number}.", {"first":first,"third":third,"fourth":fourth})


@template("repeated_block", "Digits", "Contest")
def repeated_block_problem(rng):
    block, count = rng.randint(12,98), rng.randint(15,150)
    r = block*count % 11
    return question(f"A {2*count}-digit integer is formed by writing the two-digit block {block} exactly {count} times. What is its remainder when divided by 11?", r, "remainder",
        "Use 100 ≡ 1 modulo 11 to add the repeated blocks", ["Add individual digits without alternating signs", "Use only the final block", "Use the number of digits as the remainder"],
        "Two-digit place-value shifts multiply by 100, which is congruent to 1 modulo 11.",
        ["100 ≡ 1 (mod 11), so every two-digit block contributes the same residue.", f"Reduce {count} × {block} modulo 11.", f"{count} × {block} = {count*block}."],
        f"The number is {block}(1 + 100 + … + 100^{count-1}). Modulo 11, this is {block} × {count} ≡ {r}.", {"block":block,"count":count})


@template("factorial_tail", "Digits", "Stretch")
def factorial_tail_problem(rng):
    end, extra = rng.randint(12,60), rng.randint(11,999)
    answer = (33+extra) % 10
    return question(f"What is the units digit of 1! + 2! + 3! + … + {end}! + {extra}? Here k! = 1 × 2 × … × k.", answer, "digit",
        "Ignore factorials from 5! onward modulo 10", ["Use only the final factorial", "Add the factorial indices instead", "Reduce the number of terms modulo 10"],
        "Every factorial from 5! onward contains factors 2 and 5 and therefore contributes 0 modulo 10.",
        ["All factorials from 5! onward end in 0.", "1! + 2! + 3! + 4! = 1 + 2 + 6 + 24 = 33.", f"Find the units digit of 33 + {extra}."],
        f"Only the first four factorials contribute modulo 10. The expression is congruent to 33 + {extra} = {33+extra}, whose units digit is {answer}.", {"end":end,"extra":extra})


@template("count_class", "Counting", "Warm-up")
def count_class_problem(rng):
    low, n = rng.randint(1,75), rng.randint(3,12)
    high = low+rng.randint(50,350)
    r = rng.randrange(n)
    first = low+(r-low) % n
    count = (high-first)//n+1
    last = first+(count-1)*n
    return question(f"How many integers from {low} through {high} leave remainder {r} when divided by {n}?", count, "integers",
        "Find the first and last matching integers and count the arithmetic progression", ["Divide the upper endpoint alone by the modulus", "Count all odd integers", "Use the remainder as the count"],
        "A single residue class repeats every n integers, but both endpoints must be accounted for.",
        [f"The first matching integer is {first}.", f"The last matching integer is {last}, with step size {n}.", f"Use ({last} − {first}) ÷ {n} + 1."],
        f"The matches are {first}, {first+n}, …, {last}. Their count is ({last} − {first}) ÷ {n} + 1 = {count}.", {"low":low,"high":high,"n":n,"r":r})


@template("exclude_overlap", "Counting", "Contest")
def exclude_overlap_problem(rng):
    a, b = rng.choice([(4,6),(6,8),(6,9),(8,12),(10,15),(12,18)])
    high = rng.randint(150,1500)
    common = a*b//math.gcd(a,b)
    answer = high//a-high//common
    return question(f"How many integers from 1 through {high} are divisible by {a} but not by {b}?", answer, "integers",
        f"Subtract multiples of lcm({a}, {b}) from multiples of {a}", [f"Subtract all multiples of {b} from multiples of {a}", "Count only multiples of the product of the divisors", "Add the two divisibility counts"],
        "Only multiples in the intersection should be removed from the first group.",
        [f"There are {high//a} multiples of {a}.", f"The overlap consists of multiples of {common}; there are {high//common}.", f"Subtract {high//common} from {high//a}."],
        f"lcm({a}, {b}) = {common}. The desired count is floor({high}/{a}) − floor({high}/{common}) = {high//a} − {high//common} = {answer}.", {"high":high,"a":a,"b":b})


@template("square_classes", "Counting", "Stretch")
def square_classes_problem(rng):
    n, r = rng.choice([(8,0),(8,1),(5,1),(5,4),(9,0),(9,1)])
    high = rng.randint(125,999)
    classes = [x for x in range(n) if x*x % n == r]
    answer = sum((high-c)//n+1 if c else high//n for c in classes)
    return question(f"How many integers k from 1 through {high} have k² leaving remainder {r} when divided by {n}?", answer, "integers",
        f"Find the residue classes whose squares are {r} modulo {n}, then count them", ["Count only integers equal to the square's remainder", "Assume every square remainder is possible", "Square the upper endpoint and use its remainder as the count"],
        "Testing a complete residue system covers every square; counting the matching classes handles the full interval.",
        [f"Test squares of 0 through {n-1} modulo {n}.", f"The working classes for k are {', '.join(map(str,classes))} modulo {n}.", "Count each class in the range starting at 1, then add."],
        f"k must be in classes {', '.join(map(str,classes))} modulo {n}. Counting those classes from 1 through {high} gives {answer} integers.", {"n":n,"r":r,"high":high})


@template("packaging", "Word problems", "Warm-up")
def packaging_problem(rng):
    size, total = rng.randint(4,12), rng.randint(50,400)
    r = total % size
    extra = (-total) % size
    return question(f"A bakery packs muffins in trays of {size}. It has {total} muffins. What is the least number of additional muffins needed so every tray used is full?", extra, "muffins",
        "Find the distance to the next multiple of the tray size", ["Use the quotient as the answer", "Multiply the muffin count by the tray size", "Use the last digit alone"],
        "Complete the partly filled tray; if the count already divides evenly, no additional muffins are needed.",
        [f"Compute {total} mod {size}.", f"The remainder is {r}.", f"{'No tray is partly filled, so add 0.' if r==0 else f'Add {size} − {r} muffins.'}"],
        f"{total} has remainder {r} modulo {size}. {'The trays already fill exactly.' if r==0 else f'Adding {extra} gives {total+extra}, a multiple of {size}.'} The answer is {extra}.", {"size":size,"total":total})


@template("meetings", "Word problems", "Contest")
def meetings_problem(rng):
    days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
    start, gap, count = rng.randrange(7), rng.choice([3,4,5,6,8,9,10]), rng.randint(5,25)
    elapsed = (count-1)*gap
    final = (start+elapsed) % 7
    return question(f"A math club meets every {gap} days. Its first meeting is on {days[start]}. On what day is meeting number {count}? Enter 1 for Monday, 2 for Tuesday, …, 7 for Sunday.", final+1, "weekday number",
        "Count gaps between meetings, then reduce the elapsed days modulo 7", ["Count one gap for every meeting including the first", "Reduce the elapsed days modulo the meeting interval", "Assume the weekday stays fixed"],
        "There is one fewer gap than meetings, and weekdays repeat every seven days.",
        [f"There are {count-1} gaps from meeting 1 to meeting {count}.", f"The elapsed time is {elapsed} days, congruent to {elapsed%7} modulo 7.", f"Move {elapsed%7} days forward from {days[start]}."],
        f"({count} − 1) × {gap} = {elapsed} ≡ {elapsed%7} (mod 7). The meeting is on {days[final]}, coded {final+1}.", {"start":start,"gap":gap,"count":count})


@template("grouping", "Word problems", "Stretch")
def grouping_problem(rng):
    sizes = rng.choice([(4,6,9),(3,4,5),(6,8,12),(4,5,10),(5,6,9),(6,9,12)])
    r = rng.randint(1,min(sizes)-1)
    common = 1
    for size in sizes:
        common = common*size//math.gcd(common,size)
    answer = common+r
    return question(f"A collection contains more than {max(sizes)} coins. Grouping them in sets of {sizes[0]}, {sizes[1]}, or {sizes[2]} always leaves exactly {r} coins. What is the least possible number of coins?", answer, "coins",
        "Subtract the leftover coins, find the least common multiple, then add them back", ["Add the three group sizes and the leftovers", "Use the largest group size alone", "Multiply the leftovers by the group sizes"],
        "After removing the common remainder, the remaining coins form a positive common multiple of all three sizes.",
        [f"N − {r} must be divisible by {sizes[0]}, {sizes[1]}, and {sizes[2]}.", f"Their least common multiple is {common}.", f"Add the {r} leftover coins back."],
        f"N − {r} is a positive multiple of lcm{sizes} = {common}. The smallest possible N is {common} + {r} = {answer}.", {"sizes":list(sizes),"r":r})


def generator_catalog():
    return [{key:value for key,value in spec.items() if key != "builder"} for spec in TEMPLATES.values()]


def matching_templates(topic="All topics", level="All levels"):
    return [spec for spec in TEMPLATES.values()
            if (topic=="All topics" or spec["topic"]==topic)
            and (level=="All levels" or spec["level"]==level
                 or (level=="Contest + Stretch" and spec["level"]!="Warm-up"))]


def generate_question(key, seed):
    if key not in TEMPLATES or not isinstance(seed,int) or isinstance(seed,bool) or not 0 <= seed < 2**64:
        raise ValueError("Unknown generated question.")
    spec = TEMPLATES[key]
    rng = random.Random(seed)
    q = spec["builder"](rng)
    # Mix strategy positions too; the same ID always reconstructs the same order.
    order = list(range(4))
    rng.shuffle(order)
    q["methods"] = [q["methods"][i] for i in order]
    q["best_method"] = order.index(q["best_method"])
    q.update(id=f"gen-v1:{key}:{seed:016x}", topic=spec["topic"], level=spec["level"],
             title="Fresh practice problem", generated=True, template=key)
    return q


def question_from_id(question_id):
    if not isinstance(question_id,str):
        raise ValueError("Unknown generated question.")
    match = re.fullmatch(r"gen-v1:([a-z_]+):([0-9a-f]{16})", question_id)
    if not match:
        raise ValueError("Unknown generated question.")
    return generate_question(match[1],int(match[2],16))
