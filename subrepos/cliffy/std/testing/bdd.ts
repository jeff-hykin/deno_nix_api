// https://deno.land/std@0.196.0/testing/_test_suite.ts
var optionalTestDefinitionKeys = [
  "only",
  "permissions",
  "ignore",
  "sanitizeExit",
  "sanitizeOps",
  "sanitizeResources"
];
var optionalTestStepDefinitionKeys = [
  "ignore",
  "sanitizeExit",
  "sanitizeOps",
  "sanitizeResources"
];
var TestSuiteInternal = class _TestSuiteInternal {
  symbol;
  describe;
  steps;
  hasOnlyStep;
  constructor(describe2) {
    this.describe = describe2;
    this.steps = [];
    this.hasOnlyStep = false;
    const { suite } = describe2;
    if (suite && !_TestSuiteInternal.suites.has(suite.symbol)) {
      throw new Error("suite does not represent a registered test suite");
    }
    const testSuite = suite ? _TestSuiteInternal.suites.get(suite.symbol) : _TestSuiteInternal.current;
    this.symbol = Symbol();
    _TestSuiteInternal.suites.set(this.symbol, this);
    const { fn } = describe2;
    if (fn) {
      const temp = _TestSuiteInternal.current;
      _TestSuiteInternal.current = this;
      try {
        fn();
      } finally {
        _TestSuiteInternal.current = temp;
      }
    }
    if (testSuite) {
      _TestSuiteInternal.addStep(testSuite, this);
    } else {
      const {
        name,
        ignore,
        permissions,
        sanitizeExit,
        sanitizeOps,
        sanitizeResources
      } = describe2;
      let { only } = describe2;
      if (!ignore && this.hasOnlyStep) {
        only = true;
      }
      _TestSuiteInternal.registerTest({
        name,
        ignore,
        only,
        permissions,
        sanitizeExit,
        sanitizeOps,
        sanitizeResources,
        fn: async (t) => {
          _TestSuiteInternal.runningCount++;
          try {
            const context = {};
            const { beforeAll: beforeAll2 } = this.describe;
            if (typeof beforeAll2 === "function") {
              await beforeAll2.call(context);
            } else if (beforeAll2) {
              for (const hook of beforeAll2) {
                await hook.call(context);
              }
            }
            try {
              _TestSuiteInternal.active.push(this.symbol);
              await _TestSuiteInternal.run(this, context, t);
            } finally {
              _TestSuiteInternal.active.pop();
              const { afterAll: afterAll2 } = this.describe;
              if (typeof afterAll2 === "function") {
                await afterAll2.call(context);
              } else if (afterAll2) {
                for (const hook of afterAll2) {
                  await hook.call(context);
                }
              }
            }
          } finally {
            _TestSuiteInternal.runningCount--;
          }
        }
      });
    }
  }
  /** Stores how many test suites are executing. */
  static runningCount = 0;
  /** If a test has been registered yet. Block adding global hooks if a test has been registered. */
  static started = false;
  /** A map of all test suites by symbol. */
  // deno-lint-ignore no-explicit-any
  static suites = /* @__PURE__ */ new Map();
  /** The current test suite being registered. */
  // deno-lint-ignore no-explicit-any
  static current = null;
  /** The stack of tests that are actively running. */
  static active = [];
  /** This is used internally for testing this module. */
  static reset() {
    _TestSuiteInternal.runningCount = 0;
    _TestSuiteInternal.started = false;
    _TestSuiteInternal.current = null;
    _TestSuiteInternal.active = [];
  }
  /** This is used internally to register tests. */
  static registerTest(options) {
    options = { ...options };
    optionalTestDefinitionKeys.forEach((key) => {
      if (typeof options[key] === "undefined") delete options[key];
    });
    Deno.test(options);
  }
  /** Updates all steps within top level suite to have ignore set to true if only is not set to true on step. */
  static addingOnlyStep(suite) {
    if (!suite.hasOnlyStep) {
      for (let i = 0; i < suite.steps.length; i++) {
        const step = suite.steps[i];
        if (!(step instanceof _TestSuiteInternal) && !step.only) {
          suite.steps.splice(i--, 1);
        }
      }
      suite.hasOnlyStep = true;
    }
    const parentSuite = suite.describe.suite;
    const parentTestSuite = parentSuite && _TestSuiteInternal.suites.get(parentSuite.symbol);
    if (parentTestSuite) {
      _TestSuiteInternal.addingOnlyStep(parentTestSuite);
    }
  }
  /** This is used internally to add steps to a test suite. */
  static addStep(suite, step) {
    if (!suite.hasOnlyStep) {
      if (step instanceof _TestSuiteInternal) {
        if (step.hasOnlyStep || step.describe.only) {
          _TestSuiteInternal.addingOnlyStep(suite);
        }
      } else {
        if (step.only) _TestSuiteInternal.addingOnlyStep(suite);
      }
    }
    if (!(suite.hasOnlyStep && !(step instanceof _TestSuiteInternal) && !step.only)) {
      suite.steps.push(step);
    }
  }
  /** This is used internally to add hooks to a test suite. */
  static setHook(suite, name, fn) {
    if (suite.describe[name]) {
      if (typeof suite.describe[name] === "function") {
        suite.describe[name] = [
          suite.describe[name]
        ];
      }
      suite.describe[name].push(fn);
    } else {
      suite.describe[name] = fn;
    }
  }
  /** This is used internally to run all steps for a test suite. */
  static async run(suite, context, t) {
    const hasOnly = suite.hasOnlyStep || suite.describe.only || false;
    for (const step of suite.steps) {
      if (hasOnly && step instanceof _TestSuiteInternal && !(step.hasOnlyStep || step.describe.only || false)) {
        continue;
      }
      const {
        name,
        fn,
        ignore,
        permissions,
        sanitizeExit,
        sanitizeOps,
        sanitizeResources
      } = step instanceof _TestSuiteInternal ? step.describe : step;
      const options = {
        name,
        ignore,
        sanitizeExit,
        sanitizeOps,
        sanitizeResources,
        fn: async (t2) => {
          if (permissions) {
            throw new Error(
              "permissions option not available for nested tests"
            );
          }
          context = { ...context };
          if (step instanceof _TestSuiteInternal) {
            const { beforeAll: beforeAll2 } = step.describe;
            if (typeof beforeAll2 === "function") {
              await beforeAll2.call(context);
            } else if (beforeAll2) {
              for (const hook of beforeAll2) {
                await hook.call(context);
              }
            }
            try {
              _TestSuiteInternal.active.push(step.symbol);
              await _TestSuiteInternal.run(step, context, t2);
            } finally {
              _TestSuiteInternal.active.pop();
              const { afterAll: afterAll2 } = step.describe;
              if (typeof afterAll2 === "function") {
                await afterAll2.call(context);
              } else if (afterAll2) {
                for (const hook of afterAll2) {
                  await hook.call(context);
                }
              }
            }
          } else {
            await _TestSuiteInternal.runTest(t2, fn, context);
          }
        }
      };
      optionalTestStepDefinitionKeys.forEach((key) => {
        if (typeof options[key] === "undefined") delete options[key];
      });
      await t.step(options);
    }
  }
  static async runTest(t, fn, context, activeIndex = 0) {
    const suite = _TestSuiteInternal.active[activeIndex];
    const testSuite = suite && _TestSuiteInternal.suites.get(suite);
    if (testSuite) {
      if (activeIndex === 0) context = { ...context };
      const { beforeEach: beforeEach2 } = testSuite.describe;
      if (typeof beforeEach2 === "function") {
        await beforeEach2.call(context);
      } else if (beforeEach2) {
        for (const hook of beforeEach2) {
          await hook.call(context);
        }
      }
      try {
        await _TestSuiteInternal.runTest(t, fn, context, activeIndex + 1);
      } finally {
        const { afterEach: afterEach2 } = testSuite.describe;
        if (typeof afterEach2 === "function") {
          await afterEach2.call(context);
        } else if (afterEach2) {
          for (const hook of afterEach2) {
            await hook.call(context);
          }
        }
      }
    } else {
      await fn.call(context, t);
    }
  }
};

// https://deno.land/std@0.196.0/testing/bdd.ts
function itDefinition(...args) {
  let [
    suiteOptionsOrNameOrFn,
    optionsOrNameOrFn,
    optionsOrFn,
    fn
  ] = args;
  let suite = void 0;
  let name;
  let options;
  if (typeof suiteOptionsOrNameOrFn === "object" && typeof suiteOptionsOrNameOrFn.symbol === "symbol") {
    suite = suiteOptionsOrNameOrFn;
  } else {
    fn = optionsOrFn;
    optionsOrFn = optionsOrNameOrFn;
    optionsOrNameOrFn = suiteOptionsOrNameOrFn;
  }
  if (typeof optionsOrNameOrFn === "string") {
    name = optionsOrNameOrFn;
    if (typeof optionsOrFn === "function") {
      fn = optionsOrFn;
      options = {};
    } else {
      options = optionsOrFn;
      if (!fn) fn = options.fn;
    }
  } else if (typeof optionsOrNameOrFn === "function") {
    fn = optionsOrNameOrFn;
    name = fn.name;
    options = {};
  } else {
    options = optionsOrNameOrFn;
    if (typeof optionsOrFn === "function") {
      fn = optionsOrFn;
    } else {
      fn = options.fn;
    }
    name = options.name ?? fn.name;
  }
  return {
    suite,
    ...options,
    name,
    fn
  };
}
function it(...args) {
  if (TestSuiteInternal.runningCount > 0) {
    throw new Error(
      "cannot register new test cases after already registered test cases start running"
    );
  }
  const options = itDefinition(...args);
  const { suite } = options;
  const testSuite = suite ? TestSuiteInternal.suites.get(suite.symbol) : TestSuiteInternal.current;
  if (!TestSuiteInternal.started) TestSuiteInternal.started = true;
  if (testSuite) {
    TestSuiteInternal.addStep(testSuite, options);
  } else {
    const {
      name,
      fn,
      ignore,
      only,
      permissions,
      sanitizeExit,
      sanitizeOps,
      sanitizeResources
    } = options;
    TestSuiteInternal.registerTest({
      name,
      ignore,
      only,
      permissions,
      sanitizeExit,
      sanitizeOps,
      sanitizeResources,
      async fn(t) {
        TestSuiteInternal.runningCount++;
        try {
          await fn.call({}, t);
        } finally {
          TestSuiteInternal.runningCount--;
        }
      }
    });
  }
}
it.only = function itOnly(...args) {
  const options = itDefinition(...args);
  return it({
    ...options,
    only: true
  });
};
it.ignore = function itIgnore(...args) {
  const options = itDefinition(...args);
  return it({
    ...options,
    ignore: true
  });
};
it.skip = it.ignore;
function addHook(name, fn) {
  if (!TestSuiteInternal.current) {
    if (TestSuiteInternal.started) {
      throw new Error(
        "cannot add global hooks after a global test is registered"
      );
    }
    TestSuiteInternal.current = new TestSuiteInternal({
      name: "global",
      [name]: fn
    });
  } else {
    TestSuiteInternal.setHook(TestSuiteInternal.current, name, fn);
  }
}
function beforeAll(fn) {
  addHook("beforeAll", fn);
}
function afterAll(fn) {
  addHook("afterAll", fn);
}
function beforeEach(fn) {
  addHook("beforeEach", fn);
}
function afterEach(fn) {
  addHook("afterEach", fn);
}
function describeDefinition(...args) {
  let [
    suiteOptionsOrNameOrFn,
    optionsOrNameOrFn,
    optionsOrFn,
    fn
  ] = args;
  let suite = void 0;
  let name;
  let options;
  if (typeof suiteOptionsOrNameOrFn === "object" && typeof suiteOptionsOrNameOrFn.symbol === "symbol") {
    suite = suiteOptionsOrNameOrFn;
  } else {
    fn = optionsOrFn;
    optionsOrFn = optionsOrNameOrFn;
    optionsOrNameOrFn = suiteOptionsOrNameOrFn;
  }
  if (typeof optionsOrNameOrFn === "string") {
    name = optionsOrNameOrFn;
    if (typeof optionsOrFn === "function") {
      fn = optionsOrFn;
      options = {};
    } else {
      options = optionsOrFn ?? {};
      if (!fn) fn = options.fn;
    }
  } else if (typeof optionsOrNameOrFn === "function") {
    fn = optionsOrNameOrFn;
    name = fn.name;
    options = {};
  } else {
    options = optionsOrNameOrFn ?? {};
    if (typeof optionsOrFn === "function") {
      fn = optionsOrFn;
    } else {
      fn = options.fn;
    }
    name = options.name ?? fn?.name ?? "";
  }
  if (!suite) {
    suite = options.suite;
  }
  if (!suite && TestSuiteInternal.current) {
    const { symbol } = TestSuiteInternal.current;
    suite = { symbol };
  }
  return {
    ...options,
    suite,
    name,
    fn
  };
}
function describe(...args) {
  if (TestSuiteInternal.runningCount > 0) {
    throw new Error(
      "cannot register new test suites after already registered test cases start running"
    );
  }
  const options = describeDefinition(...args);
  if (!TestSuiteInternal.started) TestSuiteInternal.started = true;
  const { symbol } = new TestSuiteInternal(options);
  return { symbol };
}
describe.only = function describeOnly(...args) {
  const options = describeDefinition(...args);
  return describe({
    ...options,
    only: true
  });
};
describe.ignore = function describeIgnore(...args) {
  const options = describeDefinition(...args);
  return describe({
    ...options,
    ignore: true
  });
};
describe.skip = describe.ignore;
export {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it
};
