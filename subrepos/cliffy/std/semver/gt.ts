// https://deno.land/std@0.196.0/semver/_shared.ts
function compareNumber(a, b) {
  if (isNaN(a) || isNaN(b)) {
    throw new Error("Comparison against non-numbers");
  }
  return a === b ? 0 : a < b ? -1 : 1;
}
function checkIdentifier(v1, v2) {
  if (v1.length && !v2.length) {
    return -1;
  } else if (!v1.length && v2.length) {
    return 1;
  } else {
    return 0;
  }
}
function compareIdentifier(v1, v2) {
  let i = 0;
  do {
    const a = v1[i];
    const b = v2[i];
    if (a === void 0 && b === void 0) {
      return 0;
    } else if (b === void 0) {
      return 1;
    } else if (a === void 0) {
      return -1;
    } else if (typeof a === "string" && typeof b === "number") {
      return 1;
    } else if (typeof a === "number" && typeof b === "string") {
      return -1;
    } else if (a < b) {
      return -1;
    } else if (a > b) {
      return 1;
    } else {
      continue;
    }
  } while (++i);
  return 0;
}
var re = [];
var src = [];
var R = 0;
var NUMERICIDENTIFIER = R++;
src[NUMERICIDENTIFIER] = "0|[1-9]\\d*";
var NONNUMERICIDENTIFIER = R++;
src[NONNUMERICIDENTIFIER] = "\\d*[a-zA-Z-][a-zA-Z0-9-]*";
var MAINVERSION = R++;
var nid = src[NUMERICIDENTIFIER];
src[MAINVERSION] = `(${nid})\\.(${nid})\\.(${nid})`;
var PRERELEASEIDENTIFIER = R++;
src[PRERELEASEIDENTIFIER] = "(?:" + src[NUMERICIDENTIFIER] + "|" + src[NONNUMERICIDENTIFIER] + ")";
var PRERELEASE = R++;
src[PRERELEASE] = "(?:-(" + src[PRERELEASEIDENTIFIER] + "(?:\\." + src[PRERELEASEIDENTIFIER] + ")*))";
var BUILDIDENTIFIER = R++;
src[BUILDIDENTIFIER] = "[0-9A-Za-z-]+";
var BUILD = R++;
src[BUILD] = "(?:\\+(" + src[BUILDIDENTIFIER] + "(?:\\." + src[BUILDIDENTIFIER] + ")*))";
var FULL = R++;
var FULLPLAIN = "v?" + src[MAINVERSION] + src[PRERELEASE] + "?" + src[BUILD] + "?";
src[FULL] = "^" + FULLPLAIN + "$";
var GTLT = R++;
src[GTLT] = "((?:<|>)?=?)";
var XRANGEIDENTIFIER = R++;
src[XRANGEIDENTIFIER] = src[NUMERICIDENTIFIER] + "|x|X|\\*";
var XRANGEPLAIN = R++;
src[XRANGEPLAIN] = "[v=\\s]*(" + src[XRANGEIDENTIFIER] + ")(?:\\.(" + src[XRANGEIDENTIFIER] + ")(?:\\.(" + src[XRANGEIDENTIFIER] + ")(?:" + src[PRERELEASE] + ")?" + src[BUILD] + "?)?)?";
var XRANGE = R++;
src[XRANGE] = "^" + src[GTLT] + "\\s*" + src[XRANGEPLAIN] + "$";
var LONETILDE = R++;
src[LONETILDE] = "(?:~>?)";
var TILDE = R++;
src[TILDE] = "^" + src[LONETILDE] + src[XRANGEPLAIN] + "$";
var LONECARET = R++;
src[LONECARET] = "(?:\\^)";
var CARET = R++;
src[CARET] = "^" + src[LONECARET] + src[XRANGEPLAIN] + "$";
var COMPARATOR = R++;
src[COMPARATOR] = "^" + src[GTLT] + "\\s*(" + FULLPLAIN + ")$|^$";
var HYPHENRANGE = R++;
src[HYPHENRANGE] = "^\\s*(" + src[XRANGEPLAIN] + ")\\s+-\\s+(" + src[XRANGEPLAIN] + ")\\s*$";
var STAR = R++;
src[STAR] = "(<|>)?=?\\s*\\*";
for (let i = 0; i < R; i++) {
  if (!re[i]) {
    re[i] = new RegExp(src[i]);
  }
}
function isValidNumber(value) {
  return typeof value === "number" && !Number.isNaN(value) && (!Number.isFinite(value) || 0 <= value && value <= Number.MAX_SAFE_INTEGER);
}
var MAX_LENGTH = 256;
function isValidString(value) {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_LENGTH && !!value.match(/[0-9A-Za-z-]+/);
}

// https://deno.land/std@0.196.0/semver/constants.ts
var MAX = {
  major: Number.POSITIVE_INFINITY,
  minor: Number.POSITIVE_INFINITY,
  patch: Number.POSITIVE_INFINITY,
  prerelease: [],
  build: []
};
var INVALID = {
  major: Number.NEGATIVE_INFINITY,
  minor: Number.POSITIVE_INFINITY,
  patch: Number.POSITIVE_INFINITY,
  prerelease: [],
  build: []
};
var ANY = {
  major: Number.NaN,
  minor: Number.NaN,
  patch: Number.NaN,
  prerelease: [],
  build: []
};

// https://deno.land/std@0.196.0/semver/is_semver.ts
function isSemVer(value) {
  if (value == null) return false;
  if (Array.isArray(value)) return false;
  if (typeof value !== "object") return false;
  if (value === INVALID) return true;
  if (value === ANY) return true;
  const { major, minor, patch, build, prerelease } = value;
  const result = typeof major === "number" && isValidNumber(major) && typeof minor === "number" && isValidNumber(minor) && typeof patch === "number" && isValidNumber(patch) && Array.isArray(prerelease) && Array.isArray(build) && prerelease.every((v) => typeof v === "string" || typeof v === "number") && prerelease.filter((v) => typeof v === "string").every(
    (v) => isValidString(v)
  ) && prerelease.filter((v) => typeof v === "number").every(
    (v) => isValidNumber(v)
  ) && build.every((v) => typeof v === "string" && isValidString(v));
  return result;
}

// https://deno.land/std@0.196.0/semver/parse.ts
function parse(version, options) {
  const includePrerelease = options?.includePrerelease ?? true;
  if (typeof version === "object") {
    if (isSemVer(version)) {
      return version;
    } else {
      throw new TypeError(`not a valid SemVer object`);
    }
  }
  if (typeof version !== "string") {
    throw new TypeError(
      `version must be a string`
    );
  }
  if (version.length > MAX_LENGTH) {
    throw new TypeError(
      `version is longer than ${MAX_LENGTH} characters`
    );
  }
  version = version.trim();
  const r = re[FULL];
  const m = version.match(r);
  if (!m) {
    throw new TypeError(`Invalid Version: ${version}`);
  }
  const major = parseInt(m[1]);
  const minor = parseInt(m[2]);
  const patch = parseInt(m[3]);
  if (major > Number.MAX_SAFE_INTEGER || major < 0) {
    throw new TypeError("Invalid major version");
  }
  if (minor > Number.MAX_SAFE_INTEGER || minor < 0) {
    throw new TypeError("Invalid minor version");
  }
  if (patch > Number.MAX_SAFE_INTEGER || patch < 0) {
    throw new TypeError("Invalid patch version");
  }
  const numericIdentifier = new RegExp(`^${src[NUMERICIDENTIFIER]}$`);
  const prerelease = (m[4] ?? "").split(".").filter((id) => id).map((id) => {
    const num = parseInt(id);
    if (id.match(numericIdentifier) && isValidNumber(num)) {
      return num;
    } else {
      return id;
    }
  });
  const build = m[5]?.split(".")?.filter((m2) => m2) ?? [];
  if (includePrerelease) {
    return {
      major,
      minor,
      patch,
      prerelease,
      build
    };
  } else {
    return {
      major,
      minor,
      patch,
      prerelease: [],
      build: []
    };
  }
}

// https://deno.land/std@0.196.0/semver/compare.ts
function compare(s0, s1, options) {
  const v0 = parse(s0, options);
  const v1 = parse(s1, options);
  const includePrerelease = options?.includePrerelease ?? true;
  if (s0 === s1) return 0;
  if (includePrerelease) {
    return compareNumber(v0.major, v1.major) || compareNumber(v0.minor, v1.minor) || compareNumber(v0.patch, v1.patch) || checkIdentifier(v0.prerelease, v1.prerelease) || compareIdentifier(v0.prerelease, v1.prerelease);
  } else {
    return compareNumber(v0.major, v1.major) || compareNumber(v0.minor, v1.minor) || compareNumber(v0.patch, v1.patch);
  }
}

// https://deno.land/std@0.196.0/semver/gt.ts
function gt(s0, s1, options) {
  return compare(s0, s1, options) > 0;
}
export {
  gt
};
