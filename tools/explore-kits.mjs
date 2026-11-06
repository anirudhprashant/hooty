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
    perChapter: { 3: 4 }, grades: [3, 8], match: [/fractions?/, /numerator/, /denominator/, /\bhalves\b|\bquarters?\b(?! turns?)/],
    title: 'Shade the fraction', takeaway: 'The bottom number says how many equal parts, the top says how many are taken.',
    tasks: [
      { say: 'Show one half.', when: 'n * 2 == d', then: 'Any fraction whose top is half its bottom equals one half.' },
      { say: 'Cut the bar into 4 equal parts and shade one quarter.', when: 'd == 4 and n == 1', then: 'One of four equal parts is a quarter: four quarters make a whole.' },
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
    grades: [6, 7], match: [/bar graphs?/, /pictographs?/, /tally/, /\bfrequency\b/],
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
    grades: [6, 8], match: [/thermometers?/, /temperature/, /\bfever\b/, /celsius|fahrenheit/, /hot (or|and) cold/],
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
  // ---- science ----
  particles: {
    grades: [6, 9], titleOnly: true, match: [/states? of matter/, /melting|boiling|freez|evaporat|condens/, /\bparticles?\b/, /\bice\b.*\bsteam\b/],
    title: 'Heat the water', takeaway: 'Heating gives particles more energy: held in place in ice, sliding in water, flying apart as steam.',
    tasks: [
      { say: 'Freeze the water.', when: 'temp < 0', then: 'Below 0 degrees water is ice: its particles can only jiggle in place.' },
      { say: 'Boil it.', when: 'temp >= 100', then: 'At 100 degrees water boils and its particles fly apart as steam.' },
    ],
  },
  reflection: {
    grades: [6, 10], match: [/reflect/, /\bmirrors?\b/, /angle of incidence/, /\bnormal\b/],
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
    grades: [6, 8], match: [/day and night/, /rotation of (the )?earth/, /earth (rotates|spins)/, /\bsunrise\b|\bsunset\b/],
    title: 'Spin the Earth', takeaway: 'The Earth spins once a day, so each place turns into the sunlight and out of it again.',
    tasks: [
      { say: 'Turn to midnight.', when: 'hour == 0 or hour == 24', then: 'Your place has turned away from the Sun.' },
      { say: 'Find sunrise.', when: 'hour == 6', then: 'At sunrise your place is turning into the sunlight.' },
    ],
  },
  seasons: {
    grades: [6, 9], titleOnly: true, match: [/\bseasons?\b/, /revolution/, /\btilt(ed)?\b/, /\baxis\b/, /\bsummer\b|\bwinter\b/],
    title: 'Go round the Sun', takeaway: 'The tilted Earth leans each half toward the Sun in turn, which makes the seasons.',
    tasks: [{ say: 'Go to December.', when: 'month == 12', then: 'Now the southern half leans toward the Sun: summer there, winter in India.' }],
  },
  circuit: {
    grades: [6, 10], match: [/circuit/, /\belectric(ity|al)?\b/, /\bbulbs?\b/, /\bswitch(es)?\b/, /\bconductors?\b/, /\bcurrent\b/],
    title: 'Light the bulb', takeaway: 'Current flows only round a closed circuit; more cells push more current.',
    tasks: [
      { say: 'Light the bulb.', when: 'closed == 1', then: 'Closing the switch completes the circuit, so current flows.' },
      { say: 'Make the bulb brighter.', when: 'closed == 1 and cells > bulbs', then: 'More cells for each bulb push more current through it.' },
    ],
  },
  floatsink: {
    grades: [6, 9], match: [/\bfloat/, /\bsinks?\b|\bsinking\b/, /\bdens(e|ity)\b/, /buoyan/],
    title: 'Float or sink?', takeaway: 'Things lighter than water for their size float; denser things sink.',
    tasks: [{ say: 'Make the block sink.', when: 'd > 10', then: 'It is now denser than water, so it sinks.' }],
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
    grades: [6, 9], match: [/\bspeed\b/, /\bvelocity\b/, /uniform motion/, /km\/h|m\/s/, /distance (travelled|covered)/],
    title: 'Race the cars', takeaway: 'Distance = speed x time.',
    tasks: [
      { say: 'Make the two cars cover the same distance.', when: 'a == b', then: 'Same speed for the same time means the same distance.' },
      { say: 'Make the red car cover 200 m.', when: 'a * t == 200', then: 'Speed x time = distance, so this gives 200 m.' },
    ],
  },
  shadow: {
    grades: [6, 7], match: [/shadows?/, /\bopaque\b|\btranslucent\b|\btransparent\b/, /light travels in (a )?straight/],
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
  watercycle: {
    grades: [6, 7], match: [/water cycle/, /evaporat/, /condens/, /precipitat/],
    title: 'Follow a drop', takeaway: 'Water evaporates, condenses into clouds, falls as rain and flows back: the water cycle.',
    tasks: [{ say: 'Follow the water until it falls as rain.', when: 'step == 3', then: 'Drops in the clouds grow heavy and fall.' }, { say: 'Finish the cycle.', when: 'step == 4', then: 'Rivers carry the water back to the sea, ready to start again.' }],
  },
  neutral: {
    grades: [6, 10], titleOnly: true, match: [/\bacids?\b|\bacidic\b/, /\bbases?\b|\bbasic\b/, /neutrali[sz]/, /indicator|litmus/],
    title: 'Mix acid and base', takeaway: 'Equal amounts of acid and base cancel out and make a neutral solution.',
    tasks: [{ say: 'Make the solution neutral.', when: 'acid == base', then: 'Equal drops cancel out: neutral.' }, { say: 'Make it basic.', when: 'base > acid', then: 'More base than acid: litmus turns blue.' }],
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
    grades: [6, 10], match: [/photosynth/, /chlorophyll/, /food factor(y|ies)/, /\bstomata\b/, /plants? make (their )?(own )?food/],
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
    grades: [6, 8], match: [/sea breezes?|land breezes?/, /\bconvection\b/],
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
    grades: [6, 8], match: [/\bseep(age|s|ing)?\b/, /groundwater/, /infiltration/, /\bgravel\b/],
    title: 'Pour the water', takeaway: 'Water seeps fastest through gravel and slowest through clay, because of the gaps between the particles.',
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
  seethrough: {
    grades: [6, 7], match: [/\btranslucent\b/, /\bopaque\b/, /\btransparent\b/, /seeing through/],
    title: 'Look through it', takeaway: 'Transparent: seen clearly. Translucent: seen, but not clearly. Opaque: not seen at all.',
    tasks: [
      { say: 'Find a sheet that makes the star blurry.', when: 'm == 3 or m == 4', then: 'Butter paper and frosted glass are translucent.' },
      { say: 'Find a sheet that hides the star completely.', when: 'm >= 5', then: 'Wood, cardboard and metal are opaque.' },
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
    grades: [3, 6], match: [/\bclocks?\b/, /\ba\.?m\.?\b.*\bp\.?m\.?\b|\bam\b.*\bpm\b/, /hours? and minutes?/, /24-hour|\bo.clock\b/, /half past|quarter (past|to)/, /hours in a day/],
    title: 'Set the clock', takeaway: 'AM is from midnight to noon and PM from noon to midnight; a 24-hour clock counts on past 12, so 8:00 PM is 20:00.',
    tasks: [
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
    grades: [3, 6], match: [/leap years?/, /\bcalendars?\b/, /\bfebruary\b/, /days of the week/, /\bdd\/mm\/yyyy\b/],
    title: 'Flip the calendar', takeaway: 'February has 29 days only in a leap year, which comes every four years and has 366 days.',
    tasks: [
      { say: 'Show February 2024. How many days does it have?', when: 'year == 2024 and month == 2', then: '29 days: 2024 is a leap year.' },
      { say: 'Find the next February with 29 days after 2024.', when: 'year == 2028 and month == 2', then: 'Leap years come every four years: 2020, 2024, 2028.' },
      { say: 'Show July 2024. What day is 1 July?', when: 'year == 2024 and month == 7', then: 'A Monday, so the next Mondays are 8 July and 15 July.' },
    ],
  },
  money: {
    grades: [3, 5], match: [/\bcoins?\b/, /\brupees?\b|\u20b9/, /\bshopping\b/, /\bbalances? to customers\b/],
    title: 'Pay the exact amount', takeaway: 'The same amount can be made with different notes and coins; big notes first uses the fewest.',
    tasks: [
      { say: 'Make \u20b936.', when: 'amt == 0 and 100 * h + 50 * f + 10 * t + 5 * v + o == 36', then: 'For example 3 \u00d7 \u20b910 + 1 \u00d7 \u20b95 + 1 \u00d7 \u20b91.' },
      { say: 'Make \u20b9163 with just 6 notes and coins.', when: 'amt == 2 and 100 * h + 50 * f + 10 * t + 5 * v + o == 163 and h + f + t + v + o == 6', then: '\u20b9100 + \u20b950 + \u20b910 + \u20b91 + \u20b91 + \u20b91: big notes first.' },
      { say: 'Pay \u20b955 in two different ways, one after the other.', when: 'amt == 7 and 100 * h + 50 * f + 10 * t + 5 * v + o == 55 and h == 0', then: 'For example 5 \u00d7 \u20b910 + 1 \u00d7 \u20b95, or \u20b950 + \u20b95: the same amount can be paid in many ways.' },
      { say: 'Make \u20b9183 a different way, using no \u20b9100 note.', when: 'amt == 3 and 100 * h + 50 * f + 10 * t + 5 * v + o == 183 and h == 0', then: 'Lots of ways make the same amount.' },
    ],
  },
  blocks: {
    grades: [2, 5], match: [/dienes/, /ten ones make|ones make one ten|tens make one hundred|hundreds make one thousand/, /building thousand|^(?!.*(adding|subtracting|taking away)).*blocks/, /\btens\b.*\bones\b/],
    title: 'Build it with blocks', takeaway: '10 ones make 1 ten, 10 tens make 1 hundred and 10 hundreds make 1 thousand.',
    tasks: [
      { say: 'Make 34.', when: 'th == 0 and hu == 0 and te == 3 and on == 4', then: '3 tens and 4 ones make 34.' },
      { say: 'Make 250.', when: 'th == 0 and hu == 2 and te == 5 and on == 0', then: '2 hundreds, 5 tens and no ones make 250.' },
      { say: 'Make 106 and notice the empty tens.', when: 'th == 0 and hu == 1 and te == 0 and on == 6', then: '1 hundred, no tens and 6 ones make 106.' },
      { say: 'Show 14 using one ten and four ones.', when: 'th == 0 and hu == 0 and te == 1 and on == 4', then: '14 ones can be grouped as 1 ten and 4 ones.' },
    ],
  },
  column: {
    grades: [2, 5], match: [/\badding\b|\bsubtracting\b|\btaking away\b/, /regroup/, /\bcarry|\bcarrying\b/, /\bborrow/, /take away|taking away/, /\badd up\b|subtract it/, /column (addition|subtraction)/],
    params: (text) => ({ kind: /^add/.test(text) || /\badd up\b/.test(text) ? 'add' : /subtract|take away|taking away|borrow|\bleft\b/.test(text) ? 'sub' : 'add' }),
    title: 'Add and subtract in columns', takeaway: 'Work one column at a time, starting with the ones: when a column reaches 10 you regroup into the next column.',
    tasks: (p) => (p.kind === 'sub'
      ? [{ say: 'Take away 215 from 438.', when: 'a == 438 and b == 215 and step == 3', then: '438 \u2212 215 = 223: that is how many children are still waiting.' },
         { say: 'Take 47 away from 73.', when: 'a == 73 and b == 47 and step == 3', then: '3 ones is less than 7, so regroup 1 ten as 10 ones: 73 \u2212 47 = 26.' },
         { say: 'Find a take-away that needs regrouping: 83 \u2212 46.', when: 'a == 83 and b == 46 and step == 3', then: '3 ones is less than 6, so regroup 1 ten as 10 ones: 83 \u2212 46 = 37.' }]
      : [{ say: 'Add 438 and 476, one column at a time.', when: 'a == 438 and b == 476 and step == 3', then: '438 + 476 = 914, and regrouping carried a 1 twice.' },
         { say: 'Add 36 and 47. What carries?', when: 'a == 36 and b == 47 and step == 3', then: 'The ones total 13: write 3 and carry 1 ten. 36 + 47 = 83.' },
         { say: 'Add 185 and 125.', when: 'a == 185 and b == 125 and step == 3', then: '185 + 125 = 310: 10 ones and 10 tens both regrouped.' }]),
  },
  numberjump: {
    grades: [2, 3], match: [/\bginladi\b/, /number lines?/, /\bjump(s|ing)?\b/, /count(ing)? (on|back)/, /\bjump(ing)? (back|forward)/],
    title: 'Hop along the number line', takeaway: 'Jumping forward adds and jumping back takes away; equal jumps count in tens, fives or any step.',
    tasks: [
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
    grades: [3, 3], match: [/multiplication/, /\btimes\b/, /equal groups?|groups? of|counting groups/, /repeated addition/, /\bdivision\b|\bdivide/, /\u00f7/],
    title: 'Groups and rows', takeaway: 'Equal groups can be counted by adding, written as a multiplication fact and shared back out with division.',
    tasks: [
      { say: 'Make 3 groups of 3. What is 3 \u00d7 3?', when: 'g == 3 and e == 3', then: '3 + 3 + 3 = 9, so 3 \u00d7 3 = 9.' },
      { say: 'Make 6 groups of 3, then try 3 groups of 6.', when: 'g == 3 and e == 6', then: '6 \u00d7 3 and 3 \u00d7 6 both make 18: turning it round does not change the total.' },
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
    grades: [2, 2], perChapter: { 2: 3 }, match: [/solid shapes?/, /\bcones?\b/, /\bcylinders?\b/, /\bspheres?\b/, /\bcubes?\b|\bcuboids?\b/, /\bfaces\b/, /faces.*corners|corners.*edges/, /\bedges?\b/],
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
  // ---- geography and history ----
  timezone: {
    grades: [6, 8], match: [/time zones?/, /standard time/, /greenwich/, /\bIST\b/, /longitude.{0,40}time|time.{0,40}longitude/],
    title: 'Travel round the world', takeaway: 'Every 15 degrees of longitude is one hour of time.',
    tasks: [
      { say: 'Go to 90 degrees east.', when: 'lon == 90', then: '90 divided by 15 is 6, so it is 6 hours ahead of Greenwich.' },
      { say: 'Go to 45 degrees west.', when: 'lon == -45', then: '45 divided by 15 is 3, so it is 3 hours behind Greenwich.' },
    ],
  },
  latlong: {
    grades: [6, 8], match: [/latitudes?/, /longitudes?/, /equator/, /tropics? of/, /prime meridian/, /arctic circle|antarctic circle/],
    title: 'Find a place on the grid', takeaway: 'Latitude tells you how far north or south, longitude how far east or west.',
    tasks: [{ say: 'Stand on the Equator.', when: 'lat == 0', then: 'The Equator is latitude 0, halfway between the poles.' }, { say: 'Stand on the Prime Meridian.', when: 'lon == 0', then: 'Longitude 0 runs through Greenwich.' }],
  },
  mapscale: {
    grades: [6, 8], match: [/\bscale\b/, /distance on (a |the )?map|map distance/, /\bmaps?\b/],
    title: 'Measure on the map', takeaway: 'Real distance = distance on the map x the scale.',
    tasks: [{ say: 'Show 400 km on the map.', when: 'cm * km == 400', then: 'Map distance x scale = real distance: 400 km.' }],
  },
  timeline: {
    grades: [6, 8], match: [/\bBCE\b/, /\bCE\b/, /centur(y|ies)/, /\bdynasty\b/, /\bempire\b/, /\breign\b|\bruled\b/, /\bhistory\b/, /\bancient\b/],
    // the lesson's own dates if it has three, otherwise the whole chapter's dates when this lesson mentions one of them
    params: (text, facts, chapter) => { const own = datedEvents(facts || []); if (own.length) return { events: own }; return { events: datedEvents(facts || [], 1).length ? datedEvents(chapter || []) : [] }; },
    usable: (p) => p.events.length >= 3, minScore: 1, perChapter: 1,
    title: 'Walk through time', takeaway: 'Put events in order, and remember that BCE years count down towards 1 CE.',
    tasks: (p) => {
      const ev = [...p.events].sort((a, b) => a.year - b.year), yr = (y) => (y < 0 ? `${-y} BCE` : `${y} CE`);
      return [
        { say: `Move to when this happened: ${ev[1].label.replace(/[.]+$/, '')}.`, when: `y >= ${ev[1].year}`, then: `That was ${yr(ev[1].year)}.` },
        { say: 'Go forward to the last event.', when: `y >= ${ev[ev.length - 1].year}`, then: `The latest event here is from ${yr(ev[ev.length - 1].year)}.` },
      ];
    },
  },
};

// Dates in the lesson's own facts, as timeline events: "around 320 BCE", "in 1857", "the 3rd century BCE".
// Labels are the fact itself with the date phrase taken off and cut at a whole word, so they read as a short event.
const DATE_TAIL = /[,]?\s*(?:\b(?:in|around|about|by|from|of|during|until|till|after|before|between|the|latter|early|late|part)\b\s*)*(?:\d{1,4}(?:\s*(?:or|and|to|-)\s*\d{1,4})?\s*(?:BCE|BC|CE|AD)?|\d{1,2}(?:st|nd|rd|th) centur(?:y|ies)(?: (?:BCE|BC|CE|AD))?)\b.*$/i;
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
    else if ((m = t.match(/\b(?:in|around|by|from|of|year|until|till|after|before) (1[0-9]{3}|20[0-2][0-9])\b/))) y = Number(m[1]);
    if (y === null || y === 0 || seen.has(y)) continue;
    if (/^(this|these|that|those|it|its|they|their|he|she|his|her|here|there)\b/i.test(t.trim())) continue;   // needs the sentence before it to make sense
    seen.add(y); out.push({ year: y, label: label(t) });
  }
  // one era per timeline: ancient and modern dates together squash one end flat, so keep the larger group
  const old = out.filter((e) => e.year < 1000), recent = out.filter((e) => e.year >= 1000);
  if (old.length && recent.length) out = old.length >= recent.length ? old : recent;
  return out.length >= need ? out.sort((a, b) => a.year - b.year).slice(0, 7) : [];
}
