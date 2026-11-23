// What each simulation teaches, written once, so tools/auto-explore.mjs can attach it to lessons with no model at all.
// match: words that mean a lesson is about this idea (the title counts three times as much as the facts).
// grades: the classes where the idea is taught. tasks: challenges a child completes by moving the sliders; each must be
// false at the start and reachable, which auto-explore checks before using it. params(text) can tune a widget to the lesson.
export const KITS = {
  opposites: {
    grades: [2, 4], subject: 'english', titleOnly: true,
    match: [/opposites?/, /opposite words?/, /prepositions?/, /words that mean the opposite/],
    title: 'Opposites and where things are', takeaway: 'Opposites describe the two ends of one idea (big and small, hot and cold), and prepositions such as in, on and under say where something is.',
    tasks: [
      { say: 'Find the pair that describes a mouse and an elephant.', when: 'w == 0', then: 'Big and small are opposites: the elephant is big, the mouse is small.' },
      { say: 'Find the pair about a train and a bullock cart.', when: 'w == 2', then: 'Fast and slow are opposites.' },
      { say: 'Find a pair that tells you WHERE something is.', when: 'w == 4', then: 'In and out, on and under: prepositions say where.' },
    ],
  },
  wordorder: {
    grades: [1, 3], subject: 'english', titleOnly: true,
    match: [/word order/, /making sentences?/, /rearranging sentences?/, /sentence building/, /jumbled words?/],
    title: 'Build the sentence', takeaway: 'English puts the doer first, then the action, then the rest: swap the doer and the thing done and the meaning swaps with them.',
    tasks: [
      { say: 'Find the sentence where an animal chases another animal.', when: 'w == 0', then: 'The dog chased the cat: the dog does it, the cat is chased.' },
      { say: 'Find the sentence where the meaning is the other way round.', when: 'w == 1', then: 'Now the cat chases the dog, because the first word changed.' },
      { say: 'Find the sentence that ends with a place.', when: 'w == 3', then: 'The bird sings in the tree: the place comes last.' },
    ],
  },
  wordbuild: {
    grades: [4, 6], subject: 'english', titleOnly: true,
    match: [/prefix/, /contraction/, /apostroph/, /word building/, /joining words/, /\bun-|\bre-|\bdis-|\bpre-/],
    title: 'Word builder', takeaway: 'A prefix changes the meaning of a word (un- not, re- again, dis- the opposite, pre- before, mis- wrongly), and a contraction squeezes two words into one with an apostrophe marking the gap.',
    tasks: [
      { say: 'Find the pair that means "not happy".', when: 'w == 0', then: 'un- turns happy into its opposite: unhappy.' },
      { say: 'Find the word that means "build again".', when: 'w == 1', then: 're- means again, so rebuild means build again.' },
      { say: "Find the contraction that does not follow the usual pattern.", when: 'w == 8', then: "Will not becomes won't: the vowels change too, so it is the odd one out." },
    ],
  },
  spelling: {
    grades: [3, 6], subject: 'english', titleOnly: true,
    match: [/plurals?/, /singular/, /spelling/, /word endings?/, /verb forms?/, /past (tense|time)/, /double letters?/, /add(ing)? (-s|-es|-ies|-ing|-ed)\b/, /\b-?(s|es|ies|ves|ing|ed) (endings?|sounds?|forms?)\b/, /words? end(ing)? (with|in) -?(s|es|ed|ing|ies|ves)\b/, /words? taken from the lesson/],
    title: 'The spelling machine', takeaway: 'Most words add -s; after s, x, ch and sh you add -es; a consonant before y becomes -ies; some f endings become -ves; -ing doubles the last letter or drops the silent e.',
    tasks: [
      { say: 'Find a word where -es is added.', when: 'w == 1', then: 'After s, x, ch and sh, -es adds a beat so the ending can be heard.' },
      { say: 'Find the word where y turns into i.', when: 'w == 3', then: 'A consonant before y makes the y into i before -es.' },
      { say: 'Find the word whose last letter doubles in the -ing form.', when: 'w == 6', then: 'Run becomes running: doubling keeps the u short.' },
      { say: 'Find the word that doubles its last letter for the past.', when: 'w == 9', then: 'Stop becomes stopped: the p doubles so the o stays short.' },
    ],
  },
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
    grades: [6, 10], match: [/\bmean\b/, /\bmedian\b/, /\bmode\b/, /\baverage\b/, /central tendency/, /\brange\b.*\bdata\b|\bdata\b.*\brange\b/, /\bstatistics\b/, /data handling/, /representative (number|value)/, /\boutliers?\b/, /mean (increase|decrease|raise)s?/],
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
  solidvol: {
    grades: [9, 10], perChapter: { 9: 3, 10: 3 }, match: [/right circular cylinders?|volume of (a )?cylinder|surface area of (a )?cylinder/, /spheres? and hemispheres?|volume of (a )?sphere|surface area of (a )?sphere/, /right circular cones?|volumes? of (a )?cone|surface area of (a )?cone/, /surface areas? and volumes?/, /combined solids?/, /volume of combined|surface area of combined/],
    title: 'Fill and cover a solid', takeaway: 'A cylinder holds pi x r x r x h, a cone a third of that, and a sphere four thirds of pi x r x r x r; surface area counts the outside.',
    tasks: [
      { say: 'Make a cylinder with radius 2 cm and height 10 cm.', when: 'pick == 0 and rr == 2 and ht == 10', then: 'V = pi x 2 x 2 x 10, about 125.7 cm3.' },
      { say: 'Switch to the cone and give it the same base and height.', when: 'pick == 1 and ht == 10', then: 'A cone holds one third of the cylinder with the same base and height.' },
      { say: 'Show the sphere and make its radius 4 cm.', when: 'pick == 2 and rr == 4', then: 'V = 4/3 x pi x 4 x 4 x 4, about 268.1 cm3.' },
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
  quadtile: {
    grades: [6, 10], perChapter: { 8: 2, 9: 3 }, match: [/quadrilateral/, /\b4-gons?\b/, /tiling|tessellat/, /four angles|angle sum/],
    title: 'Tile with any four-sided shape', takeaway: 'The four angles of any quadrilateral add up to 360 degrees, which is why four corners fit around a point and copies of the shape tile the plane.',
    tasks: [
      { say: 'Lower the top corner to make the shape flatter.', when: 'lift == 2', then: 'The shape changes but its four angles still add up to 360 degrees.' },
      { say: 'Fit a second ring of copies around the shape.', when: 'tiles == 2', then: 'Every new copy is the last one turned half a turn about the middle of a shared edge.' },
      { say: 'Make the top corner lean to the left.', when: 'push == -3', then: 'A leaning quadrilateral still tiles, and its angles still make a full turn.' },
    ],
  },
  angle: {
    grades: [4, 8], match: [/\bangles?\b/, /protractor/, /\bacute\b/, /\bobtuse\b/, /right angle/, /\breflex\b/, /\bdegrees?\b/, /\bturns?\b/, /\bquarter turn|half turn|full turn\b/],
    title: 'Open the angle', takeaway: 'Angles are named by size: acute below 90, right at 90, obtuse up to 180 and reflex beyond.',
    tasks: [
      { say: 'Make a right angle.', when: 'angle == 90', then: 'A right angle is exactly 90 degrees, a square corner.' },
      { say: 'Make an obtuse angle.', when: 'angle > 90 and angle < 180', then: 'Obtuse angles are between 90 and 180 degrees.' },
      { say: 'Make a reflex angle.', when: 'angle > 180 and angle < 360', then: 'A reflex angle is more than a straight line.' },
    ],
  },
  identity: {
    grades: [8, 10], match: [/(square|algebr)\w*[^.]{0,30}identit(y|ies)|identit(y|ies)[^.]{0,20}(square|algebr)/, /\(a \+ b\)\s*(²|\^2|squared)/, /square of (a |the )?sum/, /a² \+ 2ab/, /square of a binomial/],
    title: 'Cut the big square', takeaway: '(a + b)² is not a² + b²: the two a-by-b rectangles add the 2ab in the middle.',
    tasks: [
      { say: 'Make the big square out of four equal parts.', when: 'a == b', then: 'When a = b both rectangles are squares too, and a² + 2ab + b² is 4a².' },
      { say: 'Make a = 10 and b = 2.', when: 'a == 10 and b == 2', then: '12 × 12 = 144, while a² + b² is only 104: the two rectangles make up the other 40.' },
      { say: 'Make the b² square bigger than the a² square.', when: 'b > a', then: 'A bigger b grows the yellow square and both rectangles with it.' },
    ],
  },
  fraction: {
    perChapter: { 3: 4 }, grades: [3, 8], match: [/fractions?/, /numerator/, /denominator/, /\bhalves\b|\bquarters?\b(?! turns?)/],
    title: 'Shade the fraction', takeaway: 'The bottom number says how many equal parts, the top says how many are taken.',
    tasks: [
      { say: 'Show one half.', when: 'n * 2 == d', then: 'Any fraction whose top is half its bottom equals one half.' },
      { say: 'Cut the bar into 4 equal parts and shade one quarter.', when: 'd == 4 and n == 1', then: 'One of four equal parts is a quarter: four quarters make a whole.' },
      { say: 'Show a fraction bigger than one whole.', when: 'n > d', then: 'When the top is bigger than the bottom you have more than a whole.' },
    ],
  },
  rectangle: {
    grades: [5, 8], match: [/\bareas?\b/, /perimeter/, /square units/, /unit squares/],
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
    grades: [4, 7], match: [/patterns?/, /sequences?/, /square numbers/, /triangular numbers/, /odd numbers/, /even numbers/, /powers? of 2/],
    params: (text) => ({ rule: /triangular/.test(text) ? 'triangle' : /\bodd\b/.test(text) ? 'odd' : /\beven\b/.test(text) ? 'even' : /powers? of (2|two)|doubl/.test(text) ? 'power2' : /square/.test(text) ? 'square' : null }),
    usable: (p) => !!p.rule,   // only a lesson that names its rule: a bare 'pattern' (money, mats) gets nothing
    title: 'Grow the pattern', takeaway: 'A pattern follows a rule, so you can predict any term without drawing it.',
    tasks: [
      { say: 'Show term 5.', when: 'n == 5', then: 'Count the dots and look for the rule that builds each term.' },
      { say: 'Jump to term 8.', when: 'n == 8', then: 'Each term follows the same rule as the one before.' },
    ],
  },
  symmetry: {
    grades: [4, 7], match: [/(?<!rotational )symmetr/, /mirror line/],
    title: 'Lines of symmetry', takeaway: 'A regular shape has as many lines of symmetry as it has sides.',
    tasks: [{ say: 'Make a shape with 6 lines of symmetry.', when: 'n == 6', then: 'A regular hexagon has 6 sides and 6 lines of symmetry.' }],
  },
  rotation: {
    grades: [5, 8], match: [/rotation/, /rotational/, /\bturn(ing)? symmetry\b/],
    title: 'Turn the shape', takeaway: 'The number of times a shape looks the same in one full turn is its order of rotational symmetry.',
    tasks: [{ say: 'Turn the shape until it looks the same again.', when: 'turn == 120', then: 'A three-armed shape matches itself every 120 degrees, so its order is 3.' }],
  },
  decimal: {
    grades: [6, 7], match: [/decimals?/, /tenths?/, /hundredths?/, /place value/],
    title: 'Build the decimal', takeaway: 'Ten hundredths make a tenth and ten tenths make one.',
    tasks: [{ say: 'Build 2.05.', when: 'o == 2 and t == 0 and h == 5', then: '2 ones, 0 tenths and 5 hundredths is 2.05.' }],
  },
  bargraph: {
    grades: [4, 7], match: [/bar graphs?/, /tally/, /\bfrequency\b/],
    title: 'Read the bar graph', takeaway: 'Bars compare amounts, and the scale tells you what each mark is worth.',
    tasks: [{ say: 'Make Monday and Wednesday equal.', when: 'a == c', then: 'Equal bars mean equal amounts.' }],
  },
  factors: {
    grades: [5, 8], match: [/\bprimes?\b/, /\bfactors?\b/, /factori[sz]ation/, /\bmultiples?\b/, /divisib/, /\bcomposite\b/, /\bhcf\b|\blcm\b|highest common|lowest common|least common/],
    title: 'Rectangles of dots', takeaway: 'Every rectangle a number can make is a factor pair; a prime can only make one long row.',
    tasks: [
      { say: 'Make 24. How many rectangles can it make?', when: 'n == 24', then: '24 makes 4 rectangles: 1 x 24, 2 x 12, 3 x 8 and 4 x 6.' },
      { say: 'Find a prime number bigger than 20.', when: 'n == 23 or n == 29 or n == 31 or n == 37', then: 'It makes only one long row, so it has just two factors: it is prime.' },
      { say: 'Find the number up to 40 with 9 factors.', when: 'n == 36', then: '36 has 9 factors: 1, 2, 3, 4, 6, 9, 12, 18, 36. Square numbers have an odd number of factors.' },
    ],
  },
  algebratiles: {
    grades: [6, 8], match: [/algebraic expressions?/, /\bvariables?\b/, /letter[- ]numbers?/, /like terms/, /\balgebra\b/],
    title: 'Stretch the x bars', takeaway: 'A letter stands for a number: change x and every x in the expression changes with it.',
    tasks: [
      { say: 'Make 3x + 2 equal 14.', when: 'x == 4', then: '3 x 4 + 2 = 14.' },
      { say: 'Make the value bigger than 25.', when: '3 * x + 2 > 25', then: 'The bars grow 3 at a time, because there are 3 of them.' },
    ],
  },
  coordplane: {
    grades: [8, 10], match: [/coordinates?/, /cartesian/, /quadrants?/, /ordered pairs?/, /\bx-axis\b|\by-axis\b/, /plot(ting)? (the )?points?/, /distance between (two )?points/],
    title: 'Place the point', takeaway: 'A point is (across, up). The signs of x and y tell you its quadrant.',
    tasks: [
      { say: 'Put the point in the third quadrant.', when: 'x < 0 and y < 0', then: 'In quadrant III both coordinates are negative.' },
      { say: 'Put the point on the y-axis, 3 above the origin.', when: 'x == 0 and y == 3', then: 'Every point on the y-axis has x = 0.' },
      { say: 'Make the point exactly 5 units from the origin.', when: 'x * x + y * y == 25', then: 'For example (3, 4): 3 x 3 + 4 x 4 = 25, and the square root of 25 is 5.' },
    ],
  },
  ruler: {
    subjects: ['maths'], grades: [4, 7], match: [/measur(e|ing) (the )?length/, /standard units?/, /\bruler\b|\bscale\b.*\bcm\b|measuring tape/, /centimetres?|millimetres?/, /measuring length correctly/],
    title: 'Measure the pencil', takeaway: 'Length = where it ends minus where it starts. 1 cm = 10 mm.',
    tasks: [
      { say: 'Line the pencil up with the zero mark.', when: 'start == 0', then: 'Starting at 0, you can read the length straight off the end.' },
      { say: 'Make a pencil exactly 10 cm long.', when: 'len == 100', then: '10 cm = 100 mm.' },
      { say: 'Start at the 3 cm mark and make it 5 cm long.', when: 'start == 3 and len == 50', then: 'It ends at 8 cm: 8 - 3 = 5 cm.' },
    ],
  },
  thermometer: {
    grades: [6, 8], subjects: ['social'], match: [/thermometers?/, /\bfever\b/, /celsius|fahrenheit/, /hot (or|and) cold/, /measuring temperature|temperature and precipitation/],
    params: (text) => ({ kind: /\bbody\b|\bfever\b|clinical|doctor|\bpatient\b/.test(text) && !/laboratory|\blab\b/.test(text) ? 'clinical' : 'lab' }),
    title: 'Read the thermometer', takeaway: 'Find the value of one small mark first, then count the marks.',
    tasks: (p) => (p.kind === 'clinical'
      ? [{ say: 'Show normal body temperature.', when: 't >= 36.9 and t <= 37.1', then: 'Normal body temperature is about 37 degrees Celsius.' }, { say: 'Show a fever.', when: 't >= 38', then: 'From about 38 degrees we call it a fever.' }]
      : [{ say: 'Show where water freezes.', when: 't <= 0 and t >= -1', then: 'Water freezes at 0 degrees Celsius.' }, { say: 'Show where water boils.', when: 't >= 100 and t <= 101', then: 'Water boils at 100 degrees Celsius.' }]),
  },
  fractionadd: {
    grades: [5, 8], match: [/add(ing)? (and subtract(ing)? )?fractions?/, /subtract(ing)? fractions?/, /compar(e|ing) fractions?/, /equivalent fractions?/, /common denominators?/, /unlike (fractions|denominators)/, /like fractions/, /sum of (two )?fractions/],
    title: 'Add the fraction bars', takeaway: 'To add or compare fractions, cut them into the same size of piece first.',
    tasks: [
      { say: 'Show 1/2 + 1/4.', when: 'a1 == 1 and d1 == 2 and a2 == 1 and d2 == 4', then: '1/2 is 2/4, so 1/2 + 1/4 = 3/4.' },
      { say: 'Make the two fractions equal, using different numbers of parts.', when: 'a1 * d2 == a2 * d1 and d1 != d2 and a1 > 0', then: 'Different-looking fractions can be the same amount: they are equivalent.' },
      { say: 'Make the total exactly one whole.', when: 'a1 * d2 + a2 * d1 == d1 * d2 and a1 > 0 and a2 > 0', then: 'The two pieces fill the bar exactly.' },
    ],
  },
  placevalue: {
    grades: [4, 7], match: [/large numbers?/, /place values?/, /\blakhs?\b/, /\bcrores?\b/, /\bmillions?\b/, /indian (number )?system/, /international (number )?system/, /number names?/, /\bcommas?\b/, /periods?\b.*\bdigits?|digits?\b.*\bperiods?/],
    title: 'Build a big number', takeaway: 'One lakh is a hundred thousand, ten lakh is a million, and one crore is ten million.',
    tasks: [
      { say: 'Make one lakh.', when: 'crores == 0 and lakhs == 1 and thousands == 0 and ones == 0', then: '1,00,000 in the Indian system is 100,000: a hundred thousand.' },
      { say: 'Make ten lakh.', when: 'crores == 0 and lakhs == 10 and thousands == 0 and ones == 0', then: '10,00,000 is 1,000,000: ten lakh is one million.' },
      { say: 'Make one crore.', when: 'crores == 1 and lakhs == 0 and thousands == 0 and ones == 0', then: '1,00,00,000 is 10,000,000: one crore is ten million.' },
    ],
  },
  percent: {
    grades: [6, 8], match: [/percent(age)?s?/, /per cent/, /\bdiscount/, /\bprofit\b|\bloss\b/, /\bmarked price\b|\bselling price\b|\bcost price\b/],
    title: 'Shade the percent', takeaway: 'Percent means out of 100: 25% = 25/100 = 1/4 = 0.25.',
    tasks: [
      { say: 'Shade 50%.', when: 'p == 50', then: '50% is half: 50/100 = 1/2.' },
      { say: 'Find 10% of 200.', when: 'p == 10 and whole == 200', then: '10% is one tenth, and one tenth of 200 is 20.' },
      { say: 'Make 25% of the amount equal 30.', when: 'p == 25 and whole == 120', then: '25% is a quarter, and a quarter of 120 is 30.' },
    ],
  },
  division: {
    grades: [2, 5], perChapter: 3, titleOnly: true,
    match: [/\bdivision\b/, /\bdivid(e|ing)\b/, /remainders?\b/, /sharing equally/, /equal groups/],
    // the widget shares at most 48 sweets, so a lesson working in hundreds or thousands (multi-digit division, big word
    // problems) gets nothing: the picture would show baby numbers and teach none of that lesson
    params: (text) => ({ big: /\b\d{3,}|\b(?:hundred|thousand|lakh|crore|million)s?\b/.test(text) }),
    usable: (p) => !p.big,
    title: 'Share the sweets', takeaway: 'Division shares a total into equal groups. The number of whole groups is the quotient, and what cannot fill a group is the remainder, which is always smaller than the group size.',
    tasks: [
      { say: 'Share 12 sweets into groups of 3. How many groups are made?', when: 'total == 12 and size == 3', then: '12 shared into groups of 3 makes 4 groups, with nothing left over.' },
      { say: 'Make a share that leaves exactly 2 sweets over.', when: 'total % size == 2', then: 'The sweets that cannot fill a whole group are the remainder. Here 2 are left over, and 2 is smaller than the group size.' },
      { say: 'Make 5 full groups of 3 with 1 sweet left over.', when: 'total == 16 and size == 3', then: '5 groups of 3 use 15 sweets, and 16 take one more: 16 = 3 × 5 + 1, so 1 is left over.' },
    ],
  },
  // ---- science ----
  particles: {
    grades: [3, 9], titleOnly: true, match: [/states? of matter/, /melting|boiling|freez|evaporat|condens/, /\bice\b.*\bsteam\b/, /solids?,? liquids? and gases?/, /water has different forms/],
    title: 'Heat the water', takeaway: 'Heating gives particles more energy: held in place in ice, sliding in water, flying apart as steam.',
    tasks: [
      { say: 'Freeze the water.', when: 'temp < 0', then: 'Below 0 degrees water is ice: its particles can only jiggle in place.' },
      { say: 'Boil it.', when: 'temp >= 100', then: 'At 100 degrees water boils and its particles fly apart as steam.' },
    ],
  },
  reflection: {
    grades: [6, 10], match: [/^(?![^\n]*(?:sound|hearing|echo|ultrason))[^\n]*reflect/, /(?<!spherical )\bmirrors?\b/, /angle of incidence/, /\bnormal\b/, /periscope|kaleidoscope/],
    title: 'Bounce the light', takeaway: 'Light leaves a mirror at the same angle it arrives: angle in equals angle out.',
    tasks: [
      { say: 'Shine the ray straight at the mirror.', when: 'i == 0', then: 'Straight in, straight back out: both angles are 0.' },
      { say: 'Make the incoming angle 60 degrees.', when: 'i == 60', then: 'The reflected ray also leaves at 60 degrees.' },
    ],
  },
  pendulum: {
    grades: [6, 9], match: [/pendulum/, /oscillat/, /periodic motion/, /time period/],
    title: 'Swing the pendulum', takeaway: 'A longer string makes each swing take longer; a shorter string swings faster.',
    tasks: [
      { say: 'Make the string as long as it goes.', when: 'len == 100', then: 'The longest string swings the slowest.' },
      { say: 'Make the string short.', when: 'len <= 20', then: 'A short pendulum swings quickly.' },
    ],
  },
  daynight: {
    grades: [5, 8], match: [/day and night/, /rotation of (the )?earth/, /earth (rotates|spins)/, /\bsunrise\b|\bsunset\b/],
    title: 'Spin the Earth', takeaway: 'The Earth spins once a day, so each place turns into the sunlight and out of it again.',
    tasks: [
      { say: 'Turn to midnight.', when: 'hour == 0 or hour == 24', then: 'Your place has turned away from the Sun.' },
      { say: 'Find sunrise.', when: 'hour == 6', then: 'At sunrise your place is turning into the sunlight.' },
    ],
  },
  seasons: {
    grades: [5, 9], subjects: ['social'], titleOnly: true, match: [/^(?![^\n]*\blocal winds?\b)[^\n]*\bseasons?\b/, /\brotation and revolution\b/, /\brevolutions? (of|around) the (sun|earth)\b/, /\btilt(ed)?\b/, /\baxis\b/, /\bsummer\b|\bwinter\b/],
    // a lesson on local winds and India's season list is not about the Earth's tilt, and this kit calls July summer
    title: 'Go round the Sun', takeaway: 'The tilted Earth leans each half toward the Sun in turn, which makes the seasons.',
    tasks: [{ say: 'Go to December.', when: 'month == 12', then: 'Now the southern half leans toward the Sun: summer there, winter in India.' }],
  },
  circuit: {
    grades: [6, 10], titleOnly: true, match: [/^(?![^\n]*magnet)[^\n]*(circuit|\belectric(ity|al)?\b|\bbulbs?\b|\bswitch(es)?\b|\bconductors?\b|\bcurrent\b)/],
    // a magnetism lesson (compass, field lines) is not about lighting a bulb
    title: 'Light the bulb', takeaway: 'Current flows only round a closed circuit; more cells push more current.',
    tasks: [
      { say: 'Light the bulb.', when: 'closed == 1', then: 'Closing the switch completes the circuit, so current flows.' },
      { say: 'Make the bulb brighter.', when: 'closed == 1 and cells > bulbs', then: 'More cells for each bulb push more current through it.' },
    ],
  },
  floatsink: {
    grades: [4, 9], match: [/\bfloat/, /\bsinks?\b|\bsinking\b/, /buoyan/],
    title: 'Float or sink?', takeaway: 'Things lighter than water for their size float; denser things sink.',
    tasks: [{ say: 'Make the block sink.', when: 'd > 10', then: 'It is now denser than water, so it sinks.' }],
  },
  foilshape: {
    grades: [3, 6], subjects: ['science'], match: [/chang(e|ing) (an object'?s |the )?shapes?/, /shapes?[^.\n]*(float|sink)/, /(float|sink)[^.\n]*\bshapes?\b/, /\bfoil\b/, /making (paper )?boats?/, /\bboats?\b/],
    title: 'Change the shape, not the weight', takeaway: 'Floating depends on how much water a shape pushes aside, not just on its weight: a tight ball of foil sinks, but the same foil spread out flat or shaped into a cup floats.',
    tasks: [
      { say: 'Make the foil float.', when: 'shape >= 1', then: 'Spread out or made into a cup, the foil pushes aside enough water to hold it up.' },
      { say: 'Make it a cup.', when: 'shape == 1', then: 'A cup traps air and pushes aside more water than the foil weighs, so it floats.' },
    ],
  },
  magnets: {
    grades: [6, 7], match: [/magnet/, /\bpoles?\b/, /attract|repel/],
    title: 'Push and pull', takeaway: 'Unlike poles attract, like poles repel, and both get stronger when the magnets are close.',
    tasks: [
      { say: 'Make the magnets push each other away.', when: 'flip == 1', then: 'Like poles facing each other repel.' },
      { say: 'Bring them very close.', when: 'gap <= 20', then: 'Closer magnets pull or push much harder.' },
    ],
  },
  speed: {
    grades: [6, 9], match: [/(?<!high[- ])(?<!wind )\bspeed\b/, /\bvelocity\b/, /uniform motion/, /km\/h|m\/s/, /(?![^.\n]*\b(?:displacement|circular)\b)[^.\n]*\bdistance (travelled|covered)\b/],
    // both cars run in a straight line, so distance always equals displacement: a lesson on displacement or on a circular path gets nothing
    title: 'Race the cars', takeaway: 'Distance = speed x time.',
    tasks: [
      { say: 'Make the two cars cover the same distance.', when: 'a == b', then: 'Same speed for the same time means the same distance.' },
      { say: 'Make the red car cover 200 m.', when: 'a * t == 200', then: 'Speed x time = distance, so this gives 200 m.' },
    ],
  },
  motiongraph: {
    grades: [9, 9], match: [/position[- ]time graph/, /velocity[- ]time graph/, /graph(s|ical)? (representation )?of motion/, /kinematic/, /uniform(ly)? accelerat/, /acceleration/],
    title: 'Draw the motion', takeaway: 'On a position-time graph the slope is the speed: flat means stopped, a straight climb means steady speed, and a bend means the car is speeding up or slowing down.',
    tasks: [
      { say: 'Stop the car and keep it stopped.', when: 'u == 0 and acc == 0', then: 'With no speed and no acceleration the graph is flat: the car stays in the same place.' },
      { say: 'Make the graph a straight line that climbs steadily.', when: 'acc == 0 and u > 0', then: 'A straight position-time graph means steady speed: equal distances in equal times.' },
      { say: 'Let the car slow down so much that the graph turns downward.', when: 'acc < 0 and u > 0 and t == 10', then: 'The graph bends down and then falls: the car slows, stops and comes back.' },
    ],
  },
  friction: {
    grades: [6, 10], match: [/friction/, /(?<!non[- ])contact forces?/, /muscular force/, /\bpush(ed|ing)? a (heavy )?box\b/],
    title: 'Push the box', takeaway: 'A push can start a box moving, but friction pushes back the other way, and the box moves only when the push beats the greatest friction the surface can give.',
    tasks: [
      { say: 'Push hard enough to start the box moving.', when: 'push > (rough / 100) * weight', then: 'Once the push is bigger than friction, the extra force starts the box moving.' },
      { say: 'Slide the box on a surface with no friction at all.', when: 'rough == 0 and push > 0', then: 'With no friction, even a small push sets the box moving.' },
      { say: 'Make the surface so rough that even your hardest push cannot move the box.', when: 'push == 20 and (rough / 100) * weight >= 20', then: 'A heavy box on a very rough surface needs a bigger push than you can give.' },
    ],
  },
  work: {
    grades: [8, 10], match: [/work done/, /work[,\s]+(and\s+)?energy/, /force and displacement/],
    title: 'Lift the bag', takeaway: 'Work = force x distance, measured in joules; if nothing moves there is no work, and doubling the force or the distance doubles the work.',
    tasks: [
      { say: 'Lift without moving the bag. How much work is done?', when: 'dist == 0', then: 'No distance moved means no work is done, however hard you push.' },
      { say: 'Do exactly 100 joules of work.', when: 'force * dist == 100', then: 'Work = force x distance, so 50 N over 2 m gives 100 J.' },
      { say: 'Keep the force at 20 N and lift twice as far as at the start.', when: 'force == 20 and dist == 4', then: '4 m is twice 2 m, so the work doubles from 40 J to 80 J.' },
    ],
  },
  power: {
    grades: [9, 9], match: [/(?<!electric(?:al)? )\bpower\b/, /\bwatts?\b/, /rate of doing work/, /joule(s)? per second/],
    // "power of a lens" and "electric power" are different ideas, so this kit is only for the work-and-time lesson
    title: 'Time the work', takeaway: 'Power is the rate of doing work: work divided by time, in watts. The same work done in half the time takes twice the power.',
    tasks: [
      { say: 'Do exactly 100 joules of work in 2 seconds, so the power is 50 watts.', when: 'force * dist == 100 and secs == 2', then: '100 J in 2 s is 50 W: power is work divided by time.' },
      { say: 'Do the same 100 joules, but take 4 seconds this time.', when: 'force * dist == 100 and secs == 4', then: 'The same work in twice the time is only 25 W, half the power.' },
      { say: 'Lift the heaviest bag the longest distance in the shortest time.', when: 'force == 100 and dist == 10 and secs == 1', then: '1000 J in 1 s is 1000 W: the most power you can show here.' },
    ],
  },
  energysource: {
    grades: [4, 10], perChapter: 3, subjects: ['social'],
    match: [/what is energy/, /sources? of energy/, /generating energy/, /clean energy/, /conventional sources? of energy/, /non[- ]conventional (sources? of )?energy/, /solar (energy|power|panels?)/, /wind (energy|power|mills?)/, /tidal|geothermal|biogas|nuclear (power|energy)/, /renewable (sources? of )?energy/, /hydro ?electric|hydel/],
    title: 'Send the power', takeaway: 'The Sun, wind and water make electricity without smoke, so they are clean energy. Burning coal also makes electricity, but its smoke and harmful gases dirty the air.',
    tasks: [
      { say: 'Make electricity from moving air.', when: 'source == 2', then: 'Windmills spin in the moving air, and their turning makes electricity.' },
      { say: 'Find the source that sends up smoke.', when: 'source == 4', then: 'Burning coal makes most of our electricity, but its smoke and harmful gases pollute the air.' },
      { say: 'Choose the Sun, the main source of energy for life on Earth.', when: 'source == 1', then: 'Sunlight gives light and heat, and solar panels turn it into electricity without any smoke.' },
    ],
  },
  energy: {
    grades: [8, 10], perChapter: 3, match: [/kinetic energy/, /potential energy/, /conservation of energy/, /forms? of energy/, /mechanical energy/, /energy (is|can be) (never )?(created|destroyed|converted|changed)/],
    title: 'Roll the ball down the ramp', takeaway: 'At the top the ball stores potential energy, mass x 10 x height. At the bottom that is all kinetic energy, so the same amount of energy now makes the ball move. Energy is never lost, only changed from one form to another.',
    tasks: [
      { say: 'Put the ball on a ramp 5 metres high.', when: 'height == 5', then: 'From 5 m the ball reaches 10 m/s at the bottom, whatever its mass.' },
      { say: 'Make the stored energy exactly 200 joules.', when: 'mass * 10 * height == 200', then: 'Mass x 10 x height = 200 J.' },
      { say: 'Use the heaviest ball on the highest ramp.', when: 'mass == 5 and height == 10', then: '500 J: this set-up stores the most energy.' },
    ],
  },
  newton: {
    grades: [8, 9], perChapter: { 9: 4 }, match: [/newton'?s (first|second) law/, /\blaws? of motion\b/, /balanced and unbalanced/, /\binertia\b/, /(force|mass) and acceleration|acceleration and (force|mass)/, /\bwhat is (a )?force\b/],
    title: 'Push, mass and acceleration', takeaway: 'The net force is push minus friction. The same force on a heavier box gives less acceleration, and balanced forces leave the speed unchanged.',
    tasks: [
      { say: 'Make the box much heavier and keep the push the same. Watch the acceleration fall.', when: 'mass == 8', then: 'The same force on a bigger mass gives a smaller acceleration.' },
      { say: 'Balance the push with friction so the speed stops changing.', when: 'push == back and push > 0', then: 'When the forces balance, the net force is zero and the box keeps its speed.' },
      { say: 'Double both the force and the mass, so the acceleration stays the same.', when: 'push == 20 and mass == 4 and back == 0', then: '20 N on 4 kg gives the same 5 m/s² as 10 N on 2 kg.' },
    ],
  },
  thirdlaw: {
    grades: [9, 9], match: [/third law/, /action.{0,8}reaction/, /equal and opposite/, /paired forces|pair(s|ed)? of forces/, /forces? come into play.{0,30}interact/, /\brecoil\b/, /two objects interact/],
    title: 'Push two carts apart', takeaway: 'Forces come in pairs: when one object pushes another, it gets the same size push back the other way, but the lighter object speeds up more.',
    tasks: [
      { say: 'Give both carts the same mass. What happens to their accelerations?', when: 'mA == mB', then: 'With equal masses the same force gives the same acceleration, so they fly apart at the same rate.' },
      { say: 'Make cart A very light and cart B very heavy, then push.', when: 'mA == 1 and mB == 10', then: 'Both feel the same force, but the light cart gets ten times the acceleration of the heavy one.' },
      { say: 'Push harder, with a force of 40 N.', when: 'F == 40', then: 'The force on each cart is 40 N, one forwards and one backwards: the two forces are equal and opposite.' },
    ],
  },
  sound: {
    grades: [8, 9], perChapter: { 9: 4 }, titleOnly: true, match: [/sound waves?/, /\bpitch\b/, /\bloudness\b/, /\bamplitude\b/, /how sound is produced/],
    title: 'See the sound', takeaway: 'More vibrations each second make a higher note, and a taller wave means a louder sound with more energy.',
    tasks: [
      { say: 'Make a high, shrill note.', when: 'freq >= 600', then: 'More vibrations each second means a higher pitch.' },
      { say: 'Make the sound very loud.', when: 'amp >= 8', then: 'A taller wave carries more energy, so the sound is louder.' },
      { say: 'Make the deepest note on the slider.', when: 'freq == 100', then: 'Fewer vibrations each second means a lower pitch.' },
    ],
  },
  soundtravel: {
    grades: [7, 9], match: [/sound (travels?|needs?)/, /how sound (travels|reaches)/, /sound.{0,30}\bmedium\b/, /\bmedium\b.{0,30}sound/, /bell jar/, /\bvacuum\b/, /vibrations?.{0,40}(air|medium|matter)/, /sound.{0,30}(air|matter).{0,20}carry/],
    title: 'Does sound travel without air?', takeaway: 'Sound is carried by the shaking of particles. Pump the air out of the jar and the bell still shakes, but with no particles to pass the vibration on, nothing reaches your ear: sound needs a material medium.',
    tasks: [
      { say: 'Pump all the air out of the jar and listen.', when: 'air == 0', then: 'The bell still shakes, but with no air there is nothing to carry the sound to your ear.' },
      { say: 'Now, in the vacuum, strike the bell as hard as you can.', when: 'air == 0 and hit == 100', then: 'Even the hardest strike is silent: sound must have a material medium to travel through.' },
      { say: 'Pump the air back in and listen again.', when: 'air == 100', then: 'The air particles carry the vibrations again, so the bell can be heard. Air is the medium here.' },
    ],
  },
  foodchain: {
    grades: [3, 10], titleOnly: true,
    match: [/food ?chains?/, /food ?webs?/, /\btrophic\b/, /who eats whom/, /(?![^\n]*\b(?:one earth|one family|vasudhaiva)\b)[^\n]*web of life/],
    title: 'Build a food chain', takeaway: 'A food chain shows who eats whom: green plants are the producer at the first trophic level, each animal after that is a consumer at the next level, energy flows only one way, and less of it is left at each step.',
    tasks: [
      { say: 'Build the longest chain: grass, grasshopper, frog and snake.', when: 'links == 4', then: 'Four living things make four trophic levels, from the producer up to the largest carnivore.' },
      { say: 'Cut the chain down to just the grass and the grasshopper.', when: 'links == 2', then: 'The grass is the producer at trophic level 1; the grasshopper is a herbivore at trophic level 2.' },
      { say: 'Give the grass the most sunlight you can.', when: 'sun == 1000', then: 'Green plants capture only about 1 part in 100 of sunlight, so from 1000 units the grass stores about 10.' },
    ],
  },
  lens: {
    grades: [8, 10], match: [/lenses\b/, /convex lens/, /converging lens/, /lenses? and power/, /power of (a )?lens/, /focal length/, /principal focus/, /magnifying glass/, /real and virtual image/, /\bhuman eye\b/, /myopia|hypermetropia|presbyopia/],
    params: (text, f, all, grade) => ({ grade }),
    title: 'Focus the lens', takeaway: 'A convex lens bends parallel rays to its focus. Beyond the focal length the image is real and inverted; closer than the focus it turns virtual, upright and bigger.',
    tasks: (p) => [
      { say: 'Put the object exactly twice the focal length away, so the image is the same size.', when: 'u == 2 * f', then: 'At twice the focal length the image is real, inverted and the same size.' },
      { say: 'Move the object inside the focal length to see a virtual, upright image.', when: 'u < f', then: 'Closer than the focus the image is virtual, upright and bigger: this is how a magnifying glass works.' },
      ...(p.grade >= 9 ? [{ say: 'Give the lens a short focal length, so it is more powerful.', when: 'f <= 6', then: 'A short focal length means a powerful lens, because power is one divided by the focal length.' }] : []),
    ],
  },
  mirror: {
    grades: [8, 10], perChapter: 3, titleOnly: true,
    match: [/spherical mirrors?/, /curved mirrors?/, /concave|convex/, /mirror formula|mirror equation/, /sign convention.*mirror|mirror.*sign convention/, /images? (formed|by).*mirrors?/],
    // the same mirror widget can show either kind; only a lesson that talks about convex and not concave gets the convex side
    params: (text) => ({ kind: /\bconvex\b/.test(text) && !/\bconcave\b/.test(text) ? 'convex' : 'concave' }),
    title: 'Mirror, mirror', takeaway: 'A concave mirror can make a real, inverted image on a screen and a bigger virtual image up close; a convex mirror always makes a small, upright virtual image behind it.',
    tasks: (params) => (params.kind === 'convex' ? [
      { say: 'Make the mirror flatter by giving it a longer focal length.', when: 'f == 20', then: 'A flatter convex mirror still makes a small, upright virtual image behind it.' },
      { say: 'Move the object as far away as it goes and watch the image.', when: 'u == 60', then: 'However far the object goes, a convex mirror always makes an upright, smaller, virtual image: that is why it is used to see traffic behind a car.' },
    ] : [
      { say: 'Move the object inside the focus. What kind of image appears?', when: 'u < f', then: 'Closer than the focus the image is virtual, upright and bigger, behind the mirror: that is how a shaving mirror works.' },
      { say: 'Make the real image the same size as the object.', when: 'u == 2 * f', then: 'At the centre of curvature, twice the focal length away, the image is real, inverted and the same size.' },
      { say: 'Now make a real image bigger than the object.', when: 'u > f and u < 2 * f', then: 'Between the focus and the centre of curvature the image is real, inverted and bigger.' },
    ]),
  },
  shadow: {
    grades: [4, 7], match: [/shadows?/, /\bopaque\b|\btranslucent\b|\btransparent\b/, /light travels in (a )?straight/],
    title: 'Make a shadow', takeaway: 'Light travels in straight lines, so an object blocks a patch of it; nearer the lamp, it blocks more.',
    tasks: [{ say: 'Make the shadow as big as you can.', when: 'd == 10', then: 'Closest to the lamp, the object blocks the most light.' }],
  },
  eclipse: {
    grades: [6, 8], match: [/eclipse/, /phases of the moon/],
    title: 'Line them up', takeaway: 'An eclipse happens when the Sun, Earth and Moon line up.',
    tasks: [
      { say: 'Make a solar eclipse.', when: 'moon == 180', then: 'The Moon is between the Sun and the Earth and blocks the Sun.' },
      { say: 'Make a lunar eclipse.', when: 'moon == 0 or moon == 360', then: 'The Earth is in the middle, so its shadow falls on the Moon.' },
    ],
  },
  moonphase: {
    grades: [4, 8], perChapter: { 8: 3, 4: 2 }, titleOnly: true,
    match: [/\bmoon\b/, /\bmoon\b.*\bnight sky\b|\bnight sky\b.*\bmoon\b/, /phases? of the moon/],
    title: 'Watch the Moon change shape', takeaway: 'Half of the Moon is always lit by the Sun. As the Moon goes round the Earth we see more or less of that lit half, so it grows from new Moon to full Moon and shrinks back to new Moon.',
    tasks: [
      { say: 'Make the full Moon, called Purnima.', when: 'day == 15', then: 'At the full Moon the lit half faces us: a complete bright circle, nearly opposite the Sun.' },
      { say: 'Make the new Moon, called Amavasya, when no Moon is seen.', when: 'day == 0', then: 'At the new Moon the lit half faces away from us, so we cannot see the Moon at all.' },
      { say: 'Stop at the first quarter: about half lit and growing.', when: 'day == 7', then: 'One week after the new Moon we see a half circle, and the bright part is still growing: Shukla Paksha.' },
      { say: 'Find the last quarter: half lit and shrinking.', when: 'day == 22', then: 'One week after the full Moon we see a half circle again, and the bright part is shrinking: Krishna Paksha.' },
    ],
  },
  watercycle: {
    grades: [3, 7], match: [/water cycle/, /evaporat/, /condens/, /precipitat/, /\brainwater\b/, /\bground ?water\b/, /\bevaporation\b/],
    title: 'Follow a drop', takeaway: 'Water evaporates, condenses into clouds, falls as rain and flows back: the water cycle.',
    tasks: [{ say: 'Follow the water until it falls as rain.', when: 'step == 3', then: 'Drops in the clouds grow heavy and fall.' }, { say: 'Finish the cycle.', when: 'step == 4', then: 'Rivers carry the water back to the sea, ready to start again.' }],
  },
  spinner: {
    grades: [3, 5], perChapter: { 4: 3 }, titleOnly: true,
    match: [/spinners?\b/, /\bspins?\b/, /spinning colours/, /\bcharkha\b.*\bshapes?\b|\bshapes?\b.*\bcharkha\b/, /\blattu\b/, /spinning tops?\b/],
    title: 'Spin the card', takeaway: 'A card spun fast looks round, because its corners sweep round too quickly for our eyes to follow. Its colours blur and mix, but the card itself has not changed.',
    tasks: [
      { say: 'Spin the square card as fast as it goes.', when: 'turn >= 8 and shape == 0', then: 'Spinning fast, the square card looks like a circle: its corners sweep round too quickly for our eyes to follow them.' },
      { say: 'Turn it slowly, so you can still follow each colour.', when: 'turn > 0 and turn < 6', then: 'Turning slowly, the colours are smeared but you can still pick them out separately.' },
      { say: 'Put on four colours, then spin it fast.', when: 'turn >= 8 and colours == 1', then: 'When the card spins, the separate colours blur and mix into one colour.' },
    ],
  },
  lever: {
    grades: [6, 9], match: [/levers?\b/, /fulcrum/, /effort arm|load arm/, /mechanical advantage/],
    title: 'Balance the load', takeaway: 'A lever balances when load times load arm equals effort times effort arm. A longer effort arm lets you lift the same load with less effort, but a machine cannot reduce the total work.',
    tasks: [
      { say: 'Balance the beam without changing the load or the two arms.', when: 'effort * effortArm == load * loadArm', then: 'Load times load arm equals effort times effort arm: the beam is level.' },
      { say: 'Give yourself a long effort arm and a short load arm, so the load is easy to lift.', when: 'effortArm >= 4 and loadArm <= 1', then: 'With a long effort arm and a short load arm, a small effort can lift a big load.' },
      { say: 'Make the effort arm shorter than the load arm and watch what the load does.', when: 'effortArm < loadArm', then: 'With the effort arm shorter than the load arm, the effort must be bigger than the load: the mechanical advantage is below 1.' },
    ],
  },
  neutral: {
    grades: [6, 10], titleOnly: true, match: [/(?!.*\b(?:reactivity|metals?)\b)\b(?:acids?|acidic)\b/, /\bbases?\b|\bbasic\b/, /neutrali[sz]/, /indicator|litmus/],
    // "acids, salts and reactivity series" is a metals lesson (metal + acid -> salt + hydrogen), not acid-base neutralisation
    title: 'Mix acid and base', takeaway: 'Equal amounts of acid and base cancel out and make a neutral solution.',
    tasks: [{ say: 'Make the solution neutral.', when: 'acid == base', then: 'Equal drops cancel out: neutral.' }, { say: 'Make it basic.', when: 'base > acid', then: 'More base than acid: litmus turns blue.' }],
  },
  phscale: {
    grades: [6, 10], match: [/universal indicator/, /\blitmus\b/, /\bindicators?\b/, /\bph\b/],
    title: 'Slide along the pH scale', takeaway: 'The pH scale runs from 0 to 14. Below 7 a solution is acidic, at 7 it is neutral, and above 7 it is basic, and the universal indicator changes colour as the pH changes.',
    tasks: [
      { say: 'Make a strong acid.', when: 'ph <= 2', then: 'At pH 2 there are far more hydrogen ions than in pure water, so the acid is strong.' },
      { say: 'Make the solution exactly neutral.', when: 'ph == 7', then: 'At pH 7 the solution is neutral, like pure water.' },
      { say: 'Make a strong base.', when: 'ph >= 12', then: 'At pH 12 there are very few hydrogen ions and many hydroxide ions: a strong base.' },
    ],
  },
  reaction: {
    grades: [9, 10], perChapter: 4,
    match: [/combination reaction|combination and|two or more reactants combine/, /decomposition reaction|decomposition and|breaks? (up|down) into (simpler|two|three)|one reactant breaking/, /displacement reaction|displaces? (copper|another|a metal|it) from/, /exothermic|endothermic/, /chemical reactions? in daily life/, /types of chemical reactions?/],
    title: 'Watch the atoms rearrange', takeaway: 'In a combination reaction two substances join into one, in a decomposition reaction one substance breaks into simpler ones, and in a displacement reaction one element pushes another out of its compound.',
    tasks: [
      { say: 'Show two substances joining into one product.', when: 'pick == 0', then: 'Magnesium and oxygen join to make the single product magnesium oxide: a combination reaction.' },
      { say: 'Show one substance breaking into simpler ones on heating.', when: 'pick == 2', then: 'On heating, calcium carbonate breaks into calcium oxide and carbon dioxide: a decomposition reaction.' },
      { say: 'Show iron pushing copper out of copper sulphate.', when: 'pick == 3', then: 'Iron takes the sulphate and copper is left behind: a displacement reaction.' },
    ],
  },
  masskeep: {
    grades: [9, 10],
    match: [/mass is conserved|conservation of mass|matter can neither be created nor destroyed/, /baking soda and vinegar|vinegar.*baking soda/, /gas (produced |formed )?(escaped|escapes|escape)|escaped gas|readings differed/, /closed (flask|container|system)|balloon over/],
    title: 'Weigh it before and after', takeaway: 'In a closed flask the total mass stays the same through a chemical reaction, because the gas cannot escape. In an open flask the reading falls by the mass of the gas that left, so nothing is really lost.',
    tasks: [
      { say: 'Run the reaction with the flask open. What happens to the reading?', when: 'pick == 1', then: 'The reading falls from 250.0 g to 248.6 g: carbon dioxide escaped into the air.' },
      { say: 'Trap the gas with a balloon and run it again.', when: 'pick == 2', then: 'The reading stays at 250.0 g. Mass is conserved when nothing escapes.' },
    ],
  },
  solarsystem: {
    grades: [6, 8], match: [/solar system/, /\bplanets?\b/, /\borbits?\b/, /asteroids?|comets?/],
    title: 'Run the solar system', takeaway: 'Planets nearer the Sun go round faster; the further out, the longer the year.',
    tasks: [
      { say: 'Let one Earth year pass.', when: 'days >= 360 and days <= 370', then: 'Earth has gone round once, and Mercury about four times.' },
      { say: 'Let Jupiter go all the way round once.', when: 'days >= 4330 and days <= 4340', then: 'A year on Jupiter lasts about 12 Earth years.' },
      { say: 'Let Saturn finish one orbit.', when: 'days >= 10750', then: 'Saturn takes about 29 and a half Earth years.' },
    ],
  },
  photosynthesis: {
    grades: [6, 10], match: [/photosynth/, /autotroph/, /chlorophyll/, /food factor(y|ies)/, /\bstomata\b/, /plants? make (their )?(own )?food/],
    title: 'Run the leaf factory', takeaway: 'A leaf needs light, carbon dioxide and water together; the scarcest one sets how fast it can make food.',
    tasks: [
      { say: 'Turn off the light.', when: 'light == 0', then: 'With no light, photosynthesis stops completely.' },
      { say: 'Make carbon dioxide the one holding the leaf back.', when: 'co2 < light and co2 < water', then: 'Now carbon dioxide is in shortest supply, so it sets the speed.' },
      { say: 'Run the leaf at full speed.', when: 'light == 10 and co2 == 10 and water == 10', then: 'All three inputs at the top: the most sugar and oxygen.' },
    ],
  },
  conduction: {
    grades: [6, 8], match: [/\bconduction\b/, /conductors? of heat/, /heat (conduction|insulat)/, /heat travels/, /\bwax\b.*\bpins?\b/],
    title: 'Heat the strip', takeaway: 'In conduction heat passes along a solid from the hot end; metals conduct well, wood and glass are insulators.',
    tasks: [
      { say: 'Heat the copper strip until all four pins fall.', when: 'material == 0 and t >= 40', then: 'The pin nearest the candle fell first: heat travels along the metal.' },
      { say: 'Try wood for two minutes. Does any pin fall?', when: 'material == 2 and t == 120', then: 'None falls: wood is an insulator.' },
    ],
  },
  seabreeze: {
    // "How winds form" names the coast only in its facts ("air flows from the high-pressure sea region towards the land",
    // "wind blows from the land towards the sea"), so the match has to know those phrasings too.
    grades: [6, 8], match: [/sea breezes?|land breezes?/, /\bconvection\b/, /land (heats|is hotter|warmer)/, /air flows from the (sea|land)/, /wind blows from the (land|sea)/, /pressure differences? over land and sea/],
    title: 'Watch the coast breathe', takeaway: 'Warm air rises and cooler air moves in: by day a sea breeze, by night a land breeze.',
    tasks: [
      { say: 'Make a sea breeze.', when: 'hour >= 10 and hour <= 17', then: 'By day the land is hotter, so air rises over it and the sea air blows in.' },
      { say: 'Make a land breeze.', when: 'hour >= 21 or hour <= 5', then: 'At night the land is cooler, so the breeze blows out to sea.' },
    ],
  },
  radiation: {
    grades: [6, 8], match: [/\bradiation\b/, /absorbs? (more )?heat/, /dark(er)? (colou?red )?(surfaces|clothes)/, /light[- ]colou?red clothes/],
    title: 'Paint the can', takeaway: 'Dark surfaces absorb more of the Sun\u2019s heat; light ones reflect it.',
    tasks: [
      { say: 'Paint the can black and leave it 20 minutes.', when: 'colour == 3 and t >= 20', then: 'The black can is much hotter: dark colours absorb more heat.' },
      { say: 'Paint it white too. Which can is hotter now?', when: 'colour == 0 and t >= 20', then: 'Neither: both reflect most of the heat. That is why light clothes keep us cool in summer.' },
    ],
  },
  seepage: {
    grades: [5, 10], subjects: ['social'],
    match: [/\bseep(age|s|ing)?\b/, /groundwater/, /infiltration/, /\bgravel\b/, /\bsoil (types?|erosion)\b/, /rainwater harvest|\bwater harvest/, /percolat/, /hold(s)? moisture/],
    title: 'Pour the water', takeaway: 'Water seeps fastest through gravel and slowest through clay, because of the gaps between the particles. Sandy soil takes water in quickly and clay holds it, which is why farmers and water harvesters care about soil type.',
    tasks: [
      { say: 'Let 3 minutes pass.', when: 't == 3', then: 'Gravel has let through the most water: its particles have the widest gaps.' },
      { say: 'Wait until all the water is through the gravel.', when: 't >= 4', then: 'All 100 ml is through the gravel, while clay has let through only a little.' },
    ],
  },
  airpath: {
    grades: [6, 8], match: [/respiratory system/, /\blungs?\b/, /alveoli/, /\bnostrils?\b/, /windpipe|trachea/, /how (humans|we) breathe/],
    title: 'Follow a breath', takeaway: 'Air goes in through the nostrils, down the windpipe into the lungs, and in the alveoli oxygen passes into the blood.',
    tasks: [
      { say: 'Find where dust is trapped.', when: 'step == 2', then: 'Tiny hair and mucus in the nasal passages trap dust and dirt.' },
      { say: 'Find where oxygen goes into the blood.', when: 'step == 5', then: 'In the alveoli, tiny balloon-like sacs at the end of the branches.' },
    ],
  },
  separate: {
    grades: [6, 7], match: [/winnow/, /\bsiev(e|ing)\b/, /decant/, /sedimentation/],
    params: (text) => ({ kind: /winnow|thresh/.test(text) ? 'winnow' : /decant|sediment|settle/.test(text) ? 'settle' : 'sieve' }),
    title: 'Separate the mixture', takeaway: 'Mixtures are separated by a difference between their parts: weight, size, or whether they sink.',
    tasks: (p) => (p.kind === 'winnow'
      ? [{ say: 'Blow enough wind to carry the husk away from the grain.', when: 'wind >= 6', then: 'The light husk blows away and the heavy grain falls close: winnowing.' }]
      : p.kind === 'settle'
        ? [{ say: 'Let the tea stand until the leaves settle.', when: 'min >= 6', then: 'The leaves have sunk to the bottom: sedimentation.' }, { say: 'Now pour off the tea.', when: 'min >= 6 and tilt == 1', then: 'Pouring the liquid off the settled leaves is decantation.' }]
        : [{ say: 'Make the holes just big enough to let the bran through but keep the stones.', when: 'hole == 3 or hole == 4 or hole == 5', then: 'Flour and bran fall through; the stones stay on top.' }]),
  },
  dissolve: {
    grades: [8, 9], perChapter: 2, titleOnly: true,
    match: [/solubility/, /\bsolutes?\b/, /\bsolvents?\b/, /\bsolutions?\b/, /saturated solution|unsaturated solution/, /dissolving (sugar|salt)/],
    // "saturated and unsaturated compounds" is a carbon-chemistry lesson, not a solution, so it must not match
    title: 'Dissolve the sugar', takeaway: 'Water dissolves only so much sugar at a given temperature. Warm water holds more, and any extra sugar stays at the bottom as crystals, so the solution is saturated.',
    tasks: [
      { say: 'Warm the water to 50 °C and watch all five spoons dissolve.', when: 'temp == 50 and spoons == 5', then: 'Warm water can hold more sugar, so the solution becomes unsaturated and all of it dissolves.' },
      { say: 'At 20 °C add ten spoons and see the extra sugar settle at the bottom.', when: 'spoons == 10 and temp == 20', then: 'At 20 °C the water holds only 4 spoons, so 6 spoons stay at the bottom as crystals: the solution is saturated.' },
      { say: 'Make a solution that could still dissolve more sugar.', when: 'spoons < 2 + temp / 10', then: 'Below the limit the solution is unsaturated, so more sugar would still dissolve.' },
    ],
  },
  seethrough: {
    grades: [3, 7], match: [/\btranslucent\b/, /\bopaque\b/, /\btransparent\b/, /seeing through/],
    title: 'Look through it', takeaway: 'Transparent: seen clearly. Translucent: seen, but not clearly. Opaque: not seen at all.',
    tasks: [
      { say: 'Find a sheet that makes the star blurry.', when: 'm == 3 or m == 4', then: 'Butter paper and frosted glass are translucent.' },
      { say: 'Find a sheet that hides the star completely.', when: 'm >= 5', then: 'Wood, cardboard and metal are opaque.' },
    ],
  },
  plantparts: {
    grades: [3, 6], titleOnly: true,
    match: [/parts? of (a |the )?plants?/, /plant parts/, /getting to know plants/, /\broots?,? stems? and leaves?\b/, /roots, stems, leaves, flowers/],
    title: 'Tap the parts of a plant', takeaway: 'Roots hold the plant and take in water, the stem carries water up, leaves make food, flowers make seeds and fruit protects them.',
    tasks: [
      { say: 'Find the part that holds the plant in the soil.', when: 'part == 0', then: 'The roots grip the soil and also take in water.' },
      { say: 'Find the part that carries water up to the leaves.', when: 'part == 1', then: 'The stem is like a pipe from the roots to the leaves.' },
      { say: 'Find the part that makes food using sunlight.', when: 'part == 2', then: 'Leaves make food for the whole plant.' },
      { say: 'Find the part that makes the fruit and seeds.', when: 'part == 3', then: 'The flower makes the fruit, and the fruit holds the seeds.' },
      { say: 'Find the part a new plant can grow from.', when: 'part == 5', then: 'A seed can grow into a new plant.' },
    ],
  },
  eatenparts: {
    grades: [3, 5],
    match: [/\bfood from plants?\b/, /\bparts? of (a |the )?plants? we eat\b/, /\b(eat|edible)\b[^.\n]{0,40}\b(leaves?|roots?|stems?|fruits?|seeds?)\b/, /\bvegetables? and fruits?\b[^.\n]{0,40}\bplants?\b/],
    title: 'Which part of the plant do we eat?', takeaway: 'We eat different parts of plants: leaves like spinach, roots like carrot, stems like potato, fruits like mango and seeds like rice.',
    tasks: [
      { say: 'Find the part we eat when we eat spinach.', when: 'item == 0 and part == 2', then: 'Spinach leaves are leaves: we eat the green leaves of the plant.' },
      { say: 'Find the part a carrot grows as.', when: 'item == 1 and part == 0', then: 'A carrot is a root that grows under the soil.' },
      { say: 'Find the part a potato grows as.', when: 'item == 2 and part == 1', then: 'A potato is a swollen stem that grows underground.' },
      { say: 'Find the part a mango grows as.', when: 'item == 3 and part == 3', then: 'A mango is a fruit, and the fruit holds the seeds.' },
      { say: 'Find the part rice grains are.', when: 'item == 4 and part == 4', then: 'Rice grains are seeds: each grain can grow into a new plant.' },
    ],
  },
  twobins: {
    grades: [3, 4], match: [/\bgreen (dust)?bin\b/, /\bblue (dust)?bin\b/, /separat(e|ing) (the )?waste/, /waste[^.\n]{0,30}\bseparat/, /dustbins? of two colou?rs/, /\bcompost/],
    title: 'Sort the waste into two bins', takeaway: 'Green bin: peels, leaves and eggshells rot into compost. Blue bin: glass, plastic and paper can be made into new things.',
    tasks: [
      { say: 'Put the banana peel in the green bin.', when: 'item == 0 and bin == 0', then: 'Food scraps rot and become compost, food for plants.' },
      { say: 'Put the glass bottle in the blue bin.', when: 'item == 1 and bin == 1', then: 'Glass can be washed and made into new glass.' },
      { say: 'Put the eggshell in the green bin.', when: 'item == 4 and bin == 0', then: 'Eggshells are food waste, so they go in the green bin.' },
      { say: 'Put the plastic bag in the blue bin.', when: 'item == 3 and bin == 1', then: 'Plastic can be recycled into new things.' },
    ],
  },
  plate: {
    grades: [3, 6], perChapter: { 4: 3, 6: 2 },
    match: [/\bbalanced (plate|meal|diet|food)\b/, /\benergy[- ]giving\b|\benergy[- ]providing\b|\bprovide energy\b|\brich in energy\b/, /\bbody[- ]building\b/, /\bprotective food/, /\bfood groups?\b/, /\bjunk food\b/],
    title: 'Fill a balanced plate', takeaway: 'A balanced plate has protective food as its biggest part, with body-building food and some energy food. Junk food is a sometimes food.',
    tasks: [
      { say: 'Put some energy food on the plate.', when: 'grain >= 1', then: 'Rice, roti and potato give you energy to run and play.' },
      { say: 'Add some body-building food.', when: 'protein >= 1', then: 'Dal, pulses, egg and milk help you grow and build strong muscles.' },
      { say: 'Make protective food the biggest part of the plate.', when: 'veg >= 2 and veg > grain and veg > protein', then: 'Vegetables and fruits should fill the most of a balanced plate: they help you fight illness.' },
      { say: 'Fill the plate with only junk food.', when: 'junk >= 3 and grain == 0 and protein == 0 and veg == 0', then: 'Chips, soft drinks and fried food have a lot of oil, salt and sugar. They are sometimes food, not a meal.' },
    ],
  },
  solids: {
    grades: [4, 8], match: [/\bfaces?\b.*\b(edges?|corners?|vertices)\b|\bedges?\b.*\bfaces?\b/, /\bprisms?\b/, /(?<!number )\bpyramids?\b/, /\bcuboids?\b/, /3d shapes?|three-dimensional/],
    title: 'Spin the solid', takeaway: 'Count faces, corners and edges: for each of these shapes faces + corners \u2212 edges = 2.',
    tasks: [
      { say: 'Find a shape with 5 faces.', when: 'shape == 2 or shape == 3', then: 'The triangular prism and the square pyramid both have 5 faces.' },
      { say: 'Find the shape with only 6 edges.', when: 'shape == 4', then: 'The triangular pyramid: 4 faces, 4 corners, 6 edges.' },
      { say: 'Turn the cuboid right round to the back.', when: 'shape == 1 and turn >= 180', then: 'Turning it changes how it looks, never how many faces, corners and edges it has.' },
    ],
  },
  compass: {
    grades: [4, 5], match: [/\bradi(us|i)\b/, /\bdiameters?\b/, /\bcompass\b/, /\bcircles?\b/],
    title: 'Open the compass', takeaway: 'Every point on a circle is the same distance from the centre: the radius. A diameter goes through the centre and is twice the radius.',
    tasks: [
      { say: 'Draw a circle with a diameter of 8 cm.', when: 'r == 4', then: 'Radius 4 cm, so diameter 4 + 4 = 8 cm.' },
      { say: 'Turn the fold line all the way round. Does it still pass through the centre?', when: 'fold >= 90', then: 'Yes: every diameter passes through the centre.' },
    ],
  },
  gridwalk: {
    grades: [4, 5], match: [/\bgrids?\b/, /\brows?\b.*\bcolumns?\b/, /steps? (to the )?(right|left|up)/],
    title: 'Walk the grid', takeaway: 'A square on a grid is named by its row and column; count the steps with no diagonal moves.',
    tasks: [
      { say: 'Walk to the flower.', when: 'right == 2 and up == 3', then: '2 right and 3 up: 5 steps, row 4, column 3.' },
      { say: 'Now find the mango.', when: 'right == 3 and up == 1', then: '3 right and 1 up: 4 steps, row 2, column 4.' },
    ],
  },
  jumps: {
    grades: [4, 5], match: [/common multiples?/, /skip count/, /\bjumps?\b/],
    title: 'Who lands together?', takeaway: 'An animal lands on the multiples of its jump; where two land together are common multiples.',
    tasks: [
      { say: 'Make the frog and the squirrel jump. Where do they first land together?', when: '(a == 0 and b == 1) or (a == 1 and b == 0)', then: 'On 12: the first common multiple of 3 and 4.' },
      { say: 'Find two animals whose first common landing is 24.', when: '(a == 2 and b == 3) or (a == 3 and b == 2) or (a == 0 and b == 3) or (a == 3 and b == 0)', then: '6 and 8, or 3 and 8, both meet first at 24.' },
    ],
  },
  clock: {
    grades: [2, 6], match: [/\bclocks?\b/, /\ba\.?m\.?\b.*\bp\.?m\.?\b|\bam\b.*\bpm\b/, /hours? and minutes?/, /24-hour|\bo.clock\b/, /(twelve|twenty-four)[- ]hour/, /half past|quarter (past|to)/, /hours in a day/],
    title: 'Set the clock', takeaway: 'AM is from midnight to noon and PM from noon to midnight; a 24-hour clock counts on past 12, so 8:00 PM is 20:00.',
    tasks: [
      { say: 'Gargi wakes up at 6 o\u2019clock. Set the clock to 6.', when: 'hour == 6 and minute == 0', then: '6 o\u2019clock: the short hour hand points to 6 and the long minute hand points to 12.' },
      { say: 'Show 3 o\u2019clock.', when: 'hour == 3 and minute == 0', then: 'At 3 o\u2019clock the long minute hand is on 12 and the short hour hand is on 3.' },
      { say: 'Set the clock to 8:00 PM.', when: 'hour == 20 and minute == 0', then: 'The digital clock shows 20:00.' },
      { say: 'Show quarter to midnight.', when: 'hour == 23 and minute == 45', then: '11:45 PM is 23:45 on a 24-hour clock.' },
      { say: 'Show midnight.', when: 'hour == 0 and minute == 0', then: '12:00 AM is 00:00.' },
    ],
  },
  makeone: {
    grades: [3, 5], match: [/\bkilograms?\b.*\bgrams?\b|\bgrams?\b.*\bkilograms?\b/, /\blitres?\b.*\bmillilitres?\b|\bmillilitres?\b.*\blitres?\b/, /\bcapacity\b/, /weigh(t|ing)/, /\bpackets?\b/],
    params: (text) => ({ kind: /litre|capacity|bottle/.test(text) && !/kilogram|\bgrams?\b/.test(text) ? 'ml' : 'g' }),
    title: 'Make one whole', takeaway: '1 kg is 1000 g and 1 l is 1000 ml: four 250s, ten 100s or two 500s each make one whole.',
    tasks: (p) => [
      { say: `Make ${p.kind === 'ml' ? '1 litre' : '1 kg'} using only packs of 250.`, when: 'q == 4 and h == 0 and t == 0 and f == 0', then: `Four 250s make 1000: one 250 is a quarter of ${p.kind === 'ml' ? 'a litre' : 'a kilogram'}.` },
      { say: 'Now make it using only packs of 100.', when: 't == 10 and h == 0 and q == 0 and f == 0', then: 'Ten 100s make 1000: one 100 is a tenth.' },
      { say: 'Make it with three different pack sizes.', when: '500 * h + 250 * q + 100 * t + 50 * f == 1000 and ((h > 0) + (q > 0) + (t > 0) + (f > 0)) >= 3', then: 'Lots of different packs add up to the same 1000.' },
    ],
  },
  calendar: {
    grades: [2, 6], minScore: { 2: 4 }, match: [/leap years?/, /\bcalendars?\b/, /\bfebruary\b/, /days of the week/, /\bdd\/mm\/yyyy\b/],
    title: 'Flip the calendar', takeaway: 'February has 29 days only in a leap year, which comes every four years and has 366 days.',
    tasks: [
      { say: 'Show January 2023. Which day does the month start on?', when: 'year == 2023 and month == 1', then: 'January 2023 starts on a Sunday, the first day heading, S.' },
      { say: 'Show February 2024. How many days does it have?', when: 'year == 2024 and month == 2', then: '29 days: 2024 is a leap year.' },
      { say: 'Find the next February with 29 days after 2024.', when: 'year == 2028 and month == 2', then: 'Leap years come every four years: 2020, 2024, 2028.' },
      { say: 'Show July 2024. What day is 1 July?', when: 'year == 2024 and month == 7', then: 'A Monday, so the next Mondays are 8 July and 15 July.' },
    ],
  },
  money: {
    grades: [1, 8], perChapter: { 1: 5, 2: 5 }, minScore: { 1: 4 }, params: (text, f, all, grade) => ({ kind: grade <= 2 ? 'small' : 'rupees' }), match: [/\bdenominations?\b/, /\bdifferent amounts\b/, /\bspent\b|\bspend\b/, /\bbuying\b/, /\bcoins?\b/, /\brupees?\b|\u20b9/, /\bshopping\b|\bshops?\b/, /\bbalances? to customers\b/, /\bbarter\b/, /\bmedium of exchange\b/],
    title: 'Pay the exact amount', takeaway: 'The same amount can be made with different notes and coins; big notes first uses the fewest.',
    tasks: (p) => p.kind === 'small' ? [
      { say: 'Pay \u20b966 using the notes and coins.', when: 'amt == 0 and 50 * f + 20 * tw + 10 * t + 5 * v + 2 * two + o == 66', then: 'For example \u20b950 + \u20b910 + \u20b95 + \u20b91 = \u20b966.' },
      { say: 'Now pay \u20b966 a different way, with no \u20b950 note.', when: 'amt == 0 and 50 * f + 20 * tw + 10 * t + 5 * v + 2 * two + o == 66 and f == 0', then: 'The same amount can be paid in many different ways.' },
      { ok: true, say: 'The ball costs \u20b920. Pay with only \u20b95 coins. How many?', when: 'amt == 7 and v == 4 and f + tw + t + two + o == 0', then: '4 coins of \u20b95 make \u20b920.' },
      { ok: true, say: 'Now pay \u20b920 with only \u20b910 notes.', when: 'amt == 7 and t == 2 and f + tw + v + two + o == 0', then: '2 notes of \u20b910 make \u20b920.' },
      { ok: true, say: 'Make \u20b954.', when: 'amt == 1 and 50 * f + 20 * tw + 10 * t + 5 * v + 2 * two + o == 54', then: 'For example \u20b950 + \u20b92 + \u20b92, or \u20b920 + \u20b920 + \u20b910 + \u20b92 + \u20b92.' },
      { ok: true, say: 'Make \u20b985 with as few notes and coins as you can.', when: 'amt == 2 and 50 * f + 20 * tw + 10 * t + 5 * v + 2 * two + o == 85 and f + tw + t + v + two + o <= 5', then: '\u20b950 + \u20b920 + \u20b910 + \u20b95: big notes first uses the fewest.' },
    ] : [
      { say: 'Make \u20b936.', when: 'amt == 0 and 100 * h + 50 * f + 10 * t + 5 * v + o == 36', then: 'For example 3 \u00d7 \u20b910 + 1 \u00d7 \u20b95 + 1 \u00d7 \u20b91.' },
      { say: 'Make \u20b9163 with just 6 notes and coins.', when: 'amt == 2 and 100 * h + 50 * f + 10 * t + 5 * v + o == 163 and h + f + t + v + o == 6', then: '\u20b9100 + \u20b950 + \u20b910 + \u20b91 + \u20b91 + \u20b91: big notes first.' },
      { say: 'Pay \u20b955 in two different ways, one after the other.', when: 'amt == 7 and 100 * h + 50 * f + 10 * t + 5 * v + o == 55 and h == 0', then: 'For example 5 \u00d7 \u20b910 + 1 \u00d7 \u20b95, or \u20b950 + \u20b95: the same amount can be paid in many ways.' },
      { say: 'Make \u20b9183 a different way, using no \u20b9100 note.', when: 'amt == 3 and 100 * h + 50 * f + 10 * t + 5 * v + o == 183 and h == 0', then: 'Lots of ways make the same amount.' },
    ],
  },
  blocks: {
    grades: [2, 5], perChapter: { 2: 3 }, match: [/ten strips?|\bstrips?\b.*\bunits\b/, /dienes/, /ten ones make|ones make one ten|tens make one hundred|hundreds make one thousand/, /building thousand|^(?!.*(adding|subtracting|taking away)).*blocks/, /\btens\b.*\bones\b/],
    title: 'Build it with blocks', takeaway: '10 ones make 1 ten, 10 tens make 1 hundred and 10 hundreds make 1 thousand.',
    tasks: [
      { say: 'Make 100 using only ten strips.', when: 'th == 0 and hu == 0 and te == 10 and on == 0', then: 'Ten tens make one hundred.' },
      { say: 'Make 34.', when: 'th == 0 and hu == 0 and te == 3 and on == 4', then: '3 tens and 4 ones make 34.' },
      { say: 'Make 250.', when: 'th == 0 and hu == 2 and te == 5 and on == 0', then: '2 hundreds, 5 tens and no ones make 250.' },
      { say: 'Make 106 and notice the empty tens.', when: 'th == 0 and hu == 1 and te == 0 and on == 6', then: '1 hundred, no tens and 6 ones make 106.' },
      { say: 'Show 14 using one ten and four ones.', when: 'th == 0 and hu == 0 and te == 1 and on == 4', then: '14 ones can be grouped as 1 ten and 4 ones.' },
    ],
  },
  column: {
    grades: [2, 5], match: [/^(?!.*(weights?|quintals?|tonnes?|litres?|metres?|kilogram)).*(\badding\b|\bsubtracting\b|\btaking away\b)/, /regroup/, /\bcarry|\bcarrying\b/, /\bborrow/, /take away|taking away/, /\badd up\b|subtract it/, /column (addition|subtraction)/],
    params: (text) => ({ kind: /^add/.test(text) || /\badd up\b/.test(text) ? 'add' : /subtract|take away|taking away|borrow|\bleft\b/.test(text) ? 'sub' : 'add' }),
    title: 'Add and subtract in columns', takeaway: 'Work one column at a time, starting with the ones: when a column reaches 10 you regroup into the next column.',
    tasks: (p) => (p.kind === 'sub'
      ? [{ say: 'Take away 215 from 438.', when: 'a == 438 and b == 215 and step == 3', then: '438 \u2212 215 = 223: that is how many children are still waiting.' },
         { say: 'How much fuel was added? Take 18 away from 65.', when: 'a == 65 and b == 18 and step == 3', then: '65 \u2212 18 = 47 litres were added.' },
         { say: 'Take 47 away from 73.', when: 'a == 73 and b == 47 and step == 3', then: '3 ones is less than 7, so regroup 1 ten as 10 ones: 73 \u2212 47 = 26.' },
         { say: 'Find a take-away that needs regrouping: 83 \u2212 46.', when: 'a == 83 and b == 46 and step == 3', then: '3 ones is less than 6, so regroup 1 ten as 10 ones: 83 \u2212 46 = 37.' }]
      : [{ say: 'Add 438 and 476, one column at a time.', when: 'a == 438 and b == 476 and step == 3', then: '438 + 476 = 914, and regrouping carried a 1 twice.' },
         { say: 'The bus had 18 litres and now has 65. Add 18 and 47 to check.', when: 'a == 18 and b == 47 and step == 3', then: '18 + 47 = 65: adding checks the subtraction.' },
         { say: 'Add 36 and 47. What carries?', when: 'a == 36 and b == 47 and step == 3', then: 'The ones total 13: write 3 and carry 1 ten. 36 + 47 = 83.' },
         { say: 'Add 185 and 125.', when: 'a == 185 and b == 125 and step == 3', then: '185 + 125 = 310: 10 ones and 10 tens both regrouped.' }]),
  },
  numberjump: {
    grades: [1, 3], match: [/\bginladi\b/, /number lines?/, /\bjump(s|ing)?\b/, /count(ing)? (on|back)/, /\bjump(ing)? (back|forward)/],
    title: 'Hop along the number line', takeaway: 'Jumping forward adds and jumping back takes away; equal jumps count in tens, fives or any step.',
    tasks: [
      { say: 'Add 12 and 4 on the ginladi: start at 12 and hop 4 times, one at a time.', when: 'start == 12 and jump == 1 and hops == 4 and back == 0', then: '13, 14, 15, 16: 12 + 4 = 16.' },
      { say: 'Anjali starts at 6 and jumps 2 steps ahead. Where does she land?', when: 'start == 6 and jump == 2 and hops == 1 and back == 0', then: '6 + 2 = 8.' },
      { say: 'Renu starts at 15 and jumps 7 steps back. Where does she land?', when: 'start == 15 and jump == 7 and hops == 1 and back == 1', then: '15 \u2212 7 = 8: the same place as Anjali.' },
      { say: 'Start at 7 and jump 10 at a time, three times.', when: 'start == 7 and jump == 10 and hops == 3 and back == 0', then: '7, 17, 27, 37: each jump of 10 adds one ten.' },
      { say: 'Go back from 52 in jumps of 10, three times.', when: 'start == 52 and jump == 10 and hops == 3 and back == 1', then: '52, 42, 32, 22: jumping back takes away.' },
      { say: 'Find a start and jump that reach exactly 100 after 5 jumps.', when: 'back == 0 and hops == 5 and start + 5 * jump == 100', then: 'Five equal jumps land on 100: for example from 0 in jumps of 20.' },
    ],
  },
  between: {
    grades: [3, 3], minScore: 4, match: [/\b[1-9]\d\d\b/, /number lines?/, /how far/, /\b(from|to) [1-9]00\b|\bfive hundred\b/, /\b[1-9]\d\d\b.*\bnumber line|\bnumber line.*\b[1-9]\d\d\b/],
    title: 'Place it between the hundreds', takeaway: 'A three-digit number sits between two hundreds: how far it is from each tells you where it belongs.',
    tasks: [
      { say: 'Place 387. How far is it from 400?', when: 'n == 387', then: '13 more makes 400: 387 is 87 more than 300.' },
      { say: 'Find the number exactly halfway between 400 and 500.', when: 'n == 450', then: '450 is 50 from both 400 and 500.' },
      { say: 'Find a number only 1 away from 500.', when: 'n == 499', then: '499 is just 1 less than 500.' },
    ],
  },
  flatshape: {
    perChapter: 5, grades: [3, 3], match: [/\bsquares?\b/, /\brectangles?\b/, /\btriangles?\b/, /\bcircles?\b/, /square corners?/, /sides and corners/],
    title: 'Build the shape', takeaway: 'A square has four equal sides; a rectangle has equal opposite sides. Both have four square corners.',
    tasks: [
      { say: 'Make a square.', when: 'shape == 1 and w == h', then: 'All four sides are the same length: a square.' },
      { say: 'Make a rectangle that is 6 sticks wide and 3 high.', when: 'shape == 1 and w == 6 and h == 3', then: 'Opposite sides are equal, but the sides are not all the same: a rectangle.' },
      { say: 'Now try a triangle. How many sides and corners?', when: 'shape == 0', then: '3 sides and 3 corners.' },
    ],
  },
  arrays: {
    grades: [1, 3], perChapter: { 1: 5, 2: 6 }, minScore: { 1: 2 }, match: [/\bgroups?\b/, /\bpacks? of\b/, /\btotal\b.*\btimes\b|\btimes\b.*\btotal\b/, /\b(two|three|four|five|six|seven|eight|nine|ten|\d+) times\b/, /sharing equally|shared equally|share equally/, /multiplication/, /\btimes (table|sign)s?\b/, /equal groups?|groups? of|counting groups/, /repeated addition/, /\bdivision\b|\bdivide/, /\u00f7/],
    title: 'Groups and rows', takeaway: 'Equal groups can be counted by adding, written as a multiplication fact and shared back out with division.',
    tasks: [
      { say: 'Make 3 groups of 3. What is 3 \u00d7 3?', when: 'g == 3 and e == 3', then: '3 + 3 + 3 = 9, so 3 \u00d7 3 = 9.' },
      { say: 'Make 6 groups of 3, then try 3 groups of 6.', when: 'g == 3 and e == 6', then: '6 \u00d7 3 and 3 \u00d7 6 both make 18: turning it round does not change the total.' },
      { say: 'Seven cars with 4 wheels each: how many wheels?', when: 'g == 7 and e == 4', then: '7 \u00d7 4 = 28 wheels, and 28 \u00f7 7 = 4 wheels on each car.' },
      { say: 'Make 4 groups of 3 flowers.', when: 'g == 4 and e == 3', then: '4 groups of 3 make 12: 4 \u00d7 3 = 12.' },
      { say: 'Make 24 jalebis: 6 groups of 4.', when: 'g == 6 and e == 4', then: '6 \u00d7 4 = 24, and 24 \u00f7 6 = 4 each.' },
    ],
  },
  metrerope: {
    grades: [3, 3], match: [/\bmetres?\b/, /metre rope|metre rod/, /half[- ]metre|quarter[- ]metre|half a metre/, /hand ?spans?|footsteps?/, /measuring length/],
    title: 'Lay the metre ropes', takeaway: 'A metre folded in half is a half-metre, and in half again a quarter-metre: two halves or four quarters make one metre.',
    tasks: [
      { say: 'Lay half-metre ropes end to end until you have exactly one metre.', when: 'piece == 1 and count == 2', then: 'Two half-metres make one metre.' },
      { say: 'Now do it with quarter-metre ropes.', when: 'piece == 2 and count == 4', then: 'Four quarter-metres make one metre.' },
      { say: 'Make a length longer than one metre.', when: 'piece == 1 and count == 3', then: 'Three half-metres are one and a half metres, longer than one metre.' },
    ],
  },
  wholeparts: {
    grades: [3, 3], match: [/\blitres?\b/, /\bkilograms?\b|\bkg\b/, /half[- ]litre|quarter[- ]litre|half kilogram|quarter kilogram/, /\bcapacity\b/],
    params: (text) => ({ kind: /kilogram|\bkg\b|\bweigh/.test(text) && !/\blitre/.test(text.slice(0, 80)) ? 'kg' : 'litre' }),
    title: 'Make one whole', takeaway: 'Two halves or four quarters make one whole litre or one whole kilogram.',
    tasks: (p) => [
      { say: `Use half-${p.kind === 'kg' ? 'kilogram' : 'litre'}s to make exactly one ${p.kind === 'kg' ? 'kilogram' : 'litre'}.`, when: 'piece == 0 and count == 2', then: `Two halves make one whole ${p.kind === 'kg' ? 'kilogram' : 'litre'}.` },
      { say: 'Now do it with quarters.', when: 'piece == 1 and count == 4', then: 'Four quarters make one whole.' },
      { say: 'Make more than one whole.', when: 'piece == 1 and count == 5', then: 'Five quarters are one and a quarter: more than the whole.' },
    ],
  },
  halfdouble: {
    grades: [3, 3], match: [/\bhalf and double\b/, /\bdouble\b/, /half of\b|half as many/, /\bhalving\b|\bdoubling\b/],
    title: 'Half and double', takeaway: 'Double is twice as many and half is one of two equal shares; an odd number has no whole half.',
    tasks: [
      { say: 'Show that 3 is half of 6.', when: 'n == 6 and who == 0', then: 'Half of 6 is 3, and 6 is double 3.' },
      { say: 'Find double 4.', when: 'n == 4 and who == 1', then: 'Double 4 is 8: twice as many.' },
      { say: 'Try to find half of 13. What happens?', when: 'n == 13 and who == 0', then: '13 is odd: one marble is left over, so it has no whole half.' },
    ],
  },
  roundsolids: {
    grades: [2, 3], perChapter: { 2: 3 }, match: [/solid shapes?/, /\bcones?\b/, /\bcylinders?\b/, /\bspheres?\b/, /\bcubes?\b|\bcuboids?\b/, /\bfaces\b/, /faces.*corners|corners.*edges/, /\bedges?\b/],
    title: 'Look at the solid', takeaway: 'Solid shapes have flat faces, curved surfaces and corners: a box has 6 faces and 8 corners, a ball has none.',
    tasks: [
      { say: 'Find a solid with no corners at all.', when: '(shape == 3 or shape == 4) and look == 2', then: 'The cylinder and the sphere have no corners.' },
      { say: 'Find the solid with exactly one corner and show it.', when: 'shape == 2 and look == 2', then: 'The cone has one corner, at its tip.' },
      { say: 'Show the flat faces of the cube. How many are there?', when: 'shape == 0 and look == 1', then: 'A cube has 6 flat faces, like a gift box.' },
    ],
  },
  numberchart: {
    grades: [2, 2], perChapter: { 2: 3 }, match: [/number charts?|hundred chart/, /number patterns?/, /counting backwards?|count backwards?|backward sequence/, /\bjump(s|ing|y)?\b|skip count/],
    title: 'Colour the pattern on the chart', takeaway: 'Number patterns make shapes on a chart: counting by 10 goes straight down, and 1, 12, 23 slants.',
    tasks: [
      { say: 'Show the pattern 1, 4, 7 and keep going.', when: 'start == 1 and step == 3 and n >= 5', then: 'Add 3 each time: 1, 4, 7, 10, 13.' },
      { say: 'Find the pattern that begins 1, 12, 23.', when: 'start == 1 and step == 11 and n >= 4', then: 'Add 11 each time: it slants down the chart.' },
      { say: 'Count backwards from 10: 10, 9, 8.', when: 'start == 10 and step == -1 and n >= 5', then: 'Each step takes away 1: 10, 9, 8, 7, 6.' },
      { say: 'Make the numbers go straight down a column.', when: 'step == 10 and n >= 4', then: 'Adding 10 moves one row down and keeps the same column.' },
    ],
  },
  threadline: {
    grades: [2, 2], perChapter: { 2: 3 }, match: [/\bslanting\b/, /\bvertical\b|standing line/, /\bhorizontal\b|sleeping/, /\bcurved lines?\b/, /is straight|\bthread\b|straight lines?/],
    title: 'Pull the thread', takeaway: 'A tight thread is a straight line: standing, sleeping or slanting. A loose thread makes a curved line.',
    tasks: [
      { say: 'Pull the thread tight so it points up and down.', when: 'tilt == 90 and slack == 0', then: 'A standing line, also called a vertical line.' },
      { say: 'Now make a sleeping line.', when: 'tilt == 0 and slack == 0', then: 'A sleeping line lies flat: a horizontal line.' },
      { say: 'Make a slanting line.', when: 'tilt == 45 and slack == 0', then: 'Between standing and sleeping, a slanting line is still straight.' },
      { say: 'Bring your hands closer. What happens to the thread?', when: 'slack >= 3', then: 'It droops into a curved line: it is not straight any more.' },
    ],
  },
  compare2: {
    grades: [2, 2], match: [/\bmore and less\b/, /\bmore than\b|\bless than\b/, /compar(e|ing) (the )?(two )?numbers?/, /\bgreater\b|\bsmaller\b/],
    title: 'Which is more?', takeaway: 'Compare the tens first; if they are the same, the ones decide.',
    tasks: [
      { say: 'Show 47 and 43. Which is more?', when: 'a == 47 and b == 43', then: 'Both have 4 tens, but 7 ones is more than 3 ones, so 47 is more.' },
      { say: 'Find two numbers where the tens decide it.', when: 'a == 52 and b == 38', then: '5 tens is more than 3 tens, so 52 is more, whatever the ones are.' },
      { say: 'Make the two numbers equal.', when: 'a == b', then: 'The same tens and the same ones: they are equal.' },
    ],
  },
  addpyramid: {
    grades: [2, 3], match: [/\bpyramids?\b/, /\bfact famil(y|ies)\b/, /\baddition facts?\b/, /\bpyramid sums?\b/],
    title: 'Build the addition pyramid', takeaway: 'Each number in a pyramid is the sum of the two numbers just below it.',
    tasks: [
      { say: 'Build the pyramid from 3, 9, 6 and 5. What is at the top?', when: 'a == 3 and b == 9 and c == 6 and d == 5', then: '3 + 9 = 12, 9 + 6 = 15, 6 + 5 = 11; then 12 + 15 = 27 and 15 + 11 = 26; the top is 53.' },
      { say: 'Make a pyramid whose second row is 20, 20, 20.', when: 'a + b == 20 and b + c == 20 and c + d == 20', then: 'Each pair adds to 20, so the second row is 20, 20, 20.' },
      { say: 'Put 0 in the whole bottom row. What happens?', when: 'a == 0 and b == 0 and c == 0 and d == 0', then: 'Adding zeros always gives 0, all the way to the top.' },
    ],
  },
  picturechart: {
    grades: [2, 6], perChapter: { 2: 5 }, match: [/data handling/, /\bpictographs?\b|\bpicture graphs?\b/, /\bface stands for\b|\bdraw faces\b/, /\bnumber of (children|students)\b/, /\bmost liked\b|\bleast liked\b|\bmost students\b|\bleast students\b|\b(more|fewer) students\b/, /\btable has\b|\bcomplete the table\b|\btable shows\b/, /\bchart\b|\bsurveys?\b/],
    params: (text) => ({ kind: /colou?rs?\b/.test(text.slice(0, 80)) ? 'colours' : /school|mode of|modes\b/.test(text.slice(0, 80)) || /\b(bus|bicycle|autorickshaw|on foot)\b/.test(text) ? 'modes' : /\btoys?\b|\bboard games?\b|sports items/.test(text) ? 'toys' : /fruit|chaat|sandwich|\bfood\b|\bate\b|\bsold\b/.test(text) ? 'foods' : /\bgames?\b|chess|cricket|kabaddi|football/.test(text) ? 'games' : 'things' }),
    title: 'Fill the picture chart', takeaway: 'One face stands for one child: the longest row is the most liked, the shortest the least.',
    tasks: [
      { say: 'Make the first row the longest.', when: 'a > b and a > c and a > d', then: 'The longest row is the one chosen by the most children.' },
      { say: 'Make the second row shorter than the first but longer than the third.', when: 'b < a and b > c', then: 'The second row has fewer than the first and more than the third.' },
      { say: 'Make every row the same length.', when: 'a == b and b == c and c == d', then: 'When every row has the same number, no one is the most or the least.' },
    ],
  },
  seesaw: {
    grades: [2, 2], match: [/see-?saw/, /\bheavier\b/, /\blighter\b/, /\bheavy\b|\bweigh(s|t)?\b/, /\bbalance\b/],
    title: 'Which side goes down?', takeaway: 'The heavier side goes down and the lighter side goes up; when both weigh the same it stays level.',
    tasks: [
      { say: 'Put the watermelon on one side and the mango on the other. Which side goes down?', when: '(li == 5 and ri == 1) or (li == 1 and ri == 5)', then: 'The watermelon is heavier, so its side goes down and the mango side goes up.' },
      { say: 'How many mangoes balance one watermelon?', when: 'li == 5 and lc == 1 and ri == 1 and rc == 10', then: 'About 10 mangoes weigh the same as the watermelon, so the see-saw stays level.' },
      { say: 'Show that a coconut weighs about the same as two mangoes.', when: 'li == 2 and lc == 1 and ri == 1 and rc == 2', then: 'One coconut and two mangoes balance.' },
      { say: 'Put the same thing on both sides. What happens?', when: 'li == ri and lc == rc', then: 'Equal weights: the see-saw stays level.' },
    ],
  },
  bottles: {
    grades: [2, 2], minScore: { 2: 4 }, match: [/\bbottles?\b/, /\bglasses\b/, /\bholds?\b/, /\bfill(s|ed)?\b/],
    title: 'How many glasses fill the bottle?', takeaway: 'Count the glasses to find which bottle holds more, fewer or the same.',
    tasks: [
      { say: 'Pour glasses until Raghu\u2019s bottle is exactly full. How many glasses?', when: 'poured == 4', then: 'Raghu\u2019s bottle holds 4 glasses.' },
      { say: 'Make the friend\u2019s bottle hold the same as Raghu\u2019s.', when: 'friend == 4', then: 'Both hold 4 glasses: the same amount.' },
      { say: 'Find a friend\u2019s bottle that holds more, and fill it.', when: 'friend > 4 and poured >= friend', then: 'It needs more glasses to fill: it holds more than Raghu\u2019s.' },
      { say: 'Find a friend\u2019s bottle that holds less. Pour 4 glasses in.', when: 'friend < 4 and poured >= 4', then: 'It overflows before 4 glasses: it holds less than Raghu\u2019s.' },
    ],
  },
  counting: {
    grades: [1, 1], perChapter: { 1: 4 }, match: [/^(?!.*\b(2[1-9]|[3-9]\d|100)\b).*\bcount(ing|s)?\b/, /numbers? from one to|one to nine|\bnumber names?\b|beyond 10|\bto 20\b/, /\bone more\b|\bone less\b|\bmore and less\b|\bbirds join\b/, /\bgroups of ten\b/],
    title: 'Count the counters', takeaway: 'Each counter you add makes one more: the number goes up by one.',
    tasks: [
      { say: 'Show five.', when: 'n == 5', then: 'Five fills the top frame: five counters.' },
      { say: 'Now add one more counter. What number is it?', when: 'n == 6', then: 'One more than five is six.' },
      { say: 'Show nine, the biggest number in the book.', when: 'n == 9', then: 'Nine is one less than ten.' },
      { say: 'Fill a whole frame: show ten.', when: 'n == 10', then: 'Ten counters fill one frame.' },
    ],
  },
  position: {
    grades: [1, 1], match: [/\babove\b|\bbelow\b/, /\bunder\b|\binside\b|\boutside\b/, /\bnear\b|\bin relation to\b|\bon or under\b/],
    title: 'Where is the ball?', takeaway: 'Position words say where something is: above, on, under, near, in and out.',
    tasks: [
      { say: 'Put the ball on the table.', when: 'place == 1', then: 'The ball is on the table.' },
      { say: 'Now put it under the table.', when: 'place == 2', then: 'Under means below, hidden beneath.' },
      { say: 'Throw the ball IN the basket.', when: 'place == 4', then: 'In: the ball is inside the basket.' },
      { say: 'Now it is OUT of the basket.', when: 'place == 5', then: 'Out: the ball is outside the basket.' },
    ],
  },
  rollslide: {
    grades: [1, 1], match: [/\broll(s|ing|ed)?\b/, /\bslid(e|es|ing)\b/, /\bflat surface\b/],
    title: 'Roll or slide?', takeaway: 'Round things roll, flat things slide, and some things can do both depending on how they sit.',
    tasks: [
      { say: 'Find something that only rolls.', when: 'obj == 0', then: 'A ball is round all over, so it rolls. R for rolling.' },
      { say: 'Find something that only slides.', when: 'obj == 1 or obj == 2', then: 'Flat faces slide. S for sliding.' },
      { say: 'Lay the tin on its side: does it roll?', when: 'obj == 3 and sit == 0', then: 'Yes, lying down it rolls. Stand it up and it slides: it can do both.' },
    ],
  },
  sortbuttons: {
    grades: [1, 1], match: [/\bsort(ing|ed)?\b/, /\bgroups? of (objects|things)\b|\bmaking groups\b/, /\bother ways\b|\bsame way\b/],
    title: 'Sort the buttons', takeaway: 'The same things can be sorted in different ways: by colour, by size or by holes.',
    tasks: [
      { say: 'Sort the buttons by colour. How many groups are there?', when: 'by == 0', then: 'Three groups: red, blue and yellow.' },
      { say: 'Sort them a different way: by size.', when: 'by == 1', then: 'Two groups: small and big. The same buttons, sorted another way.' },
      { say: 'Now sort by the number of holes.', when: 'by == 2', then: 'Two groups: buttons with 2 holes and buttons with 4 holes.' },
    ],
  },
  tumblers: {
    grades: [6, 8], match: [/\bmass and volume\b/, /\bvolume\b/, /\bmass\b/, /\bcapacity\b/, /\btumblers?\b/],
    title: 'Same tumbler, different water', takeaway: 'Capacity is how much a container can hold; volume is how much space the water takes up; the one with more water has more mass.',
    tasks: [
      { say: 'Make tumbler A hold more water than B. Which is heavier?', when: 'a > b', then: 'A has more volume of water and more mass, so A is heavier: the balance tips towards it.' },
      { say: 'Fill both tumblers right to the top.', when: 'a == 250 and b == 250', then: 'Same capacity and both full: the same volume, 250 mL, and about the same mass.' },
      { say: 'Empty tumbler B and fill A. What does the balance show?', when: 'a == 250 and b == 0', then: 'A has volume and mass; B has none, so the balance tips right down towards A.' },
    ],
  },
  addtake: {
    grades: [1, 1], perChapter: { 1: 4 }, params: (text) => ({ kind: /take away|taking away|taken away|how many left|\bleft\b|subtract|\bgo(es)? away|flew away/.test(text) ? 'take' : 'add' }),
    match: [/\badd(ing|ition)?\b/, /\bsums?\b/, /\bnumber pairs?\b|\bmaking 10\b/, /\baltogether\b|\bin all\b|\btotal\b/, /take away|taking away|taken away|how many left|\bsubtraction\b|\bsubtract/, /\bjoin(s|ing)?\b|\btogether\b/],
    title: 'Join or take away', takeaway: 'Joining groups makes a bigger number and taking some away leaves a smaller one.',
    tasks: (p) => (p.kind === 'take'
      ? [{ say: 'Start with 9 and take 6 away. How many are left?', when: 'n == 9 and k == 6', then: '9 take away 6 leaves 3.' },
         { say: 'Start with 7 and take 4 away.', when: 'n == 7 and k == 4', then: '7 take away 4 leaves 3.' },
         { say: 'Take all of them away. How many are left?', when: 'n == k and n > 0', then: 'When you take all away, none are left: zero.' }]
      : [{ say: 'Join 4 and 2. How many in all?', when: 'a == 4 and b == 2', then: '4 and 2 together make 6.' },
         { say: 'Find two groups that make 10.', when: 'a + b == 10 and a > 0 and b > 0', then: 'These two numbers make 10: a number pair for ten.' },
         { say: 'Add 7 and 3.', when: 'a == 7 and b == 3', then: '7 + 3 = 10.' }]),
  },
  numberwords: {
    grades: [1, 1], perChapter: { 1: 6 }, match: [/counting \d+ to \d+|\d+ to \d+/, /\bwritten as\b/, /\btens? frames?\b/, /\bnumber (names?|list)\b/, /\bmissing numbers?\b/, /\beach box can hold ten\b|\btens\b/],
    title: 'Count to a hundred', takeaway: 'Every full row is a ten: tens and ones tell you the number, and the number name says it in words.',
    tasks: [
      { say: 'Show thirty six. How many tens and ones?', when: 'n == 36', then: 'Thirty Six is 3 tens and 6 ones.' },
      { say: 'Show fifty: five full rows.', when: 'n == 50', then: 'Fifty is 5 tens and no ones.' },
      { say: 'Show twenty five.', when: 'n == 25', then: 'Twenty Five is 2 tens and 5 ones.' },
      { say: 'Fill every row: show one hundred.', when: 'n == 100', then: 'Ten tens make one hundred.' },
    ],
  },
  spans: {
    grades: [1, 1], params: (text) => ({ kind: /footspan/.test(text.slice(0, 60)) ? 'foot' : 'hand' }), match: [/\bhandspans?\b|\bfootspans?\b/, /\bspans?\b/, /\bhow many (hand|foot)spans\b/],
    title: 'Measure with spans', takeaway: 'A bigger hand or foot fits fewer times along a length, so you count fewer spans: measure with the same hand every time.',
    tasks: (p) => (p.kind === 'foot'
      ? [{ say: 'Measure the classroom side with a medium foot.', when: 'obj == 2 and size == 1', then: 'About 20 footspans.' },
         { say: 'Now use a big foot on the classroom side. More or fewer footspans?', when: 'obj == 2 and size == 2', then: 'Fewer: a bigger foot covers more each time.' },
         { say: 'Find the longest length: the playground edge.', when: 'obj == 3', then: 'The longest thing needs the most footspans.' }]
      : [{ say: 'Measure the table with a medium hand.', when: 'obj == 2 and size == 1', then: 'About 9 handspans.' },
         { say: 'Now use a big hand on the table. More or fewer handspans?', when: 'obj == 2 and size == 2', then: 'Fewer: a bigger hand covers more each time.' },
         { say: 'Measure the bag with a small hand.', when: 'obj == 1 and size == 0', then: 'About 4 handspans.' }]),
  },
  patternstrip: {
    grades: [1, 1], perChapter: { 1: 4 }, match: [/\bpatterns?\b/, /\bextend(ing)? (the )?patterns?\b/, /\bcolouring\b|\bkolam\b|\bthumb\b/],
    title: 'What comes next?', takeaway: 'A pattern repeats the same group again and again, so you can tell what comes next.',
    tasks: [
      { say: 'Make a pattern that takes turns: red circle, blue square (AB) with 8 shapes.', when: 'unit == 0 and count == 8', then: 'AB: red, blue, red, blue... they take turns.' },
      { say: 'Make a pattern with three different shapes repeating.', when: 'unit == 3 and count >= 6', then: 'ABC: red, blue, yellow, then the same three again.' },
      { say: 'Show the AAB pattern three times over (9 shapes). What comes next?', when: 'unit == 1 and count == 9', then: 'A red circle: after blue comes the start of the pattern again.' },
    ],
  },
  pihuday: {
    grades: [1, 1], perChapter: { 1: 3 }, match: [/\bmy day\b|\bdaily routine\b/, /\bmorning\b/, /\bafternoon\b/, /\bevening\b/, /\bnight\b/],
    title: 'Follow Pihu\u2019s day', takeaway: 'A day has a morning, an afternoon, an evening and a night, and the sun and the moon show which it is.',
    tasks: [
      { say: 'What does Pihu do after yoga or exercise?', when: 'step == 3', then: 'She brushes her teeth, then takes a bath.' },
      { say: 'Find lunch time. Where is the sun?', when: 'step == 9', then: 'Lunch is in the afternoon, when the sun is high in the sky.' },
      { say: 'Find the evening: the sun is setting.', when: 'step == 11', then: 'In the evening Pihu plays with her friends and then studies.' },
      { say: 'Find the night: moon and stars.', when: 'step >= 13', then: 'At night she eats dinner, reads a story book and sleeps.' },
    ],
  },
  // ---- geography and history ----
  timezone: {
    grades: [6, 10], match: [/time zones?/, /standard time/, /greenwich/, /\bIST\b/, /longitude.{0,40}time|time.{0,40}longitude/],
    title: 'Travel round the world', takeaway: 'Every 15 degrees of longitude is one hour of time.',
    tasks: [
      { say: 'Go to 90 degrees east.', when: 'lon == 90', then: '90 divided by 15 is 6, so it is 6 hours ahead of Greenwich.' },
      { say: 'Go to 45 degrees west.', when: 'lon == -45', then: '45 divided by 15 is 3, so it is 3 hours behind Greenwich.' },
    ],
  },
  latlong: {
    grades: [6, 10], match: [/latitudes?/, /longitudes?/, /equator/, /tropics? of/, /prime meridian/, /arctic circle|antarctic circle/],
    title: 'Find a place on the grid', takeaway: 'Latitude tells you how far north or south, longitude how far east or west.',
    tasks: [{ say: 'Stand on the Equator.', when: 'lat == 0', then: 'The Equator is latitude 0, halfway between the poles.' }, { say: 'Stand on the Prime Meridian.', when: 'lon == 0', then: 'Longitude 0 runs through Greenwich.' }],
  },
  mapscale: {
    grades: [4, 10], match: [/(map|drawing|bar) scale|scale (of|on) (a |the )?map/, /distance on (a |the )?map|map distance/, /\bmaps?\b/],
    title: 'Measure on the map', takeaway: 'Real distance = distance on the map x the scale.',
    tasks: [{ say: 'Show 400 km on the map.', when: 'cm * km == 400', then: 'Map distance x scale = real distance: 400 km.' }],
  },
  timeline: {
    subjects: ['social', 'hindi'], languages: ['en', 'hi'],
    grades: [6, 10], match: [/\bBCE\b/, /\bCE\b/, /centur(y|ies)/, /\bdynasty\b/, /\bempire\b/, /\breign\b|\bruled\b/, /\bhistory\b/, /\bancient\b/, /\b(?:1[0-9]{3}|20[0-2][0-9])\b/, /\b\d{1,2}(?:st|nd|rd|th) century\b/, /\bmaurya|gupta|mughal|chola|sultanate|harappan?\b/,
      /सन्|संवत्|ईस्वी/, /शताब्दी/, /राजवंश|साम्राज्य|सम्राट/, /इतिहास/, /(?:1[6-9]\d{2}|20[0-2]\d)/],
    // the lesson's own dates if it has three, otherwise the whole chapter's dates when this lesson mentions one of them.
    // A bare year only counts in a lesson that also reads as history, so an economics chart of 2025 gets no timeline.
    params: (text, facts, chapter) => {
      // a Hindi chapter: the words around the year are Hindi, so the English date reader finds nothing
      if (/[\u0900-\u097F]/.test(text || '')) {
        // A single lesson rarely has three dated facts of its own, so fall back to the dates the whole chapter mentions,
        // which is what the English side does too: the idea is the chapter's, not the lesson's.
        const own = datedEventsHi(facts || []);
        const events = own.length >= 3 ? own : datedEventsHi(chapter || []);
        return { events, hist: HI_HIST.test(text || ''), hi: true };
      }
      const own = datedEvents(facts || []);
      // A lesson about measuring time ('Timelines, Centuries and Millenniums') has no dated events of its own, and the
      // widget refuses to attach without three. Give it the standard anchors so the idea can still be shown.
      // Only a lesson that is ABOUT time: the words 'century' or 'CE' alone appear in ordinary history lessons,
      // and those used to get this same generic anchors timeline, which had nothing to do with their facts.
      if (own.length < 3 && /timelines?\b|\bmeasur\w*\s+(?:the\s+)?time\b|\btime\s+is\s+measured\b/i.test(text)) {
        // There is no year zero: the lesson itself says so, so CE begins at 1.
        const anchored = [{ year: -3000, label: 'First cities and writing' }, { year: 1, label: 'BCE ends, CE begins' },
          { year: 1000, label: 'A thousand years into CE' }, { year: 2000, label: 'Two thousand years into CE' }];
        return { events: anchored, hist: true };   // usable() also wants hist, or the anchor branch is never used
      }
      const hist = /\b(?:history|ancient|medieval|centur|dynasty|empire|emperor|king|queen|ruled|reign|bce|war|battle|revolution|revolt|movement|freedom|independence|coloni[sz]|british|mughal|sultan|treaty|parliament|harappa|civilisation|civilization)\b/.test(text);
      if (own.length) return { events: own, hist };
      return { events: datedEvents(facts || [], 1).length ? datedEvents(chapter || []) : [], hist };
    },
    // Two dated events still make a real timeline (a birth and a first book, a birth and a death), and a Hindi
    // biography often has only two. The challenges are written to match, so two points are worth showing.
    usable: (p) => p.events.length >= 2 && p.hist, minScore: 1, perChapter: 1,
    title: { en: 'Walk through time', hi: 'समय की रेखा पर चलिए' },
    takeaway: {
      en: 'Put events in order, and remember that BCE years count down towards 1 CE.',
      hi: 'घटनाओं को क्रम में रखिए, और याद रखिए कि ई.पू. के वर्ष 1 ई. की ओर उलटी गिनती में चलते हैं।',
    },
    tasks: (p, lang) => {
      const ev = [...p.events].sort((a, b) => a.year - b.year), yr = (y) => (y < 0 ? `${-y} BCE` : `${y} CE`);
      if (lang === 'hi') {
        const yhi = (y) => (y < 0 ? `${-y} ई.पू.` : `${y} ई.`);
        if (ev.length === 2) {
          return [
            { say: `आगे बढ़कर वह समय देखिए जब यह हुआ: ${ev[1].label}.`, when: `y >= ${ev[1].year}`, then: `वह ${yhi(ev[1].year)} में हुआ था।` },
            { say: `फिर पीछे लौटकर पहली घटना से भी पहले जाइए।`, when: `y < ${ev[0].year}`, then: `पहली घटना ${yhi(ev[0].year)} की है, दूसरी ${yhi(ev[1].year)} की: बीच में ${ev[1].year - ev[0].year} साल हैं।` },
          ];
        }
        return [
          { say: `उस समय पर जाइए जब यह हुआ: ${ev[1].label}.`, when: `y >= ${ev[1].year}`, then: `वह ${yhi(ev[1].year)} में हुआ था।` },
          { say: 'आख़िरी घटना तक आगे बढ़िए।', when: `y >= ${ev[ev.length - 1].year}`, then: `यहाँ की सबसे नई घटना ${yhi(ev[ev.length - 1].year)} की है।` },
        ];
      }
      if (ev.length === 2) {
        return [
          { say: `Move forward to when this happened: ${ev[1].label.replace(/[.]+$/, '')}.`, when: `y >= ${ev[1].year}`, then: `That was ${yr(ev[1].year)}.` },
          { say: 'Now go back to before the first event.', when: `y < ${ev[0].year}`, then: `The first event is ${yr(ev[0].year)} and the second is ${yr(ev[1].year)}: ${ev[1].year - ev[0].year} years apart.` },
        ];
      }
      return [
        { say: `Move to when this happened: ${ev[1].label.replace(/[.]+$/, '')}.`, when: `y >= ${ev[1].year}`, then: `That was ${yr(ev[1].year)}.` },
        { say: 'Go forward to the last event.', when: `y >= ${ev[ev.length - 1].year}`, then: `The latest event here is from ${yr(ev[ev.length - 1].year)}.` },
      ];
    },
  },
  market: {
    grades: [7, 10], titleOnly: true, perChapter: 4,
    match: [/law of demand/, /law of supply/, /market equilibrium|equilibrium price/, /excess demand|excess supply/, /prices? and markets?/],
    title: 'Run the market',
    takeaway: 'Demand falls when the price rises and supply rises with the price; the market settles where the two curves meet.',
    tasks: [
      { say: 'Set the price where buyers want exactly what sellers bring.', when: 'price == 100 and buyers == 0', then: 'At ₹100 a kg, buyers want 12 kg and sellers bring 12 kg: that is the equilibrium.' },
      { say: 'Make a shortage: set the price below the equilibrium.', when: 'price == 70', then: 'At ₹70 buyers want 15 kg but sellers bring only 9 kg, so the price would rise.' },
      { say: 'Add four buyers, then set the new equilibrium price.', when: 'price == 120 and buyers == 4', then: 'Four more buyers shift demand right, so the market settles at the higher price of ₹120.' },
    ],
  },
  barter: {
    grades: [6, 8], subjects: ['social'], perChapter: 2,
    match: [/\bbarter\b/, /double coincidence of wants/, /medium of exchange/, /forms? of money/, /earliest form of exchange/, /why do we need money|need (for )?money/],
    title: 'Swap in the village market',
    takeaway: 'Barter needs a double coincidence of wants: each person must want what the other has. Money is accepted by everyone, so it replaces barter.',
    tasks: [
      { say: 'Swap your wheat for shoes, without money.', when: 'mode == 0 and person == 0 and need == 0', then: 'Meena wanted wheat and had shoes, so the swap worked.' },
      { say: 'Try Ravi for salt and see the swap fail.', when: 'mode == 0 and person == 1 and need == 1', then: 'Ravi wanted cloth, not wheat, so no swap was possible.' },
      { say: 'Use money to buy the blanket.', when: 'mode == 1 and need == 2', then: 'Money is accepted by everyone, so you did not need a double match.' },
    ],
  },
  sectors: {
    grades: [8, 10], subjects: ['social'], perChapter: 2,
    match: [/three sectors/, /sectors? of the (indian )?economy|importance of sectors/, /primary,? secondary/, /\btertiary sector\b/, /value added|intermediate goods/],
    title: 'Follow a crop to the shop',
    takeaway: 'Growing cotton is primary work, making cloth is secondary and selling the shirt is a service. Each stage adds value, and as a country develops most workers move from farms to factories and then to services.',
    tasks: [
      { say: 'Send the cotton to the factory and make cloth.', when: 'stage == 1', then: 'The factory adds value by turning cotton into cloth: that is the secondary sector.' },
      { say: 'Take the shirt all the way to the shop.', when: 'stage == 2', then: 'The shop adds more value by selling the finished shirt: that is a service.' },
      { say: 'Show a country where most workers are in services.', when: 'advance == 2', then: 'As a country develops, workers move from farms to factories and then to services.' },
    ],
  },
  interest: {
    grades: [7, 10], subjects: ['social'], perChapter: 2,
    match: [/credit/, /\bdebt/, /\bborrow/, /\binterest\b/, /moneylender/, /high interest/, /\bbanks?\b/, /\bloans?\b/, /\bsavings\b/],
    title: 'Watch a loan grow', takeaway: 'Simple interest is charged only on the money borrowed; compound interest is also charged on last year\u2019s interest, so the amount owed grows faster every year.',
    tasks: [
      { say: 'Borrow at 20% or more for ten years and see how big the debt becomes.', when: 'rate >= 20 and years == 10', then: 'A high rate left for many years turns even a small loan into a huge debt: that is a debt trap.' },
      { say: 'Make what you owe more than double the money you borrowed.', when: 'P * (1 + rate / 100) ** years > 2 * P', then: 'Once the interest adds up to more than the loan itself, you owe more than double what you borrowed.' },
      { say: 'Keep the extra you pay under ₹600.', when: 'P * (1 + rate / 100) ** years - P <= 600', then: 'A small loan for a short time at a low rate costs only a little extra.' },
    ],
  },
  income: {
    grades: [10, 10], subjects: ['social'], perChapter: 1,
    match: [/average income/, /per capita income/, /income.{0,24}distribut/, /distributed more equally/, /averages? (can )?hide/],
    title: 'Two countries, the same average',
    takeaway: 'Average income is handy for comparing countries, but two countries with the same average can share it very differently: one may have every family on 5 thousand rupees a year while another has one rich family and nine poor ones.',
    tasks: [
      { say: 'Make Country B the same as Country A: every family earns 5 thousand.', when: 'rich == 5', then: 'Now both countries look the same: every family earns 5 thousand and the average is 5 thousand.' },
      { say: 'Make the other nine families in Country B get only 1 thousand each.', when: 'rich == 41', then: 'One family has 41 thousand and nine have 1 thousand, yet the average is still 5 thousand.' },
      { say: 'Make one family in Country B earn 50 thousand a year.', when: 'rich == 50', then: 'One family takes the whole 50 thousand and nine get nothing: the average still reads 5 thousand, but that average hides a very unequal country.' },
    ],
  },
  pressure: {
    grades: [7, 10],
    match: [/force per unit area|force (that acts|acting) on (each|a) unit/, /\bthrust\b/, /\bpressure\b.{0,24}(liquids?|depth)/, /\bliquids? pressure\b/, /atmospheric pressure|air pressure/, /pressure (exerted|applied) by (the )?air/, /pressure (is|means)\b/, /(narrow|broad) (straps?|tyres?|heels?)/, /newtons? per square/],
    title: 'Press with the same push on a smaller area',
    takeaway: 'Pressure is force spread over area: the same push in a smaller area presses harder, which is why a nail or a knife goes in.',
    tasks: [
      { say: 'Spread the same push over 10 cm².', when: 'area == 10', then: 'A wide area gives a low pressure: the block barely sinks.' },
      { say: 'Squeeze the whole push into 1 cm².', when: 'area == 1', then: 'The same force in 1 cm² gives the highest pressure: it sinks deep.' },
      { say: 'Push with 200 N on 2 cm².', when: 'force == 200 and area == 2', then: '200 N on 2 cm² is 100 N per cm².' },
    ],
  },
  atom: {
    grades: [9, 9], perChapter: 3,
    match: [/atomic number/, /mass number/, /\bisotopes?\b/, /valenc/, /electron(ic)? (shell|configuration|distribution)/, /\bprotons?\b/, /\bneutrons?\b/, /stationary states|fixed circular|orbits or shells/, /2n²|2n2/, /octet|outermost shell/],
    title: 'Build an atom', takeaway: 'Protons set which element it is, neutrons change the mass, and electrons fill shells and decide the charge.',
    tasks: [
      { say: 'Build a neutral carbon atom: 6 protons, 6 neutrons and 6 electrons.', when: 'p == 6 and n == 6 and e == 6', then: 'Carbon always has 6 protons. With 6 neutrons and 6 electrons it is neutral carbon-12.' },
      { say: 'Make a heavy isotope of carbon: 6 protons but 8 neutrons.', when: 'p == 6 and n == 8', then: 'Same protons, more neutrons: that is the isotope carbon-14.' },
      { say: 'Make a sodium ion: 11 protons but only 10 electrons.', when: 'p == 11 and e == 10', then: 'Sodium loses one electron, so it has a 1+ charge and a full 2, 8 outer shell.' },
    ],
  },
  osmosis: {
    grades: [8, 10],
    match: [/osmos/, /selectively permeable/, /semi[- ]?permeable/, /cell membrane/, /plasmoly/],
    title: 'Water through a membrane', takeaway: 'Water moves from the dilute side to the concentrated side through a selectively permeable membrane; the dissolved substance cannot cross.',
    tasks: [
      { say: 'Make the water cross to the right.', when: 'right > left and mins >= 5', then: 'The right side is stronger, so water moves right: the right level rises.' },
      { say: 'Make the water cross to the left.', when: 'left > right and mins >= 5', then: 'The left side is stronger, so water moves left: the left level rises.' },
      { say: 'Make both sides equally strong so the levels stay the same.', when: 'left == right and mins >= 5', then: 'Equal strength on both sides means equal water movement each way.' },
    ],
  },
  peas: {
    grades: [8, 10],
    match: [/mendel/, /heredity/, /inherited traits?/, /\bdominant\b/, /\brecessive\b/, /\bF1\b/, /\bF2\b/, /pea plants?/, /single trait|one trait/],
    title: 'Cross the pea plants', takeaway: 'Each parent gives one copy of a gene. T (tall) hides t (short), so a Tt plant looks tall but can still pass on shortness: two Tt parents have about three tall children to one short.',
    tasks: [
      { say: 'Cross a pure tall plant (TT) with a pure short plant (tt). Look at all four children.', when: 'g1 == 0 and g2 == 2', then: 'Every child gets T from one parent and t from the other, so all four are Tt: they all look tall, but they still carry the short gene.' },
      { say: 'Cross two of those children (Tt × Tt). How many of the four are short?', when: 'g1 == 1 and g2 == 1', then: 'One of the four is tt, so three look tall and one is short: about three tall to one short, as Mendel found.' },
      { say: 'Make a cross with two tall children and two short children.', when: '(g1 == 1 and g2 == 2) or (g1 == 2 and g2 == 1)', then: 'Tt × tt gives two Tt (tall) and two tt (short): half and half.' },
    ],
  },
  seats: {
    grades: [7, 10], subjects: ['social'], match: [/\bconstituenc/, /first[- ]past[- ]the[- ]post/, /\belections?\b/, /electoral/, /vote share|votes? and seats/, /political part(y|ies)/, /universal adult franchise/, /registered voters/, /representative democracy/, /free and fair elections?/, /polling station/],
    title: 'Turn votes into seats', takeaway: 'Each constituency is won outright, so seats can run well ahead of votes: the same share of votes can mean a very different number of seats.',
    tasks: [
      { say: 'Give party A 51% of the votes and count its seats.', when: 'share == 51', then: 'A lead of one point in the votes is worth far more than one point of seats: every constituency that flips goes to A alone.' },
      { say: 'Flatten the swings: make every constituency vote the same way while A is ahead.', when: 'spread == 0 and share > 50', then: 'With no local differences at all, a one-point lead wins every seat.' },
      { say: 'Take the swings to their widest and see who wins where.', when: 'spread == 20', then: 'When the local differences are large, the national vote share tells you much less about who wins a seat.' },
    ],
  },
  lapse: {
    grades: [6, 10], subjects: ['social'], match: [/\baltitude\b|height above sea level/, /\bsnow line\b/, /\bhill station/, /\blapse rate\b/, /air (cools|thins) (as|with|the higher)/, /temperature (decreases|falls|drops|is lower) (as|with|when)/, /\bhigher (up|you go)\b.{0,60}\b(cold|cool|thin)/, /\bair (pressure|density)\b.{0,40}\b(decrease|decreases|lower|thin)/],
    title: 'Climb the mountain', takeaway: 'Air cools about 6.5 degrees for every kilometre you climb, so the top of a mountain is cold and snow settles above the snow line.',
    tasks: [
      { say: 'Climb to 3,000 m and read the temperature.', when: 'height >= 3000', then: 'About 6.5 degrees are lost for every kilometre: a hill station at 2,000 m is around 13 degrees cooler than the coast.' },
      { say: 'Go high enough for the air to freeze.', when: 'height >= 4700', then: 'With 30 degrees at sea level, freezing comes at about 4,700 m: that is why the snow line sits high on tropical mountains.' },
      { say: 'Take the coast to 40 degrees and climb to the top.', when: 'base == 40 and height >= 6000', then: 'Warmer air at sea level lifts the snow line, so the same mountain has less snow than on a cooler day.' },
    ],
  },
  monsoon: {
    grades: [7, 9], subjects: ['social'], perChapter: 1, match: [/\bmonsoons?\b/, /seasonal reversal of (the )?winds?/, /moist (ocean|sea) air|moist air from (the )?(ocean|sea)/, /\bunequal heating of (the )?land and (the )?sea\b/, /winds? (blow|bring).{0,50}(ocean|sea).{0,30}(to|towards) (the )?land/],
    title: 'Follow the monsoon winds', takeaway: 'The monsoon is a yearly reversal of the winds. In summer the land is hotter, so moist sea air blows in and brings rain; in winter the sea is warmer, so cool dry air blows from the land out to sea.',
    tasks: [
      { say: 'Move the month to July, in the middle of the summer monsoon.', when: 'month == 7', then: 'In July the land is hotter than the sea, so low pressure sits over the land and moist winds come in from the sea. This is the summer monsoon, and it brings most of India\'s rain.' },
      { say: 'Move the month to December, in the winter monsoon.', when: 'month == 12', then: 'In December the land is cooler than the sea, so the pressure is low over the sea and cool, dry winds blow from the land out to sea. Little rain falls.' },
      { say: 'Find another month when the wind blows from the land to the sea.', when: 'month >= 1 and month <= 2', then: 'January and February work too: the winter monsoon lasts through these months, with dry winds blowing out to sea.' },
    ],
  },
  tangent: {
    grades: [9, 10], match: [/\btangents?\b/, /tangent to (a|the) circle/, /number of tangents/, /length of (the )?tangent/, /circle.{0,40}tangent|tangent.{0,40}circle/],
    title: 'Draw a tangent', takeaway: 'A tangent touches the circle at one point, meets the radius there at a right angle, and the two tangents from the same outside point are equal.',
    tasks: [
      { say: 'Try the 5-12-13 triple: radius 5 cm, point 13 cm from the centre.', when: 'r == 5 and d == 13', then: 'Each tangent is 12 cm: 5 squared plus 12 squared is 13 squared, so the right angle fits.' },
      { say: 'Move the point onto the circle itself.', when: 'd == r', then: 'A tangent from a point on the circle has no length: the point of contact is the point itself.' },
      { say: 'Keep the radius 5 and push the point to 20 cm from the centre.', when: 'r == 5 and d == 20', then: 'The tangent is only about 19.4 cm, not double the 12 cm: it grows more slowly than the distance.' },
    ],
  },
  elevation: {
    grades: [9, 10], subjects: ['maths'], match: [/angle of elevation/, /angles? of depression/, /heights? and distances?/, /\btower\b.{0,30}\bheight\b|\bheight\b.{0,30}\btower\b/, /line of sight/, /\bminar\b|\bchimney\b|\bflagstaff\b/, /\bheight of (a|the) (minar|tower|building|chimney|pole|flagstaff|tree)\b/, /\bshadows?\b/, /\bpole\b/],
    title: 'Look up at a tower', takeaway: 'The angle of elevation, the height and the distance form a right-angled triangle: distance = height / tan(angle).',
    tasks: [
      { say: 'Stand where the angle is exactly 45 degrees.', when: 'angle == 45', then: 'At 45 degrees the distance equals the height, because tan 45 is 1.' },
      { say: 'Come closer until the angle reaches 60 degrees.', when: 'angle == 60', then: 'tan 60 is about 1.73, so you stand a little more than half the height away.' },
      { say: 'Move away until the angle is only 20 degrees.', when: 'angle == 20', then: 'A small angle means a long distance: tan 20 is about 0.36, so the distance is nearly three times the height.' },
    ],
  },
  hcf: {
    grades: [9, 10], subjects: ['maths'], match: [/\bHCF\b/, /highest common factor/, /\bEuclid/, /division algorithm/, /\bgcd\b/, /common factors?/],
    title: 'Run Euclid\'s algorithm', takeaway: 'Divide, keep the remainder, repeat. When the remainder reaches zero, the last divisor is the highest common factor.',
    tasks: [
      { say: 'Pick 98 and 56, the numbers from the textbook.', when: 'a == 98 and b == 56', then: 'Three divisions reach zero, and the last divisor is 14, so the HCF of 98 and 56 is 14.' },
      { say: 'Find two numbers whose highest common factor is 1.', when: 'a == 13 and b == 7', then: 'Two primes share nothing, so the algorithm ends at 1: the numbers are co-prime.' },
      { say: 'Make the second number a factor of the first.', when: 'a == 60 and b == 12', then: 'The very first division leaves remainder zero, so the smaller number is itself the HCF.' },
    ],
  },
  loom: {
    grades: [4, 8], subjects: ['social'], titleOnly: true, perChapter: 3,
    match: [/weav/, /spinning/, /handloom/, /\blooms?\b/, /\bthreads?\b/, /\bfibres?\b|\bfibers?\b/, /\byarn\b/, /\bkhadi\b/, /\bcharkha\b/, /stitching|embroidery/, /\bcloth\b/],
    title: 'Weave a piece of cloth', takeaway: 'Cloth is made by crossing two sets of thread: the warp goes up and down, the weft goes over one thread and under the next, and they lock together.',
    tasks: [
      { say: 'Send the shuttle across once to weave the first row.', when: 'row == 1', then: 'The weft crosses the warp: over one thread and under the next.' },
      { say: 'Weave every row and finish the cloth.', when: 'row == 8', then: 'When the rows fill the warp, the threads lock together into cloth.' },
      { say: 'Cross two threads at a time to make a basket pattern.', when: 'over == 2', then: 'With two threads crossing together the marks get bigger: this is basket weave.' },
    ],
  },
  river: {
    grades: [4, 6], subjects: ['social'], perChapter: 1,
    match: [/tributar/, /\bdelta\b/, /mountain to sea/, /source to sea/, /\bstreams?\b/, /\breservoir\b/, /\bdams?\b/],
    title: 'Follow the river to the sea', takeaway: 'A river starts as a small stream in the hills. Tributaries join it and make it wider. It can be blocked by a dam and its reservoir, and near the sea it splits into a delta.',
    tasks: [
      { say: 'Make the river wider as small streams join it.', when: 'stage == 2', then: 'The joining streams are tributaries: each one adds water, so the river grows wider and stronger.' },
      { say: 'Stop the river with a giant wall and store its water.', when: 'stage == 4', then: 'A dam blocks the flow and holds the water in a reservoir for drinking, crops and electricity.' },
      { say: 'Take the river all the way to the sea.', when: 'stage == 5', then: 'Near the sea the river splits into many small streams and makes a delta, where mangroves grow.' },
    ],
  },
  lifecycle: {
    grades: [3, 6], subjects: ['science'], titleOnly: true, perChapter: 4,
    match: [/life ?cycle/, /\btadpole/, /metamorph/, /\bcocoon/, /silk ?moth/, /germinat/],
    title: 'Follow a life cycle', takeaway: 'Every living thing has a life cycle: an egg or seed, a young one, and then an adult that lays eggs or makes seeds again. In a frog, a mosquito and a silk moth the young looks nothing like the adult.',
    // Each lesson opens on its own living thing, and its tasks are about that one plus one other, so a child is never asked about a creature the lesson is not about.
    params: (text) => ({ creature: /frog|tadpole/.test(text) ? 0 : /mosquito/.test(text) ? 1 : /silk ?moth|cocoon/.test(text) ? 2 : 3 }),
    tasks: (params) => {
      const c = (params && params.creature) || 0, names = ['frog', 'mosquito', 'silk moth', 'bean plant'], other = (c + 1) % 4;
      const key = [
        { say: 'Show the frog when it is a tadpole.', when: 'creature == 0 and stage == 1', then: 'The tadpole lives in water, breathes with gills and swims with its tail. Later it grows legs.' },
        { say: 'Show the mosquito stage that wriggles in water.', when: 'creature == 1 and stage == 1', then: 'The larva wriggles in water and comes up to breathe. It looks nothing like the adult.' },
        { say: 'Show the silk moth wrapped in its cocoon.', when: 'creature == 2 and stage == 2', then: 'Inside the cocoon the caterpillar is changing into a moth. The silk thread is the cocoon.' },
        { say: 'Show a seed that has just begun to sprout.', when: 'creature == 3 and stage == 1', then: 'A seed needs water and warmth. It sprouts: a root goes down and a shoot comes up.' },
      ][c];
      const grown = c === 3 ? 'the plant has made its own seeds' : 'the adult can lay eggs of its own';
      return [
        key,
        { say: `Take the ${names[c]} all the way to its last stage.`, when: `creature == ${c} and stage == 3`, then: `At the last stage ${grown}, so the cycle can begin again.` },
        { say: `Now see how a ${names[other]} begins.`, when: `creature == ${other} and stage == 0`, then: `Every life cycle starts the same way: an egg, or a seed, that holds the young one.` },
      ];
    },
  },
  reflex: {
    grades: [10, 10], subject: 'science',
    match: [/reflex/, /nerve impulses?/, /neurons?/, /spinal cord/],
    title: 'The reflex arc', takeaway: 'A reflex is quick because the signal turns back at the spinal cord instead of going all the way up to the brain. That is why your hand leaves a hot pan before you feel the pain.',
    tasks: [
      { say: 'Send the signal all the way so the hand pulls back from the pan.', when: 't == 100', then: 'The reflex signal has reached the muscle and the hand is already away.' },
      { say: 'Stop when the reflex signal reaches the spinal cord, the shortcut point.', when: 't == 35', then: 'The spinal cord is where the reflex turns back, without waiting for the brain.' },
      { say: 'Stop when the news first reaches the brain.', when: 't == 53', then: 'The brain hears about it later: by then the hand has already moved.' },
    ],
  },
  reactivity: {
    grades: [10, 10], subject: 'science',
    match: [/reactivity series/, /activity series/, /\breactivity\b/, /more reactive than/, /displacement reaction/, /displaces? (copper|hydrogen|a less reactive|another)/, /metals? react with (water|acid|dilute)/, /reacts? violently with cold water/, /metal oxides? are (basic|amphoteric)/],
    title: 'Drop a metal in', takeaway: 'How a metal behaves in water, acid or a salt solution shows where it sits in the reactivity series: sodium is at the top, copper and silver near the bottom, and a metal above copper pushes copper out of copper sulphate.',
    tasks: [
      { say: 'Find a metal that fizzes in dilute acid but not in cold water.', when: 'metal == 1 and liquid == 2', then: 'Magnesium is too slow in cold water, but it fizzes fast in dilute acid.' },
      { say: 'Show a metal that does not react with dilute acid at all.', when: 'metal == 4 and liquid == 2', then: 'Copper is below hydrogen in the activity series, so it cannot push hydrogen out of the acid.' },
      { say: 'Push copper out of copper sulphate solution with a more reactive metal.', when: 'metal == 2 and liquid == 3', then: 'Zinc is more reactive than copper, so it takes the copper\u2019s place: the blue fades and a brown coat of copper forms.' },
    ],
  },
};

// Dates in the lesson's own facts, as timeline events: "around 320 BCE", "in 1857", "the 3rd century BCE".
// Labels are the fact itself with the date phrase taken off and cut at a whole word, so they read as a short event.
const DATE_TAIL = /[,]?\s*(?:\b(?:in|around|about|by|from|of|during|until|till|after|before|between|the|latter|early|late|part)\b\s*)*(?:\d{1,4}(?:\s*(?:or|and|to|-)\s*\d{1,4})?\s*(?:BCE|BC|CE|AD)?|\d{1,2}(?:st|nd|rd|th) centur(?:y|ies)(?: (?:BCE|BC|CE|AD))?|(?:\d{1,2}\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{3,4})\b.*$/i;
// Hindi dates. datedEvents above looks for English month names and prepositions ("in 1916"), which a Hindi sentence
// never has, so a Hindi chapter about a poet's life had years in it and still produced no timeline. A year counts only
// when it is used as a date: सन् / ई. / संवत् before it, or a Hindi time word right after it.
const HI_HIST = /इतिहास|प्राचीन|मध्यकाल|शताब्दी|राजवंश|साम्राज्य|सम्राट|शासन|स्वतंत्रता|आंदोलन|संग्राम|युद्ध|संविधान|कवि|रचना|जन्म|स्थापना|निर्माण/;
function labelHi(sentence) {
  let c = sentence.replace(/\s+/g, ' ').trim().replace(/[।.!]+$/, '');
  if (c.length > 52) c = c.slice(0, 52).replace(/\s+\S*$/, '');
  return c;
}
function datedEventsHi(facts, need = 3) {
  const out = [], seen = new Set();
  for (const f of facts || []) {
    const sentence = String(f.say || '').replace(/\s+/g, ' ').trim();
    const m = sentence.match(/(?<!\d)(1[6-9]\d{2}|20[0-2]\d)(?!\d)/);
    if (!m) continue;
    const y = Number(m[1]);
    if (seen.has(y)) continue;
    const near = sentence.slice(Math.max(0, m.index - 22), m.index + m[0].length + 16);
    const before = /सन्|ई\.|ईस्वी|संवत्|शताब्दी/.test(near);
    const after = /^\s*(?:में|को|तक|से|के\s+(?:बाद|पहले|समय|दौरान|जन्म)|की\s+(?:रचना|स्थापना))/.test(sentence.slice(m.index + m[0].length));
    if (!before && !after) continue;
    // A sentence that starts with a pronoun means nothing on its own: "वह घटना सन् 1933 की है" ("that event was in
    // 1933") became a timeline label that pointed at a sentence the child never sees. datedEvents above drops the same
    // shape in English and the Hindi side was missing it.
    // A pronoun pointing back at another *event* is worthless on a timeline: "वह घटना सन् 1933 की है" (that event was
    // in 1933) names nothing. A pronoun pointing at a person is fine here, because the person is the chapter's
    // subject: "उनका पहला कहानी संग्रह 1958 में छपा" reads perfectly. So drop only the event-shaped ones.
    if (/^(?:वह|वे|वो|यह|ये|इस|उस|उन|इन)\s+(?:घटना|बात|प्रसंग|उदाहरण|समय|वर्ष|साल)(?:\s|[,.।]|$)/.test(sentence)) continue;
    seen.add(y);
    out.push({ year: y, label: labelHi(sentence) });
  }
  // three dates are what the widget needs to be worth showing
  return out.length >= (need === 1 ? 1 : Math.min(need, out.length)) ? out.sort((a, b) => a.year - b.year) : out.sort((a, b) => a.year - b.year);
}

function label(sentence) {
  let c = sentence.replace(/\s+/g, ' ').trim().replace(/[.!]+$/, '');
  const cut = c.replace(DATE_TAIL, '').trim();
  if (cut.split(' ').length >= 3) c = cut;
  c = c.split(/[;:]/)[0].replace(/[,]\s*$/, '').trim();
  if (c.length > 52) c = c.slice(0, 52).replace(/\s+\S*$/, '').replace(/[,]$/, '');
  for (let prev = ''; prev !== c;) { prev = c; c = c.replace(/\s+(the|a|an|of|in|to|and|from|by|was|were|is|are|with|at|on)$/i, ''); }
  return c;
}
export function datedEvents(facts, need = 3) {
  let out = [];
  const seen = new Set();
  for (const f of facts) {
    const t = f.say || '';
    let y = null, m;
    if ((m = t.match(/(\d{1,4})\s*(BCE|BC)\b/))) y = -Number(m[1]);
    else if ((m = t.match(/(\d{1,4})\s*(CE|AD)\b/))) y = Number(m[1]);
    else if ((m = t.match(/(\d{1,2})(st|nd|rd|th) century (BCE|BC)/i))) y = -(Number(m[1]) * 100 - 50);
    else if ((m = t.match(/(\d{1,2})(st|nd|rd|th) century( CE| AD)?/i))) y = Number(m[1]) * 100 - 50;
    // a month name before the year: "in January 1915", "on 6 April 1919"
    else if ((m = t.match(/\b(?:in|on|by|from|around|before|after|until|till|of|between)\s+(?:\d{1,2}\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{3,4})\b/i))) y = Number(m[1]);
    else if ((m = t.match(/\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i))) y = Number(m[1]);
    else if ((m = t.match(/\b(?:in|around|by|from|of|year|until|till|after|before|between) (1[0-9]{3}|20[0-2][0-9])\b/))) y = Number(m[1]);
    if (y === null || y === 0 || seen.has(y)) continue;
    if (/^(this|these|that|those|it|its|they|their|he|she|his|her|here|there)\b/i.test(t.trim())) continue;   // needs the sentence before it to make sense
    seen.add(y); out.push({ year: y, label: label(t) });
  }
  // one era per timeline: ancient and modern dates together squash one end flat, so keep the larger group
  const old = out.filter((e) => e.year < 1000), recent = out.filter((e) => e.year >= 1000);
  if (old.length && recent.length) out = old.length >= recent.length ? old : recent;
  return out.length >= need ? out.sort((a, b) => a.year - b.year).slice(0, 7) : [];
}
