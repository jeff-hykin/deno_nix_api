// https://deno.land/std@0.196.0/assert/assertion_error.ts
var AssertionError = class extends Error {
  name = "AssertionError";
  constructor(message) {
    super(message);
  }
};

// https://deno.land/std@0.196.0/assert/equal.ts
function isKeyedCollection(x) {
  return [Symbol.iterator, "size"].every((k) => k in x);
}
function constructorsEqual(a, b) {
  return a.constructor === b.constructor || a.constructor === Object && !b.constructor || !a.constructor && b.constructor === Object;
}
function equal(c, d) {
  const seen = /* @__PURE__ */ new Map();
  return function compare(a, b) {
    if (a && b && (a instanceof RegExp && b instanceof RegExp || a instanceof URL && b instanceof URL)) {
      return String(a) === String(b);
    }
    if (a instanceof Date && b instanceof Date) {
      const aTime = a.getTime();
      const bTime = b.getTime();
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
        return true;
      }
      return aTime === bTime;
    }
    if (typeof a === "number" && typeof b === "number") {
      return Number.isNaN(a) && Number.isNaN(b) || a === b;
    }
    if (Object.is(a, b)) {
      return true;
    }
    if (a && typeof a === "object" && b && typeof b === "object") {
      if (a && b && !constructorsEqual(a, b)) {
        return false;
      }
      if (a instanceof WeakMap || b instanceof WeakMap) {
        if (!(a instanceof WeakMap && b instanceof WeakMap)) return false;
        throw new TypeError("cannot compare WeakMap instances");
      }
      if (a instanceof WeakSet || b instanceof WeakSet) {
        if (!(a instanceof WeakSet && b instanceof WeakSet)) return false;
        throw new TypeError("cannot compare WeakSet instances");
      }
      if (seen.get(a) === b) {
        return true;
      }
      if (Object.keys(a || {}).length !== Object.keys(b || {}).length) {
        return false;
      }
      seen.set(a, b);
      if (isKeyedCollection(a) && isKeyedCollection(b)) {
        if (a.size !== b.size) {
          return false;
        }
        let unmatchedEntries = a.size;
        for (const [aKey, aValue] of a.entries()) {
          for (const [bKey, bValue] of b.entries()) {
            if (aKey === aValue && bKey === bValue && compare(aKey, bKey) || compare(aKey, bKey) && compare(aValue, bValue)) {
              unmatchedEntries--;
              break;
            }
          }
        }
        return unmatchedEntries === 0;
      }
      const merged = { ...a, ...b };
      for (const key of [
        ...Object.getOwnPropertyNames(merged),
        ...Object.getOwnPropertySymbols(merged)
      ]) {
        if (!compare(a && a[key], b && b[key])) {
          return false;
        }
        if (key in a && !(key in b) || key in b && !(key in a)) {
          return false;
        }
      }
      if (a instanceof WeakRef || b instanceof WeakRef) {
        if (!(a instanceof WeakRef && b instanceof WeakRef)) return false;
        return compare(a.deref(), b.deref());
      }
      return true;
    }
    return false;
  }(c, d);
}

// https://deno.land/std@0.196.0/assert/_format.ts
function format(v) {
  const { Deno: Deno2 } = globalThis;
  return typeof Deno2?.inspect === "function" ? Deno2.inspect(v, {
    depth: Infinity,
    sorted: true,
    trailingComma: true,
    compact: false,
    iterableLimit: Infinity,
    // getters should be true in assertEquals.
    getters: true
  }) : `"${String(v).replace(/(?=["\\])/g, "\\")}"`;
}

// https://deno.land/std@0.196.0/fmt/colors.ts
var { Deno } = globalThis;
var noColor = typeof Deno?.noColor === "boolean" ? Deno.noColor : false;
var enabled = !noColor;
function code(open, close) {
  return {
    open: `\x1B[${open.join(";")}m`,
    close: `\x1B[${close}m`,
    regexp: new RegExp(`\\x1b\\[${close}m`, "g")
  };
}
function run(str, code2) {
  return enabled ? `${code2.open}${str.replace(code2.regexp, code2.open)}${code2.close}` : str;
}
function bold(str) {
  return run(str, code([1], 22));
}
function red(str) {
  return run(str, code([31], 39));
}
function green(str) {
  return run(str, code([32], 39));
}
function white(str) {
  return run(str, code([37], 39));
}
function gray(str) {
  return brightBlack(str);
}
function brightBlack(str) {
  return run(str, code([90], 39));
}
function bgRed(str) {
  return run(str, code([41], 49));
}
function bgGreen(str) {
  return run(str, code([42], 49));
}
var ANSI_PATTERN = new RegExp(
  [
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"
  ].join("|"),
  "g"
);
function stripColor(string) {
  return string.replace(ANSI_PATTERN, "");
}

// https://deno.land/std@0.196.0/_util/diff.ts
var REMOVED = 1;
var COMMON = 2;
var ADDED = 3;
function createCommon(A, B, reverse) {
  const common = [];
  if (A.length === 0 || B.length === 0) return [];
  for (let i = 0; i < Math.min(A.length, B.length); i += 1) {
    if (A[reverse ? A.length - i - 1 : i] === B[reverse ? B.length - i - 1 : i]) {
      common.push(A[reverse ? A.length - i - 1 : i]);
    } else {
      return common;
    }
  }
  return common;
}
function diff(A, B) {
  const prefixCommon = createCommon(A, B);
  const suffixCommon = createCommon(
    A.slice(prefixCommon.length),
    B.slice(prefixCommon.length),
    true
  ).reverse();
  A = suffixCommon.length ? A.slice(prefixCommon.length, -suffixCommon.length) : A.slice(prefixCommon.length);
  B = suffixCommon.length ? B.slice(prefixCommon.length, -suffixCommon.length) : B.slice(prefixCommon.length);
  const swapped = B.length > A.length;
  [A, B] = swapped ? [B, A] : [A, B];
  const M = A.length;
  const N = B.length;
  if (!M && !N && !suffixCommon.length && !prefixCommon.length) return [];
  if (!N) {
    return [
      ...prefixCommon.map(
        (c) => ({ type: "common" /* common */, value: c })
      ),
      ...A.map(
        (a) => ({
          type: swapped ? "added" /* added */ : "removed" /* removed */,
          value: a
        })
      ),
      ...suffixCommon.map(
        (c) => ({ type: "common" /* common */, value: c })
      )
    ];
  }
  const offset = N;
  const delta = M - N;
  const size = M + N + 1;
  const fp = Array.from(
    { length: size },
    () => ({ y: -1, id: -1 })
  );
  const routes = new Uint32Array((M * N + size + 1) * 2);
  const diffTypesPtrOffset = routes.length / 2;
  let ptr = 0;
  let p = -1;
  function backTrace(A2, B2, current, swapped2) {
    const M2 = A2.length;
    const N2 = B2.length;
    const result = [];
    let a = M2 - 1;
    let b = N2 - 1;
    let j = routes[current.id];
    let type = routes[current.id + diffTypesPtrOffset];
    while (true) {
      if (!j && !type) break;
      const prev = j;
      if (type === REMOVED) {
        result.unshift({
          type: swapped2 ? "removed" /* removed */ : "added" /* added */,
          value: B2[b]
        });
        b -= 1;
      } else if (type === ADDED) {
        result.unshift({
          type: swapped2 ? "added" /* added */ : "removed" /* removed */,
          value: A2[a]
        });
        a -= 1;
      } else {
        result.unshift({ type: "common" /* common */, value: A2[a] });
        a -= 1;
        b -= 1;
      }
      j = routes[prev];
      type = routes[prev + diffTypesPtrOffset];
    }
    return result;
  }
  function createFP(slide, down, k, M2) {
    if (slide && slide.y === -1 && down && down.y === -1) {
      return { y: 0, id: 0 };
    }
    if (down && down.y === -1 || k === M2 || (slide && slide.y) > (down && down.y) + 1) {
      const prev = slide.id;
      ptr++;
      routes[ptr] = prev;
      routes[ptr + diffTypesPtrOffset] = ADDED;
      return { y: slide.y, id: ptr };
    } else {
      const prev = down.id;
      ptr++;
      routes[ptr] = prev;
      routes[ptr + diffTypesPtrOffset] = REMOVED;
      return { y: down.y + 1, id: ptr };
    }
  }
  function snake(k, slide, down, _offset, A2, B2) {
    const M2 = A2.length;
    const N2 = B2.length;
    if (k < -N2 || M2 < k) return { y: -1, id: -1 };
    const fp2 = createFP(slide, down, k, M2);
    while (fp2.y + k < M2 && fp2.y < N2 && A2[fp2.y + k] === B2[fp2.y]) {
      const prev = fp2.id;
      ptr++;
      fp2.id = ptr;
      fp2.y += 1;
      routes[ptr] = prev;
      routes[ptr + diffTypesPtrOffset] = COMMON;
    }
    return fp2;
  }
  while (fp[delta + offset].y < N) {
    p = p + 1;
    for (let k = -p; k < delta; ++k) {
      fp[k + offset] = snake(
        k,
        fp[k - 1 + offset],
        fp[k + 1 + offset],
        offset,
        A,
        B
      );
    }
    for (let k = delta + p; k > delta; --k) {
      fp[k + offset] = snake(
        k,
        fp[k - 1 + offset],
        fp[k + 1 + offset],
        offset,
        A,
        B
      );
    }
    fp[delta + offset] = snake(
      delta,
      fp[delta - 1 + offset],
      fp[delta + 1 + offset],
      offset,
      A,
      B
    );
  }
  return [
    ...prefixCommon.map(
      (c) => ({ type: "common" /* common */, value: c })
    ),
    ...backTrace(A, B, fp[delta + offset], swapped),
    ...suffixCommon.map(
      (c) => ({ type: "common" /* common */, value: c })
    )
  ];
}
function diffstr(A, B) {
  function unescape(string) {
    return string.replaceAll("\b", "\\b").replaceAll("\f", "\\f").replaceAll("	", "\\t").replaceAll("\v", "\\v").replaceAll(
      // does not remove line breaks
      /\r\n|\r|\n/g,
      (str) => str === "\r" ? "\\r" : str === "\n" ? "\\n\n" : "\\r\\n\r\n"
    );
  }
  function tokenize(string, { wordDiff = false } = {}) {
    if (wordDiff) {
      const tokens = string.split(/([^\S\r\n]+|[()[\]{}'"\r\n]|\b)/);
      const words = /^[a-zA-Z\u{C0}-\u{FF}\u{D8}-\u{F6}\u{F8}-\u{2C6}\u{2C8}-\u{2D7}\u{2DE}-\u{2FF}\u{1E00}-\u{1EFF}]+$/u;
      for (let i = 0; i < tokens.length - 1; i++) {
        if (!tokens[i + 1] && tokens[i + 2] && words.test(tokens[i]) && words.test(tokens[i + 2])) {
          tokens[i] += tokens[i + 2];
          tokens.splice(i + 1, 2);
          i--;
        }
      }
      return tokens.filter((token) => token);
    } else {
      const tokens = [], lines = string.split(/(\n|\r\n)/);
      if (!lines[lines.length - 1]) {
        lines.pop();
      }
      for (let i = 0; i < lines.length; i++) {
        if (i % 2) {
          tokens[tokens.length - 1] += lines[i];
        } else {
          tokens.push(lines[i]);
        }
      }
      return tokens;
    }
  }
  function createDetails(line, tokens) {
    return tokens.filter(
      ({ type }) => type === line.type || type === "common" /* common */
    ).map((result, i, t) => {
      if (result.type === "common" /* common */ && t[i - 1] && t[i - 1]?.type === t[i + 1]?.type && /\s+/.test(result.value)) {
        return {
          ...result,
          type: t[i - 1].type
        };
      }
      return result;
    });
  }
  const diffResult = diff(
    tokenize(`${unescape(A)}
`),
    tokenize(`${unescape(B)}
`)
  );
  const added = [], removed = [];
  for (const result of diffResult) {
    if (result.type === "added" /* added */) {
      added.push(result);
    }
    if (result.type === "removed" /* removed */) {
      removed.push(result);
    }
  }
  const aLines = added.length < removed.length ? added : removed;
  const bLines = aLines === removed ? added : removed;
  for (const a of aLines) {
    let tokens = [], b;
    while (bLines.length) {
      b = bLines.shift();
      tokens = diff(
        tokenize(a.value, { wordDiff: true }),
        tokenize(b?.value ?? "", { wordDiff: true })
      );
      if (tokens.some(
        ({ type, value }) => type === "common" /* common */ && value.trim().length
      )) {
        break;
      }
    }
    a.details = createDetails(a, tokens);
    if (b) {
      b.details = createDetails(b, tokens);
    }
  }
  return diffResult;
}
function createColor(diffType, { background = false } = {}) {
  background = false;
  switch (diffType) {
    case "added" /* added */:
      return (s) => background ? bgGreen(white(s)) : green(bold(s));
    case "removed" /* removed */:
      return (s) => background ? bgRed(white(s)) : red(bold(s));
    default:
      return white;
  }
}
function createSign(diffType) {
  switch (diffType) {
    case "added" /* added */:
      return "+   ";
    case "removed" /* removed */:
      return "-   ";
    default:
      return "    ";
  }
}
function buildMessage(diffResult, { stringDiff = false } = {}) {
  const messages = [], diffMessages = [];
  messages.push("");
  messages.push("");
  messages.push(
    `    ${gray(bold("[Diff]"))} ${red(bold("Actual"))} / ${green(bold("Expected"))}`
  );
  messages.push("");
  messages.push("");
  diffResult.forEach((result) => {
    const c = createColor(result.type);
    const line = result.details?.map(
      (detail) => detail.type !== "common" /* common */ ? createColor(detail.type, { background: true })(detail.value) : detail.value
    ).join("") ?? result.value;
    diffMessages.push(c(`${createSign(result.type)}${line}`));
  });
  messages.push(...stringDiff ? [diffMessages.join("")] : diffMessages);
  messages.push("");
  return messages;
}

// https://deno.land/std@0.196.0/assert/_constants.ts
var CAN_NOT_DISPLAY = "[Cannot display]";

// https://deno.land/std@0.196.0/assert/assert_equals.ts
function assertEquals(actual, expected, msg) {
  if (equal(actual, expected)) {
    return;
  }
  const msgSuffix = msg ? `: ${msg}` : ".";
  let message = `Values are not equal${msgSuffix}`;
  const actualString = format(actual);
  const expectedString = format(expected);
  try {
    const stringDiff = typeof actual === "string" && typeof expected === "string";
    const diffResult = stringDiff ? diffstr(actual, expected) : diff(actualString.split("\n"), expectedString.split("\n"));
    const diffMsg = buildMessage(diffResult, { stringDiff }).join("\n");
    message = `${message}
${diffMsg}`;
  } catch {
    message = `${message}
${red(CAN_NOT_DISPLAY)} + 

`;
  }
  throw new AssertionError(message);
}

// https://deno.land/std@0.196.0/assert/assert_is_error.ts
function assertIsError(error, ErrorClass, msgIncludes, msg) {
  const msgSuffix = msg ? `: ${msg}` : ".";
  if (error instanceof Error === false) {
    throw new AssertionError(
      `Expected "error" to be an Error object${msgSuffix}}`
    );
  }
  if (ErrorClass && !(error instanceof ErrorClass)) {
    msg = `Expected error to be instance of "${ErrorClass.name}", but was "${typeof error === "object" ? error?.constructor?.name : "[not an object]"}"${msgSuffix}`;
    throw new AssertionError(msg);
  }
  if (msgIncludes && (!(error instanceof Error) || !stripColor(error.message).includes(stripColor(msgIncludes)))) {
    msg = `Expected error message to include "${msgIncludes}", but got "${error instanceof Error ? error.message : "[not an Error]"}"${msgSuffix}`;
    throw new AssertionError(msg);
  }
}

// https://deno.land/std@0.196.0/assert/assert_rejects.ts
async function assertRejects(fn, errorClassOrMsg, msgIncludesOrMsg, msg) {
  let ErrorClass = void 0;
  let msgIncludes = void 0;
  let err;
  if (typeof errorClassOrMsg !== "string") {
    if (errorClassOrMsg === void 0 || errorClassOrMsg.prototype instanceof Error || errorClassOrMsg.prototype === Error.prototype) {
      ErrorClass = errorClassOrMsg;
      msgIncludes = msgIncludesOrMsg;
    }
  } else {
    msg = errorClassOrMsg;
  }
  let doesThrow = false;
  let isPromiseReturned = false;
  const msgSuffix = msg ? `: ${msg}` : ".";
  try {
    const possiblePromise = fn();
    if (possiblePromise && typeof possiblePromise === "object" && typeof possiblePromise.then === "function") {
      isPromiseReturned = true;
      await possiblePromise;
    }
  } catch (error) {
    if (!isPromiseReturned) {
      throw new AssertionError(
        `Function throws when expected to reject${msgSuffix}`
      );
    }
    if (ErrorClass) {
      if (error instanceof Error === false) {
        throw new AssertionError(`A non-Error object was rejected${msgSuffix}`);
      }
      assertIsError(
        error,
        ErrorClass,
        msgIncludes,
        msg
      );
    }
    err = error;
    doesThrow = true;
  }
  if (!doesThrow) {
    throw new AssertionError(
      `Expected function to reject${msgSuffix}`
    );
  }
  return err;
}

// https://deno.land/std@0.196.0/testing/mock.ts
var MockError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "MockError";
  }
};
function functionSpy(func) {
  const original = func ?? (() => {
  }), calls = [];
  const spy2 = function(...args) {
    const call = { args };
    if (this) call.self = this;
    try {
      call.returned = original.apply(this, args);
    } catch (error) {
      call.error = error;
      calls.push(call);
      throw error;
    }
    calls.push(call);
    return call.returned;
  };
  Object.defineProperties(spy2, {
    original: {
      enumerable: true,
      value: original
    },
    calls: {
      enumerable: true,
      value: calls
    },
    restored: {
      enumerable: true,
      get: () => false
    },
    restore: {
      enumerable: true,
      value: () => {
        throw new MockError("function cannot be restored");
      }
    }
  });
  return spy2;
}
function isSpy(func) {
  const spy2 = func;
  return typeof spy2 === "function" && typeof spy2.original === "function" && typeof spy2.restored === "boolean" && typeof spy2.restore === "function" && Array.isArray(spy2.calls);
}
var sessions = [];
function getSession() {
  if (sessions.length === 0) sessions.push(/* @__PURE__ */ new Set());
  return sessions[sessions.length - 1];
}
function registerMock(spy2) {
  const session = getSession();
  session.add(spy2);
}
function unregisterMock(spy2) {
  const session = getSession();
  session.delete(spy2);
}
function mockSession(func) {
  if (func) {
    return function(...args) {
      const id = sessions.length;
      sessions.push(/* @__PURE__ */ new Set());
      try {
        return func.apply(this, args);
      } finally {
        restore(id);
      }
    };
  } else {
    sessions.push(/* @__PURE__ */ new Set());
    return sessions.length - 1;
  }
}
function mockSessionAsync(func) {
  return async function(...args) {
    const id = sessions.length;
    sessions.push(/* @__PURE__ */ new Set());
    try {
      return await func.apply(this, args);
    } finally {
      restore(id);
    }
  };
}
function restore(id) {
  id ??= (sessions.length || 1) - 1;
  while (id < sessions.length) {
    const session = sessions.pop();
    if (session) {
      for (const value of session) {
        value.restore();
      }
    }
  }
}
function methodSpy(self, property) {
  if (typeof self[property] !== "function") {
    throw new MockError("property is not an instance method");
  }
  if (isSpy(self[property])) {
    throw new MockError("already spying on instance method");
  }
  const propertyDescriptor = Object.getOwnPropertyDescriptor(self, property);
  if (propertyDescriptor && !propertyDescriptor.configurable) {
    throw new MockError("cannot spy on non configurable instance method");
  }
  const original = self[property], calls = [];
  let restored = false;
  const spy2 = function(...args) {
    const call = { args };
    if (this) call.self = this;
    try {
      call.returned = original.apply(this, args);
    } catch (error) {
      call.error = error;
      calls.push(call);
      throw error;
    }
    calls.push(call);
    return call.returned;
  };
  Object.defineProperties(spy2, {
    original: {
      enumerable: true,
      value: original
    },
    calls: {
      enumerable: true,
      value: calls
    },
    restored: {
      enumerable: true,
      get: () => restored
    },
    restore: {
      enumerable: true,
      value: () => {
        if (restored) {
          throw new MockError("instance method already restored");
        }
        if (propertyDescriptor) {
          Object.defineProperty(self, property, propertyDescriptor);
        } else {
          delete self[property];
        }
        restored = true;
        unregisterMock(spy2);
      }
    }
  });
  Object.defineProperty(self, property, {
    configurable: true,
    enumerable: propertyDescriptor?.enumerable,
    writable: propertyDescriptor?.writable,
    value: spy2
  });
  registerMock(spy2);
  return spy2;
}
function spy(funcOrSelf, property) {
  const spy2 = typeof property !== "undefined" ? methodSpy(funcOrSelf, property) : typeof funcOrSelf === "function" ? functionSpy(
    funcOrSelf
  ) : functionSpy();
  return spy2;
}
function stub(self, property, func) {
  if (self[property] !== void 0 && typeof self[property] !== "function") {
    throw new MockError("property is not an instance method");
  }
  if (isSpy(self[property])) {
    throw new MockError("already spying on instance method");
  }
  const propertyDescriptor = Object.getOwnPropertyDescriptor(self, property);
  if (propertyDescriptor && !propertyDescriptor.configurable) {
    throw new MockError("cannot spy on non configurable instance method");
  }
  const fake = func ?? (() => {
  });
  const original = self[property], calls = [];
  let restored = false;
  const stub2 = function(...args) {
    const call = { args };
    if (this) call.self = this;
    try {
      call.returned = fake.apply(this, args);
    } catch (error) {
      call.error = error;
      calls.push(call);
      throw error;
    }
    calls.push(call);
    return call.returned;
  };
  Object.defineProperties(stub2, {
    original: {
      enumerable: true,
      value: original
    },
    fake: {
      enumerable: true,
      value: fake
    },
    calls: {
      enumerable: true,
      value: calls
    },
    restored: {
      enumerable: true,
      get: () => restored
    },
    restore: {
      enumerable: true,
      value: () => {
        if (restored) {
          throw new MockError("instance method already restored");
        }
        if (propertyDescriptor) {
          Object.defineProperty(self, property, propertyDescriptor);
        } else {
          delete self[property];
        }
        restored = true;
        unregisterMock(stub2);
      }
    }
  });
  Object.defineProperty(self, property, {
    configurable: true,
    enumerable: propertyDescriptor?.enumerable,
    writable: propertyDescriptor?.writable,
    value: stub2
  });
  registerMock(stub2);
  return stub2;
}
function assertSpyCalls(spy2, expectedCalls) {
  try {
    assertEquals(spy2.calls.length, expectedCalls);
  } catch (e) {
    assertIsError(e);
    let message = spy2.calls.length < expectedCalls ? "spy not called as much as expected:\n" : "spy called more than expected:\n";
    message += e.message.split("\n").slice(1).join("\n");
    throw new AssertionError(message);
  }
}
function assertSpyCall(spy2, callIndex, expected) {
  if (spy2.calls.length < callIndex + 1) {
    throw new AssertionError("spy not called as much as expected");
  }
  const call = spy2.calls[callIndex];
  if (expected) {
    if (expected.args) {
      try {
        assertEquals(call.args, expected.args);
      } catch (e) {
        assertIsError(e);
        throw new AssertionError(
          "spy not called with expected args:\n" + e.message.split("\n").slice(1).join("\n")
        );
      }
    }
    if ("self" in expected) {
      try {
        assertEquals(call.self, expected.self);
      } catch (e) {
        assertIsError(e);
        let message = expected.self ? "spy not called as method on expected self:\n" : "spy not expected to be called as method on object:\n";
        message += e.message.split("\n").slice(1).join("\n");
        throw new AssertionError(message);
      }
    }
    if ("returned" in expected) {
      if ("error" in expected) {
        throw new TypeError(
          "do not expect error and return, only one should be expected"
        );
      }
      if (call.error) {
        throw new AssertionError(
          "spy call did not return expected value, an error was thrown."
        );
      }
      try {
        assertEquals(call.returned, expected.returned);
      } catch (e) {
        assertIsError(e);
        throw new AssertionError(
          "spy call did not return expected value:\n" + e.message.split("\n").slice(1).join("\n")
        );
      }
    }
    if ("error" in expected) {
      if ("returned" in call) {
        throw new AssertionError(
          "spy call did not throw an error, a value was returned."
        );
      }
      assertIsError(
        call.error,
        expected.error?.Class,
        expected.error?.msgIncludes
      );
    }
  }
}
async function assertSpyCallAsync(spy2, callIndex, expected) {
  const expectedSync = expected && { ...expected };
  if (expectedSync) {
    delete expectedSync.returned;
    delete expectedSync.error;
  }
  assertSpyCall(spy2, callIndex, expectedSync);
  const call = spy2.calls[callIndex];
  if (call.error) {
    throw new AssertionError(
      "spy call did not return a promise, an error was thrown."
    );
  }
  if (call.returned !== Promise.resolve(call.returned)) {
    throw new AssertionError(
      "spy call did not return a promise, a value was returned."
    );
  }
  if (expected) {
    if ("returned" in expected) {
      if ("error" in expected) {
        throw new TypeError(
          "do not expect error and return, only one should be expected"
        );
      }
      if (call.error) {
        throw new AssertionError(
          "spy call did not return expected value, an error was thrown."
        );
      }
      let expectedResolved;
      try {
        expectedResolved = await expected.returned;
      } catch {
        throw new TypeError(
          "do not expect rejected promise, expect error instead"
        );
      }
      let resolved;
      try {
        resolved = await call.returned;
      } catch {
        throw new AssertionError("spy call returned promise was rejected");
      }
      try {
        assertEquals(resolved, expectedResolved);
      } catch (e) {
        assertIsError(e);
        throw new AssertionError(
          "spy call did not resolve to expected value:\n" + e.message.split("\n").slice(1).join("\n")
        );
      }
    }
    if ("error" in expected) {
      await assertRejects(
        () => Promise.resolve(call.returned),
        expected.error?.Class ?? Error,
        expected.error?.msgIncludes ?? ""
      );
    }
  }
}
function assertSpyCallArg(spy2, callIndex, argIndex, expected) {
  assertSpyCall(spy2, callIndex);
  const call = spy2.calls[callIndex];
  const arg = call.args[argIndex];
  assertEquals(arg, expected);
  return arg;
}
function assertSpyCallArgs(spy2, callIndex, argsStart, argsEnd, expected) {
  assertSpyCall(spy2, callIndex);
  const call = spy2.calls[callIndex];
  if (!expected) {
    expected = argsEnd;
    argsEnd = void 0;
  }
  if (!expected) {
    expected = argsStart;
    argsStart = void 0;
  }
  const args = typeof argsEnd === "number" ? call.args.slice(argsStart, argsEnd) : typeof argsStart === "number" ? call.args.slice(argsStart) : call.args;
  assertEquals(args, expected);
  return args;
}
function returnsThis() {
  return function() {
    return this;
  };
}
function returnsArg(idx) {
  return function(...args) {
    return args[idx];
  };
}
function returnsArgs(start = 0, end) {
  return function(...args) {
    return args.slice(start, end);
  };
}
function returnsNext(values) {
  const gen = function* returnsValue() {
    yield* values;
  }();
  let calls = 0;
  return function() {
    const next = gen.next();
    if (next.done) {
      throw new MockError(`not expected to be called more than ${calls} times`);
    }
    calls++;
    const { value } = next;
    if (value instanceof Error) throw value;
    return value;
  };
}
function resolvesNext(iterable) {
  const gen = async function* returnsValue() {
    yield* iterable;
  }();
  let calls = 0;
  return async function() {
    const next = await gen.next();
    if (next.done) {
      throw new MockError(`not expected to be called more than ${calls} times`);
    }
    calls++;
    const { value } = next;
    if (value instanceof Error) throw value;
    return value;
  };
}
export {
  MockError,
  assertSpyCall,
  assertSpyCallArg,
  assertSpyCallArgs,
  assertSpyCallAsync,
  assertSpyCalls,
  mockSession,
  mockSessionAsync,
  resolvesNext,
  restore,
  returnsArg,
  returnsArgs,
  returnsNext,
  returnsThis,
  spy,
  stub
};
