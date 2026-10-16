"""Exact algebra calculations for the browser explorers."""
from fractions import Fraction
from math import gcd, isqrt
import re


def integer(query, key, default, low=-100, high=100):
    raw = query.get(key, [str(default)])[0]
    if len(raw) > 8 or not re.fullmatch(r"[+-]?\d+", raw, flags=re.ASCII):
        raise ValueError(f"{key} must be a whole number.")
    value = int(raw)
    if not low <= value <= high:
        raise ValueError(f"{key} must be from {low} to {high}.")
    return value


def balance(a, b, c, d):
    coefficient, constant = a-c, d-b
    steps = [f"Subtract {c}x from both sides: ({a-c})x + ({b}) = {d}.",
             f"Subtract {b} from both sides: ({coefficient})x = {constant}."]
    if coefficient:
        x = str(Fraction(constant, coefficient))
        steps += [f"Divide both sides by {coefficient}: x = {x}.",
                  f"Check: both original sides equal {Fraction(a)*Fraction(x)+b}."]
        return dict(status="unique", x=x, steps=steps)
    status = "infinite" if constant == 0 else "none"
    steps.append("0 = 0 is true for every real x." if constant == 0 else f"0 = {constant} is impossible.")
    return dict(status=status, steps=steps)


def systems(a, b, c, d, e, f):
    det = a*e-b*d
    if det:
        x, y = Fraction(c*e-b*f, det), Fraction(a*f-c*d, det)
        steps = [f"Multiply equation 1 by {e} and equation 2 by {b}.",
                 f"Subtract the second result from the first. The y terms cancel: ({det})x = {c*e-b*f}.",
                 f"Divide by {det}: x = {x}."]
        if b:
            steps.append(f"Substitute into equation 1: {b}y = {c-a*x}, so y = {y}.")
        else:
            steps.append(f"Substitute into equation 2: {e}y = {f-d*x}, so y = {y}.")
        steps.append(f"Check both originals: {a*x+b*y} = {c} and {d*x+e*y} = {f}.")
        return dict(status="unique", x=str(x), y=str(y), steps=steps)
    inconsistent = (a == b == 0 and c != 0) or (d == e == 0 and f != 0)
    inconsistent = inconsistent or a*f != c*d or b*f != c*e
    if inconsistent:
        return dict(status="none", steps=["The variable coefficients are dependent, but the constants do not agree.",
                                           "Elimination leaves a false equation. There is no pair that satisfies both originals."])
    return dict(status="infinite", steps=["One equation is a multiple of the other, or an equation is 0 = 0.",
                                           "The system has infinitely many real solutions. A restriction such as nonnegative integers can change the count."])


def quadratics(a, b, c):
    if a == 0:
        if b:
            root = str(Fraction(-c, b))
            return dict(status="linear", roots=[root], steps=["a = 0, so this is a linear equation.", f"{b}x = {-c}, so x = {root}."])
        return dict(status="infinite" if c == 0 else "none", roots=[],
                    steps=["Every real x works because 0 = 0." if c == 0 else f"The constant equation {c} = 0 is impossible."])
    discriminant = b*b-4*a*c
    steps = [f"Identify a = {a}, b = {b}, c = {c}.",
             f"D = b² − 4ac = ({b})² − 4({a})({c}) = {discriminant}."]
    result = dict(a=a, b=b, c=c, discriminant=discriminant, steps=steps,
                  vertex=[str(Fraction(-b, 2*a)), str(Fraction(4*a*c-b*b, 4*a))])
    if discriminant < 0:
        return dict(result, status="none", roots=[], approximations=[],
                    steps=steps+["D < 0, so there are no real roots. The graph does not cross the x-axis."])
    square = isqrt(discriminant)
    if square*square == discriminant:
        values = sorted({Fraction(-b-square, 2*a), Fraction(-b+square, 2*a)})
        roots, approximations = [str(r) for r in values], [float(r) for r in values]
        steps += [f"Use x = (−b ± √D)/(2a) = ({-b} ± {square})/({2*a}).",
                  "The real " + ("root is " if len(roots) == 1 else "roots are ") + " and ".join(roots) + "."]
    else:
        factor = next(n for n in range(isqrt(discriminant), 0, -1) if discriminant % (n*n) == 0)
        inside = discriminant // (factor*factor)
        common = gcd(gcd(abs(b), factor), abs(2*a))
        constant, outside, denominator = -b//common, factor//common, 2*a//common
        if denominator < 0:
            constant, denominator = -constant, -denominator
        radical = (str(outside) if outside != 1 else "") + f"√{inside}"
        def root(sign):
            numerator = f"{constant} {'−' if sign < 0 else '+'} {radical}" if constant else ("−" if sign < 0 else "") + radical
            return numerator if denominator == 1 else f"({numerator})/{denominator}"
        roots = [root(-1), root(1)]
        approximations = sorted([(-b-discriminant**0.5)/(2*a), (-b+discriminant**0.5)/(2*a)])
        steps += [f"Use the quadratic formula: x = ({-b} ± √{discriminant})/({2*a}).",
                  "Simplify square factors in the radical and common factors in the fraction.",
                  "The radical form is exact; decimals are approximations."]
    return dict(result, status="one" if discriminant == 0 else "two", roots=roots, approximations=approximations)


IDENTITIES = {
    "difference_squares": ("x² − y² = (x − y)(x + y)", lambda x,y: x*x-y*y, lambda x,y: (x-y)*(x+y)),
    "square_sum": ("(x + y)² = x² + 2xy + y²", lambda x,y: (x+y)**2, lambda x,y: x*x+2*x*y+y*y),
    "square_difference": ("(x − y)² = x² − 2xy + y²", lambda x,y: (x-y)**2, lambda x,y: x*x-2*x*y+y*y),
    "difference_cubes": ("x³ − y³ = (x − y)(x² + xy + y²)", lambda x,y: x**3-y**3, lambda x,y: (x-y)*(x*x+x*y+y*y)),
    "sum_cubes": ("x³ + y³ = (x + y)(x² − xy + y²)", lambda x,y: x**3+y**3, lambda x,y: (x+y)*(x*x-x*y+y*y)),
}


def identities(x, y, kind):
    if kind not in IDENTITIES:
        raise ValueError("Choose a listed identity.")
    formula, left, right = IDENTITIES[kind]
    return dict(x=x, y=y, kind=kind, formula=formula, left=left(x,y), right=right(x,y),
                difference=x-y, total=x+y, product=x*y,
                square_middle=2*x*y, cube_middle=x*y)


def api(path, query):
    if path == "/api/balance":
        return balance(*(integer(query,k,v) for k,v in zip("abcd", (4,7,0,31))))
    if path == "/api/systems":
        return systems(*(integer(query,k,v) for k,v in zip("abcdef", (2,3,23,3,-2,2))))
    if path == "/api/quadratics":
        return quadratics(*(integer(query,k,v) for k,v in zip("abc", (1,-7,12))))
    if path == "/api/identities":
        return identities(integer(query,"x",53), integer(query,"y",47), query.get("kind",["difference_squares"])[0])
    raise ValueError("Unknown calculation.")
