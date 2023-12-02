import { ReadStream, createReadStream } from "fs";

type SetResult = { red?: number; green?: number; blue?: number };
type LineFn = (
  buf: Buffer,
  setFn: (buf: Buffer) => Required<SetResult>,
) => Required<SetResult>[];
type SetFn = (set: Buffer, valFn: ValueFn) => Required<SetResult>;
type ValueFn = (val: Buffer) => SetResult;

function elegantPair(x: number, y: number) {
  if (x >= y) {
    return y * y + x;
  } else {
    return x * x + x + y;
  }
}

function hashBytes(b: Buffer) {
  return b.reduce((pv, cv) => elegantPair(pv, cv), 0);
}

function isNumber(num: number) {
  return num >= 48 && num <= 57;
}

function isNewline(num: number) {
  return num === 10;
}

function isComma(num: number) {
  return num === 44;
}

function isSemicolon(num: number) {
  return num === 59;
}

function isColon(num: number) {
  return num === 58;
}

function until(
  buf: Buffer,
  offset: number,
  predicate: (num: number) => boolean,
): number {
  const val = buf.slice(offset).findIndex(predicate);
  if (val === -1) {
    return buf.length;
  }
  return val + offset;
}

function mergeSets(
  set1: Required<SetResult>,
  set2: SetResult,
): Required<SetResult> {
  return {
    red: set1.red + (set2.red ?? 0),
    green: set1.green + (set2.green ?? 0),
    blue: set1.blue + (set2.blue ?? 0),
  };
}

function maxSet(set1: Required<SetResult>, set2: Required<SetResult>) {
  return {
    red: Math.max(set1.red, set2.red),
    green: Math.max(set1.green, set2.green),
    blue: Math.max(set1.blue, set2.blue),
  };
}

function parseValue(value: Buffer): SetResult {
  let number = 0;
  let readingDigits = true;
  // start at 1 to skip the initial space
  for (let i = 1; i < value.length; i++) {
    const val = value[i];
    if (readingDigits) {
      if (isNumber(val)) {
        number = number * 10 + val - 48;
      } else {
        readingDigits = false;
      }
    } else {
      const color = hashBytes(value.slice(i));
      if (color === 20315) {
        return { red: number };
      } else if (color === 43328) {
        return { green: number };
      } else {
        return { blue: number };
      }
    }
  }
  throw new Error("invalid value");
}

function parseSet(
  set: Buffer,
  action: (value: Buffer) => SetResult,
): Required<SetResult> {
  // the first char is a space, then  second should be a digit
  let start = 0;
  let setResult: Required<SetResult> = { red: 0, green: 0, blue: 0 };
  for (let i = 0; i < set.length; i++) {
    const index = until(set, start, isComma);
    setResult = mergeSets(setResult, action(set.slice(start, index)));
    i = index;
    start = i + 1;
  }
  return setResult;
}

function parseLine(
  line: Buffer,
  action: (value: Buffer) => Required<SetResult>,
): Required<SetResult>[] {
  let start = 0;
  let sets: Required<SetResult>[] = [];
  for (let i = 0; i < line.length; i++) {
    const index = until(line, start, isSemicolon);
    sets.push(action(line.slice(start, index)));
    i = index;
    start = i + 1;
  }
  return sets;
}

function validRound(o: Required<SetResult>) {
  return o.red <= 12 && o.green <= 13 && o.blue <= 14;
}

// part 1
async function byLines(stream: ReadStream) {
  let sum = 0;
  let j = 0;
  for await (const chunk of stream) {
    const ch = chunk as Buffer;
    let start = 0;
    for (let i = 0; i < ch.length && j <= 100; i++) {
      if (isColon(ch[i])) {
        start = i + 1;
        j++;
      } else if (isNewline(ch[i])) {
        if (
          testGame(
            ch.slice(start, i),
            parseLine,
            parseSet,
            parseValue,
            validRound,
          )
        ) {
          sum += j;
        }

        if (j === 100) {
          return sum;
        }
      }
    }
  }
  return sum;
}

// part2
async function byLines2(stream: ReadStream) {
  let sum = 0;
  let j = 0;
  for await (const chunk of stream) {
    const ch = chunk as Buffer;
    let start = 0;
    for (let i = 0; i < ch.length && j <= 100; i++) {
      if (isColon(ch[i])) {
        start = i + 1;
        j++;
      } else if (isNewline(ch[i])) {
        sum += powerOfSets(ch.slice(start, i), parseLine, parseSet, parseValue);

        if (j === 100) {
          return sum;
        }
      }
    }
  }
  return sum;
}
function testGame(
  buf: Buffer,
  line: LineFn,
  set: SetFn,
  value: ValueFn,
  predicate: (result: Required<SetResult>) => boolean,
): boolean {
  const setter = (b: Buffer) => {
    return set(b, value);
  };

  return line(buf, setter).every(predicate);
}

function powerOfSets(buf: Buffer, line: LineFn, set: SetFn, value: ValueFn) {
  const setter = (b: Buffer) => {
    return set(b, value);
  };

  return Object.values(
    line(buf, setter).reduce((pv, cv) => maxSet(pv, cv), {
      red: 0,
      green: 0,
      blue: 0,
    }),
  ).reduce((pv, cv) => pv * cv);
}

const stream = createReadStream("day2.data");
const stream2 = createReadStream("day2.data");
byLines(stream)
  .then((part1) => console.log({ part1 }))
  .catch(console.error);
byLines2(stream2)
  .then((part2) => console.log({ part2 }))
  .catch(console.error);
