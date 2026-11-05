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
    grades: [6, 7], match: [/measur(e|ing) (the )?length/, /standard units?/, /\bruler\b|\bscale\b.*\bcm\b|measuring tape/, /centimetres?|millimetres?/, /measuring length correctly/],
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
