const versionPattern = /^\d+(\.\d+)*/
import { zipLong as zip } from "https://esm.sh/gh/jeff-hykin/good-js@1.14.3.0/source/flattened/zip_long.js"

const versionToList = version=>`${version}`.split(".").map(each=>each.split(/(?<=\d)(?=\D)|(?<=\D)(?=\d)/)).flat(1).map(each=>each.match(/^\d+$/)?each-0:each)

const versionCompare = (a, b) => {
    for (let [numberForA, numberForB ] of zip(versionToList(a), versionToList(b))) {
        if (numberForA != numberForB) {
            if (typeof numberForB == "number" && typeof numberForB == "number") {
                return numberForB - numberForA
            } else if (typeof numberForB == "number") {
                return numberForB
            } else if (typeof numberForA == "number") {
                return - numberForA
            } else {
                return `${numberForB}`.localeCompare(numberForA)
            }
        }
    }
    return 0
}

export function distance(a: string, b: string): number {
  if (a.match(versionPattern) && b.match(versionPattern)) {
    return versionCompare(a, b)
  }
  let aFlakeIndex = a.indexOf("❄️")
  if (aFlakeIndex!=-1) {
    a = a.slice(0,aFlakeIndex-1)
  }
  let bFlakeIndex = b.indexOf("❄️")
  if (bFlakeIndex!=-1) {
    b = b.slice(0,bFlakeIndex-1)
  }
  if (a.length == 0) {
    return b.length;
  }
  if (b.length == 0) {
    return a.length;
  }
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1),
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
