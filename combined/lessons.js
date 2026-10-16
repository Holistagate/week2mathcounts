const lessons = {
  foundations: {
    number: "01", title: "Keep the equation balanced.",
    intro: "A strong algebra base starts with distributing correctly, combining like terms, and doing the same operation to both sides.",
    takeaway: "An equation is a balance. Add, subtract, multiply, or divide both sides by the same quantity; division requires a nonzero divisor.",
    cards: [
      ["Expressions and equations", "An expression such as 3x + 2 has a value. An equation such as 3x + 2 = 17 says two expressions are equal. Simplify an expression; solve an equation."],
      ["Distribute, then combine", "3(2x − 5) + 4x = 6x − 15 + 4x = 10x − 15. Only like terms combine: 6x + 4x = 10x, but 6x + 4 stays as written."],
      ["A minus sign reaches every term", "7 − 2(3x − 4) = 7 − 6x + 8 = 15 − 6x. Write the outside factor as −2 before distributing."],
    ],
    examples: [
      ["Variables on both sides", "5x − 8 = 2x + 13", ["Subtract 2x from both sides: 3x − 8 = 13.", "Add 8 to both sides: 3x = 21.", "Divide by 3: x = 7.", "Check: both sides of the original equation equal 27."]],
      ["Clear fractions", "x/3 + x/4 = 14", ["Multiply every term on both sides by 12, the least common denominator.", "4x + 3x = 168, so 7x = 168.", "x = 24. Check: 8 + 6 = 14."]],
    ],
    mistake: "Do not combine unlike terms or distribute to only one term. Subtracting (x − 4) gives −x + 4.",
    discuss: ["Can an equation have no solution or infinitely many solutions?", "Yes. 2x + 1 = 2x + 3 gives 1 = 3, so no x works. 2x + 1 = 2x + 1 is true for every real x."],
  },
  systems: {
    number: "02", title: "Two equations. One shared solution.",
    intro: "A solution must satisfy both equations. Use substitution when a variable is isolated; use elimination when coefficients can cancel.",
    takeaway: "Look at the coefficients before choosing a method. If the question asks for x + y or another expression, try to find it directly.",
    cards: [
      ["Substitution", "If y = 2x + 1 and x + y = 16, replace y: x + (2x + 1) = 16. Then 3x = 15, so x = 5 and y = 11."],
      ["Elimination", "For x + y = 13 and x − y = 5, add the equations: 2x = 18. Thus x = 9 and y = 4. Multiplying a whole equation by a nonzero number preserves its solutions."],
      ["What the graph means", "Two distinct intersecting lines have one solution. Parallel distinct lines have none. The same line written twice has infinitely many real solutions. Degenerate equations such as 0 = 1 must also be checked."],
    ],
    examples: [
      ["Scale, then cancel", "2x + 3y = 23; 3x − 2y = 2", ["Multiply the first equation by 2: 4x + 6y = 46.", "Multiply the second by 3: 9x − 6y = 6.", "Add: 13x = 52, so x = 4.", "Substitute into the first: 8 + 3y = 23, so y = 5.", "Check the second: 3(4) − 2(5) = 2."]],
      ["Find the requested expression", "2x + y = 11; x + 2y = 13. Find x + y.", ["Add the equations: 3x + 3y = 24.", "Factor out 3: 3(x + y) = 24.", "Divide by 3: x + y = 8. Individual values were unnecessary."]],
      ["Translate a word problem", "18 tickets at $4 or $7 bring $96. How many $7 tickets?", ["Let s count $4 tickets and a count $7 tickets.", "s + a = 18 and 4s + 7a = 96.", "Subtract 4(s + a) = 72: 3a = 24.", "a = 8. Check: 10·4 + 8·7 = 96."]],
    ],
    mistake: "When scaling an equation, multiply every term, including the constant. A solution to just one equation is not a solution to the system.",
    discuss: ["Do x + y = 7 and 2x + 2y = 14 determine one pair?", "No. They are the same equation, so there are infinitely many real pairs. If x and y must be nonnegative integers, there are exactly eight pairs, from (0,7) to (7,0)."],
  },
  quadratics: {
    number: "03", title: "Factor, solve, and keep every root.",
    intro: "A quadratic has the form ax² + bx + c = 0 with a ≠ 0. Start with factoring, then learn when completing the square or the quadratic formula helps.",
    takeaway: "Move all terms to one side before factoring. If a product is zero, at least one factor is zero. Keep all roots until the problem's restrictions rule one out.",
    cards: [
      ["Factoring and the zero-product rule", "x² − 7x + 12 = (x − 3)(x − 4). A sum of −7 and product of 12 suggest −3 and −4. If the product equals 0, x = 3 or x = 4."],
      ["Quadratic formula", "x = (−b ± √(b² − 4ac))/(2a). The discriminant D = b² − 4ac gives two distinct real roots when D > 0, one repeated real root when D = 0, and no real roots when D < 0."],
      ["Sum and product of roots", "If r and s are roots, r + s = −b/a and rs = c/a. For x² − 8x + 10 = 0: r² + s² = (r + s)² − 2rs = 64 − 20 = 44."],
    ],
    examples: [
      ["Do not lose the zero root", "x² − 5x = 0", ["Factor: x(x − 5) = 0.", "Set either factor equal to zero: x = 0 or x = 5.", "Dividing by x at the start would lose x = 0."]],
      ["Complete the square", "x² + 6x = 16", ["Half the x coefficient is 3. Add 3² = 9 to both sides.", "x² + 6x + 9 = 25, so (x + 3)² = 25.", "x + 3 = ±5, giving x = 2 or x = −8."]],
      ["Use the context", "A rectangle's width is w, length is w + 3, and area is 54.", ["w(w + 3) = 54, so w² + 3w − 54 = 0.", "Factor: (w + 9)(w − 6) = 0.", "The algebra gives w = −9 or w = 6. A width is positive, so w = 6."]],
    ],
    mistake: "√49 = 7 is the principal square root, but x² = 49 has x = ±7. The zero-product rule works for a product equal to zero, not a sum equal to zero.",
    discuss: ["Can you find r² + s² without calculating either root?", "Yes. Use r² + s² = (r + s)² − 2rs and read the sum and product from the coefficients. This avoids unnecessary radicals."],
  },
  identities: {
    number: "04", title: "Recognize structure before expanding.",
    intro: "Algebraic identities turn long calculations into short ones. Learn why the patterns work and where they save time.",
    takeaway: "x² − y² = (x − y)(x + y). x³ − y³ = (x − y)(x² + xy + y²). Cancellation applies to factors and requires a nonzero denominator.",
    cards: [
      ["Squares", "(x + y)² = x² + 2xy + y²; (x − y)² = x² − 2xy + y²; x² − y² = (x − y)(x + y). Expand the factors to verify each pattern."],
      ["Cubes", "x³ − y³ = (x − y)(x² + xy + y²). The extension x³ + y³ = (x + y)(x² − xy + y²) uses a minus sign in the middle of the second factor."],
      ["Sums and products", "x² + y² = (x + y)² − 2xy. Also x³ + y³ = (x + y)³ − 3xy(x + y). These are useful when a problem supplies x + y and xy."],
    ],
    examples: [
      ["A numerical shortcut", "53² − 47²", ["Use the difference of squares: (53 − 47)(53 + 47).", "The factors are 6 and 100, so the result is 600."]],
      ["Derive the cube identity", "(x − y)(x² + xy + y²)", ["Distribute: x³ + x²y + xy² − x²y − xy² − y³.", "The mixed terms cancel, leaving x³ − y³.", "So (12³ − 7³)/(12 − 7) = 12² + 12·7 + 7² = 277."]],
      ["Keep the original restriction", "(x² − 25)/(x − 5), with x ≠ 5", ["Factor the numerator: (x − 5)(x + 5).", "Cancel the nonzero factor x − 5 to get x + 5.", "The original expression remains undefined at x = 5; simplification does not remove that restriction."]],
    ],
    mistake: "(x + y)² is not x² + y²; the middle term is 2xy. Also x³ − y³ is not (x − y)³.",
    discuss: ["Why can you cancel in (x² − y²)/(x − y) but not in (x + y)/x?", "In the first expression, factor the numerator and cancel the factor x − y, provided x ≠ y. In the second, x is a term in a sum; the expression is 1 + y/x for x ≠ 0."],
  },
};
