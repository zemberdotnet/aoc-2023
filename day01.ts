import { ReadStream, createReadStream } from 'fs';

type Blob = Buffer | Uint8Array;
// true indicates a valid, but partial state
// number indicates a valid number and finished state
type States = Map<number, number | true>;

function elegantPair(x: number, y: number) {
  if (x >= y) {
    return y * y + x;
  } else {
    return x * x + x + y;
  }
}

function createStatesLookup(): States {
  const states = new Map();
  const digits = [
    'zero',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
  ];

  for (let i = 0; i < digits.length; i++) {
    const digit = digits.at(i)!;
    let sum = 0;
    for (let j = 0; j < digit.length; j++) {
      sum = elegantPair(sum, digit.charCodeAt(j));
      states.set(sum, j === digit.length - 1 ? i : true);
    }
  }
  return states;
}

function isNumber(val: number) {
  return val >= 48 && val <= 57;
}

function bton(n1: number, n2: number) {
  return n1 * 10 + n2;
}

function tallier(states: Map<number, number | true>) {
  function tallyLine(s: Blob) {
    let n1: number | undefined = undefined;
    let n2: number | undefined = undefined;

    const assign = (n: number) => {
      if (n1 === undefined) {
        n1 = n;
        n2 = n;
      } else {
        n2 = n;
      }
    };

    for (let i = 0; i < s.length; i++) {
      let state = 0;
      for (let j = i; j < s.length; j++) {
        const cv = s[j];

        if (isNumber(cv)) {
          assign(cv - 48);
        }

        state = elegantPair(state, cv);
        const res = states.get(state);
        if (res === undefined) {
          break;
        }

        if (res === true) {
          continue;
        } else if (res >= 0 && res <= 9) {
          assign(res);
        }
      }
    }
    return bton(n1!, n2!);
  }
  return tallyLine;
}

function join(a: Blob, b: Blob) {
  const r = new Uint8Array(a.length + b.length);
  r.set(a);
  r.set(b, a.length);
  return r;
}

async function byLine(
  stream: ReadStream,
  action: (line: Blob) => number
): Promise<number> {
  let sum = 0;
  // overflow from a chunk
  let extra: Uint8Array = new Uint8Array();
  for await (const chunk of stream) {
    const ch = chunk as Blob;
    let start = 0;
    for (let i = 0; i < ch.length; i++) {
      if (ch[i] === 10) {
        if (extra.length) {
          const combo = join(extra, ch.slice(start, i));
          sum += action(combo);
        } else {
          sum += action(ch.slice(start, i));
        }
        start = i + 1;
      }
    }
  }
  return sum;
}

const stream = createReadStream('data');
const states = createStatesLookup();
const tallyFn = tallier(states);
byLine(stream, tallyFn).then(console.log).catch(console.error);
