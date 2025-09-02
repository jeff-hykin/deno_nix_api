import { xmlStylePreview } from "https://deno.land/x/deno_tree_sitter@1.0.1.0/main/extras/xml_style_preview.js"
import { createParser } from "https://deno.land/x/deno_tree_sitter@1.0.1.2/main/main.js"
// import { createParser } from "/Users/jeffhykin/repos/deno-tree-sitter/main/main.js"
import nixTreeSitter from "https://esm.sh/gh/jeff-hykin/common_tree_sitter_languages@c37fc96/main/nix.js"

export { xmlStylePreview }
export const parser = await createParser(nixTreeSitter, { disableSoftNodes:false, moduleOptions: undefined })
export const parse = (...args) => parser.parse(...args)

// For visualizing nix programs as if they were HTML
export const treeToAstString = (tree) => {
    const rootNode = tree.rootNode || tree
    const outputs = []
    let indent = ""
    for (const [ parents, node, direction ] of rootNode.traverse()) {
        const isLeafNode = direction == "-"
        if (isLeafNode) {
            outputs.push(`${indent}<${node.type} text=${JSON.stringify(node.text)} />`)
        } if (direction == "->") {
            outputs.push(`${indent}<${node.type}>`)
            indent += "    "
        } else if (direction == "<-") {
            indent = indent.slice(0,-4)
            outputs.push(`${indent}</${node.type}>`)
        }
    }
    return outputs.join("\n")
}

/**
 * @example
 * ```js
 * console.log(findAndReplaceAll({
 *     nixCode: `{\n    permittedInsecurePackages = [\n        "linux-4.13.16"\n        "openssl-1.0.2u"\n    ];\n}`,
 *     pattern: `(binding (attrpath) @key (list_expression ("]" @bracket)) @list)`,
 *     nameToReplace: "bracket",
 *     replacement: ({bracket, list})=>{
 *         const codeToAppend = '"another one"'
 *         const doesntNeedParens = codeToAppend.match(/^(?:true|false|null|\w+|\d+|\d+\.\d+|"[^"]*"|'[^']*')$/)
 *         let valueAsString
 *         if (doesntNeedParens) {
 *             valueAsString = codeToAppend
 *         } else {
 *             valueAsString = `(${codeToAppend})`
 *         }
 *         const listIsInline = !list.text.includes("\n")
 *         if (listIsInline) {
 *             return ` ${valueAsString} ]`
 *         } else {
 *             let indent = (list.indent || "")
 *             for (let eachNode of list.children) {
 *                 if ((eachNode.indent||"").length > indent.length) {
 *                     indent = eachNode.indent
 *                 }
 *             }
 *             return `${indent.slice(bracket.indent.length)}${valueAsString}\n${bracket.indent}]`
 *         }
 *     },
 * }))
 * ```
 */
export const findAndReplaceAll = ({ nixCode, pattern, nameToReplace, replacement })=>{
    const tree = parse(nixCode)
    const matches = tree.rootNode.quickQuery(pattern)
    const splicePoints = []
    for (let each of matches) {
        let replacementString = replacement
        if (replacement instanceof Function) {
            replacementString = replacement(each)
        }
        splicePoints.push([each[nameToReplace].startIndex, each[nameToReplace].endIndex, replacementString])
    }
    // combine chunks
    let nextIndex = 0
    const newChunks = []
    for (let each of splicePoints) {
        const [ start, end, replacementString ] = each
        newChunks.push(nixCode.slice(nextIndex, start))
        newChunks.push(replacementString)
        nextIndex = end
    }
    // last chunk
    newChunks.push(nixCode.slice(nextIndex))
    return newChunks.join("")
}

export const appendToAttrListLiteral = ({nixCode, attrName, codeToAppend, })=>{
    return findAndReplaceAll({
        nixCode,
        pattern: `(binding (attrpath) @key (list_expression ("]" @bracket)) @list)`,
        nameToReplace: "bracket",
        replacement: ({bracket, list})=>{
            const listIsInline = !list.text.includes("\n")
            if (listIsInline) {
                return ` ${codeToAppend} ]`
            } else {
                let indent = (list.indent || "")
                for (let eachNode of list.children) {
                    if ((eachNode.indent||"").length > indent.length) {
                        indent = eachNode.indent
                    }
                }
                console.debug(`bracket.indent is:`,JSON.stringify(bracket.indent))
                console.debug(`indent is:`,JSON.stringify(indent))
                return `${indent.slice(bracket.indent.length)}${codeToAppend}\n${bracket.indent}]`
            }
        },
    })
}

import { frequencyCount } from 'https://esm.sh/gh/jeff-hykin/good-js@1.17.2.0/source/flattened/frequency_count.js'

export function detectIndentation(code) {
    const tabToSpacesRate = 4
    const lines = code.replace(/\t/g," ".repeat(tabToSpacesRate)).split("\n")
    const indentCounts = {}

    for (let line of lines) {
        // Remove leading and trailing whitespace for detection
        const trimmedLine = line.trim()

        // Skip empty lines or single-line comments
        if (trimmedLine === "" || trimmedLine.startsWith("//") || trimmedLine.startsWith("/*") || trimmedLine.startsWith("*")) {
            continue
        }

        const leadingSpaces = line.match(/^ +/)
        if (!leadingSpaces) continue

        const spaceCount = leadingSpaces[0].length

        // Track how often each indentation level occurs
        if (!indentCounts[spaceCount]) {
            indentCounts[spaceCount] = 0
        }
        indentCounts[spaceCount]++
    }

    const indentLevels = Object.keys(indentCounts)
        .map(Number)
        .sort((a, b) => a - b)

    // Find the most common difference between levels
    const diffs = {}
    for (let i = 1; i < indentLevels.length; i++) {
        const diff = indentLevels[i] - indentLevels[i - 1]
        if (diff <= 0) continue
        if (!diffs[diff]) {
            diffs[diff] = 0
        }
        diffs[diff] += indentCounts[indentLevels[i]]
    }

    // Get the most common diff (assumed indent size)
    let mostLikelyIndent = null
    let maxCount = 0
    for (const [diffStr, count] of Object.entries(diffs)) {
        const diff = parseInt(diffStr)
        if (count > maxCount) {
            maxCount = count
            mostLikelyIndent = diff
        }
    }

    return mostLikelyIndent || null // Return null if nothing detected
}

// import { commonPrefix } from 'https://esm.sh/gh/jeff-hykin/good-js@1.17.2.0/source/flattened/common_prefix.js'
// export const formatNixCode = ({nixCode})=>{
//     // 
//     // handle indent
//     // 
//     const indentSize = 4
//     const indent = " ".repeat(indentSize)
//     nixCode = nixCode.replace(/\t/g,indent)
//     const indentationNumber = detectIndentation(nixCode)
//     if (indentationNumber == 2) {
//         nixCode = nixCode.replace(/(\n|^) +/g, (each)=>each.replace(/  /g, indent))
//     } else if (indentationNumber == 3) {
//         nixCode = nixCode.replace(/(\n|^) +/g, (each)=>each.replace(/   /g, indent))
//     }
    
//     // 
//     // let
//     // 
//     while (1) {
//         const tree = parse(nixCode)
//         const letStatements = tree.rootNode.quickQuery(`(let_expression)`)
//         // bring inner statements to the top (necessary for correctly doing .replaceInnards)
//         letStatements.sort((a,b)=>a.text.length-b.text.length)
        
//         for (const statement of letStatements) {
//             const [ theLet, theAssignments, theIn, expressionOutput ] = statement.hardChildren
//             const lines = tree.codeString.split(/\n/g)
//             // does the let have a prefix
//             let letIndent = theLet.indent
//             console.debug(`theAssignments.startPosition.row is:`,theAssignments.startPosition.row)
//             console.debug(`theLet is:`,theLet)
//             const hasPrefix = !lines[theLet.startPosition.row].match(/^\s*let\b/)
//             const hasSuffix = !lines[theLet.startPosition.row].match(/\blet\b\s*$/)
//             console.debug(`theLet.text 1 is:`,theLet.text)
//             if (hasSuffix) {
//                 theLet.replaceInnards(`let\n${indent}`)
//             }
//             console.debug(`theLet.text 2 is:`,theLet.text)
//             let inIndex = theIn.indent
//             const inHasPrefix = !lines[theLet.startPosition.row].match(/^\s*let\b/)
//             const inHasSuffix = !lines[theLet.startPosition.row].match(/\blet\b\s*$/)
//             if (inHasPrefix) {
//                 theIn.replaceInnards(`\n${letIndent}${theIn.text}`)
//             }
//             if (hasSuffix) {
//                 theIn.replaceInnards(`${theIn.text}\n`)
//             }
//             // these should be guaranteed to be on a different line now 
//             if (theAssignments.startPosition.row == theLet.endPosition.row) {
//                 throw Error(`Something is wrong with the JS code above this throw. The assignments should be on a different line after doing .replaceInnards()`)
//             }
//             const assignmentLines = lines.slice(theAssignments.startPosition.row, theAssignments.endPosition.row)
//             const commonIndent = commonPrefix(assignmentLines).match(/^\s*/)[0]
//             // indent the assignments
//             // tree.replace({
//             //     rangeOrNode: {
//             //         startIndex: theLet.endIndex,
//             //         startPosition: theLet.endPosition,
//             //         endIndex: theIn.startIndex,
//             //         endPosition: theIn.startIndex,
//             //     },
//             //     replacement: lines.map(each=>letIndent+indent+each.slice(commonIndent.length)).join("\n"),
//             // })
//             // indent the value
//             const expressionOutputLines = lines.slice(expressionOutput.startPosition.row, expressionOutput.endPosition.row)
//             const commonIndentExpression = commonPrefix(expressionOutputLines).match(/^\s*/)[0]
//             // indent the assignments
//             // tree.replace({
//             //     rangeOrNode: {
//             //         startIndex: theLet.endIndex,
//             //         startPosition: theLet.endPosition,
//             //         endIndex: theIn.startIndex,
//             //         endPosition: theIn.startIndex,
//             //     },
//             //     replacement: lines.map(each=>letIndent+indent+each.slice(commonIndentExpression.length)).join("\n"),
//             // })
            
//             // check for indent
//             // if (tree.codeString.slice(theLet.startIndex).match(/let\s*/) )
//         }
//     }

//     return nixCode
    
//     // 
//     // function
//     // 

//     // const outputs = []
//     // let indent = ""
//     // for (const [ parents, node, direction ] of tree.rootNode.traverse()) {
//     //     const isLeafNode = direction == "-"
//     //     if (isLeafNode) {
//     //         outputs.push(`${indent}${node.text}`)
//     //     } if (direction == "->") {
//     //         outputs.push(`${indent}${node.text}`)
//     //         indent += indentation
//     //     } else if (direction == "<-") {
//     //         indent = indent.slice(0,-indentation.length)
//     //         outputs.push(`${indent}${node.text}`)
//     //     }
//     // }
//     // console.debug(outputs.join("\n"))
//     return outputs.join("\n")
// }