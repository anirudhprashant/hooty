// What each simulation teaches, written once, so tools/auto-explore.mjs can attach it to lessons with no model at all.
// match: words that mean a lesson is about this idea (the title counts three times as much as the facts).
// grades: the classes where the idea is taught. tasks: challenges a child completes by moving the sliders; each must be
// false at the start and reachable, which auto-explore checks before using it. params(text) can tune a widget to the lesson.
export const KITS = {
  linegraph: {
    grades: [8, 10], match: [/linear equation/, /equations? in two variables/, /\bslope\b/, /\bgradient\b/, /straight[- ]line graph/, /graph of (a|the) (straight )?line/, /y\s*=\s*mx/, /linear (graph|relation|function)/],
    title: 'Steer the straight line', takeaway: 'm sets how steep the line is and c sets where it crosses the y-axis: y = mx + c.',
    tasks: [
      { say: 'Make the line flat.', when: 'm == 0', then: 'A flat line has slope 0: y stays the same however x changes.' },
      { say: 'Make the line go downhill from left to right.', when: 'm < 0', then: 'A negative slope means y falls as x grows.' },
      { say: 'Build y = 2x - 2: climb 2 for every 1 across, crossing the y-axis at -2.', when: 'm == 2 and c == -2', then: 'You built y = 2x - 2.' },
    ],
  },
  parabola: {
    grades: [9, 10], match: [/quadratic/, /parabola/, /zeroe?s of (a |the )?polynomials?/, /degree 2/, /quadratic curve/],
    title: 'Shape the parabola', takeaway: 'a opens and stretches the curve, h and k move its vertex, and the roots are where it meets the x-axis.',
    tasks: [
      { say: 'Make the parabola open downwards.', when: 'a < 0', then: 'A negative a turns the curve upside down.' },
      { say: 'Move the vertex to the point (2, 1).', when: 'h == 2 and k == 1', then: 'The vertex is the point (h, k).' },
      { say: 'Make the curve just touch the x-axis at one point.', when: 'k == 0 and a != 0', then: 'When the vertex sits on the x-axis there is exactly one root.' },
    ],
  },
  pythagoras: {
    grades: [7, 10], match: [/pythagor/, /baudh/, /right[- ]angled triangle/, /hypotenuse/],
    title: 'Squares on the sides', takeaway: 'In every right-angled triangle, the squares on the two short sides add up to the square on the long side.',
    tasks: [
      { say: 'Swap the sides: make a = 4 and b = 3.', when: 'a == 4 and b == 3', then: 'Swapping the short sides does not change the long side: it is still 5.' },
      { say: 'Find another whole-number triangle: make the sides 6 and 8.', when: 'a == 6 and b == 8', then: '36 + 64 = 100 = 10 x 10. Doubling a triple gives another triple.' },
      { say: 'Make both short sides equal.', when: 'a == b', then: 'Then c x c = 2 x a x a, so the long side is a times about 1.414.' },
    ],
  },
  trig: {
    grades: [10, 10], match: [/trigonometr/, /\bsin\b/, /\bcos\b/, /\bsine\b/, /\bcosine\b/, /angles? of (elevation|depression)/, /heights and distances/],
    title: 'Turn the angle', takeaway: 'sin is the height, cos is the width and tan is the steepness of a line of length 1 at that angle.',
    tasks: [
      { say: 'Find the angle where sin and cos are equal.', when: 't == 45', then: 'At 45 degrees sin and cos are both about 0.707, and tan is exactly 1.' },
      { say: 'Make tan bigger than 1.', when: 't > 45', then: 'Past 45 degrees the height beats the width, so tan is more than 1.' },
      { say: 'Turn the line straight up.', when: 't == 90', then: 'At 90 degrees sin is 1 and cos is 0.' },
    ],
  },
  probability: {
    grades: [6, 10], match: [/probabilit/, /\bchance\b/, /\blikely\b/, /\bcoins?\b/, /\bdice\b/, /\bdie\b/, /\brandom\b/, /\boutcomes?\b/],
    params: (text) => ({ kind: /\bdice\b|\bdie\b|six-sided/.test(text) ? 'dice' : 'coin' }),
    title: 'Try it many times', takeaway: 'A few tries can land anywhere, but many tries settle close to the true chance.',
    tasks: [
      { say: 'Try 100 times.', when: 'n >= 100', then: 'Look how the blue line has started to settle.' },
      { say: 'Try 500 times.', when: 'n == 500', then: 'With many tries the fraction gets very close to the true chance.' },
    ],
  },
  similar: {
    grades: [7, 10], match: [/similar (figures|triangles|shapes|polygons)/, /similarity/, /scale factor/, /enlarge/, /scale drawing/, /\bscaling\b/],
    title: 'Grow the triangle', takeaway: 'Similar shapes have the same angles; lengths grow by the scale factor and area by its square.',
    tasks: [
      { say: 'Make the copy smaller than the original.', when: 'k < 1', then: 'A scale factor below 1 shrinks the shape but keeps its angles.' },
      { say: 'Make the area 9 times bigger.', when: 'k == 3', then: '3 x 3 = 9: the area grows by the square of the scale factor.' },
    ],
  },
  circle: {
    grades: [6, 10], match: [/circumference/, /\bpi\b/, /π/, /areas? of (a |the )?circles?/, /perimeter of (a |the )?circles?/, /areas? of (a |the )?sectors?/, /c\/d ratio/],
    title: 'Unroll the circle', takeaway: 'Every circle goes round about 3.14 diameters, which is π. Circumference = 2πr and area = πr².',
    tasks: [
      { say: 'Double the radius to 8.', when: 'r == 8', then: 'The circumference doubled too, but the area became 4 times as big.' },
      { say: 'Make the smallest circle.', when: 'r == 1', then: 'Even a tiny circle is still about 3.14 diameters round.' },
    ],
  },
  dotplot: {
    grades: [6, 10], match: [/\bmean\b/, /\bmedian\b/, /\bmode\b/, /\baverage\b/, /central tendency/, /\brange\b.*\bdata\b|\bdata\b.*\brange\b/, /\bstatistics\b/, /data handling/],
    title: 'Mean, median and range', takeaway: 'The mean is the balance point and feels every value; the median is the middle and ignores how far out the ends are.',
    tasks: [
      { say: 'Change only Number 5 to 10. Which moved: the mean or the median?', when: 'v5 == 10', then: 'The mean moved to 5.4 but the median stayed at 5: one big value pulls the mean, not the median.' },
      { say: 'Make the mean exactly 6.', when: 'v1 + v2 + v3 + v4 + v5 == 30', then: 'Mean = total divided by 5, so the five numbers must add up to 30.' },
    ],
  },
  squarecube: {
    grades: [6, 8], match: [/perfect squares?/, /perfect cubes?/, /square roots?/, /cube roots?/, /square numbers/, /cube numbers/, /squares and cubes/, /\ba square and a cube\b/],
    title: 'Squares and cubes', takeaway: 'n x n makes a square number and n x n x n makes a cube number; going back gives the square root or cube root.',
    tasks: [
      { say: 'Find the side that makes 64 small cubes.', when: 'n == 4', then: '4 x 4 x 4 = 64, so the cube root of 64 is 4.' },
      { say: 'Make the square have 49 small squares.', when: 'n == 7', then: '7 x 7 = 49, so the square root of 49 is 7.' },
    ],
  },
  ap: {
    grades: [10, 10], match: [/arithmetic progression/, /common difference/, /\bnth term\b|\bn th term\b/, /sum of (the )?first n/, /\bAPs?\b/],
    title: 'Build the progression', takeaway: 'Each term adds the same difference d; the nth term is a + (n - 1)d.',
    tasks: [
      { say: 'Make every term the same.', when: 'd == 0', then: 'With d = 0 the progression never changes.' },
      { say: 'Make the terms go down.', when: 'd < 0', then: 'A negative common difference makes each term smaller.' },
      { say: 'Make the 10th term 29.', when: 'n == 10 and a + 9 * d == 29', then: 'The 10th term is a + 9d, and here that is 29.' },
    ],
  },
  triarea: {
    grades: [6, 9], match: [/areas? of (a |the )?triangles?/, /triangles? and (their |its )?areas?/, /base and (the )?height/, /areas? of (a |the )?parallelograms?/],
    title: 'Slide the corner', takeaway: 'A triangle is half of the rectangle with the same base and height, wherever its top corner sits.',
    tasks: [
      { say: 'Slide the top corner past the end of the base.', when: 'p < 0 or p > b', then: 'The height is still measured straight down to the base line, so the area does not change.' },
      { say: 'Make the area 20 square units.', when: 'b * h == 40', then: 'Half of base x height = 20, so base x height must be 40.' },
    ],
  },
  angle: {
    grades: [6, 8], match: [/\bangles?\b/, /protractor/, /\bacute\b/, /\bobtuse\b/, /right angle/, /\breflex\b/, /\bdegrees?\b/],
    title: 'Open the angle', takeaway: 'Angles are named by size: acute below 90, right at 90, obtuse up to 180 and reflex beyond.',
    tasks: [
      { say: 'Make a right angle.', when: 'angle == 90', then: 'A right angle is exactly 90 degrees, a square corner.' },
      { say: 'Make an obtuse angle.', when: 'angle > 90 and angle < 180', then: 'Obtuse angles are between 90 and 180 degrees.' },
      { say: 'Make a reflex angle.', when: 'angle > 180 and angle < 360', then: 'A reflex angle is more than a straight line.' },
    ],
  },
  fraction: {
    grades: [6, 8], match: [/fractions?/, /numerator/, /denominator/],
    title: 'Shade the fraction', takeaway: 'The bottom number says how many equal parts, the top says how many are taken.',
    tasks: [
      { say: 'Show one half.', when: 'n * 2 == d', then: 'Any fraction whose top is half its bottom equals one half.' },
      { say: 'Show a fraction bigger than one whole.', when: 'n > d', then: 'When the top is bigger than the bottom you have more than a whole.' },
    ],
  },
  rectangle: {
    grades: [6, 8], match: [/\bareas?\b/, /perimeter/, /square units/, /unit squares/],
    title: 'Build the rectangle', takeaway: 'Area counts the squares inside (length x width); perimeter is the distance around (2 x (length + width)).',
    tasks: [
      { say: 'Make a square.', when: 'l == b', then: 'A square is a rectangle whose sides are equal.' },
      { say: 'Make a different rectangle with area 24.', when: 'l * b == 24', then: 'Different rectangles can share an area: 24 = 6 x 4 = 8 x 3 = 12 x 2.' },
    ],
  },
  integers: {
    grades: [6, 8], match: [/integers?/, /negative numbers?/, /number line/, /positive and negative/],
    title: 'Jump on the number line', takeaway: 'Adding a positive number moves right, adding a negative number moves left.',
    tasks: [
      { say: 'Land exactly on zero.', when: 'start + add == 0', then: 'A number plus its opposite is zero.' },
      { say: 'Land below -5.', when: 'start + add < -5', then: 'Adding a negative number moves you further left.' },
    ],
  },
  balance: {
    grades: [6, 8], match: [/simple equations?/, /\bequations?\b/, /\bunknowns?\b/, /\bsolve\b/, /\bvariables?\b/],
    title: 'Balance the scale', takeaway: 'Solving an equation means finding the value that makes both sides equal.',
    tasks: [{ say: 'Find the x that balances 2x + 3 = 11.', when: 'x == 4', then: '2 x 4 + 3 = 11, so x = 4.' }],
  },
  pattern: {
    grades: [6, 7], match: [/patterns?/, /sequences?/, /square numbers/, /triangular numbers/, /odd numbers/, /even numbers/, /powers? of 2/],
    params: (text) => ({ rule: /triangular/.test(text) ? 'triangle' : /\bodd\b/.test(text) ? 'odd' : /\beven\b/.test(text) ? 'even' : /powers? of (2|two)|doubl/.test(text) ? 'power2' : 'square' }),
    title: 'Grow the pattern', takeaway: 'A pattern follows a rule, so you can predict any term without drawing it.',
    tasks: [
      { say: 'Show term 5.', when: 'n == 5', then: 'Count the dots and look for the rule that builds each term.' },
      { say: 'Jump to term 8.', when: 'n == 8', then: 'Each term follows the same rule as the one before.' },
    ],
  },
  symmetry: {
    grades: [6, 7], match: [/symmetr/, /mirror line/],
    title: 'Lines of symmetry', takeaway: 'A regular shape has as many lines of symmetry as it has sides.',
    tasks: [{ say: 'Make a shape with 6 lines of symmetry.', when: 'n == 6', then: 'A regular hexagon has 6 sides and 6 lines of symmetry.' }],
  },
  rotation: {
    grades: [6, 8], match: [/rotation/, /rotational/, /\bturn(ing)? symmetry\b/],
    title: 'Turn the shape', takeaway: 'The number of times a shape looks the same in one full turn is its order of rotational symmetry.',
    tasks: [{ say: 'Turn the shape until it looks the same again.', when: 'turn == 120', then: 'A three-armed shape matches itself every 120 degrees, so its order is 3.' }],
  },
  decimal: {
    grades: [6, 7], match: [/decimals?/, /tenths?/, /hundredths?/, /place value/],
    title: 'Build the decimal', takeaway: 'Ten hundredths make a tenth and ten tenths make one.',
    tasks: [{ say: 'Build 2.05.', when: 'o == 2 and t == 0 and h == 5', then: '2 ones, 0 tenths and 5 hundredths is 2.05.' }],
  },
  bargraph: {
    grades: [6, 7], match: [/bar graphs?/, /pictographs?/, /tally/, /\bfrequency\b/],
    title: 'Read the bar graph', takeaway: 'Bars compare amounts, and the scale tells you what each mark is worth.',
    tasks: [{ say: 'Make Monday and Wednesday equal.', when: 'a == c', then: 'Equal bars mean equal amounts.' }],
  },
};
