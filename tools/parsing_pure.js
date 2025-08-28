import { xmlStylePreview } from "https://deno.land/x/deno_tree_sitter@1.0.1.0/main/extras/xml_style_preview.js"
import { createParser } from "https://deno.land/x/deno_tree_sitter@1.0.1.0/main/main.js"
import nixTreeSitter from "https://esm.sh/gh/jeff-hykin/common_tree_sitter_languages@c37fc96/main/nix.js"

// export { xmlStylePreview }
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
 *             return `${indent.slice(0,bracket.indent.length)}${valueAsString}\n${bracket.indent}]`
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
    
    return newChunks.join("")
}

export const appendToAttrListLiteral = ({nixCode, attrName, codeToAppend, })=>{
    return findAndReplaceAll({
        nixCode,
        pattern: `(binding (attrpath) @key (list_expression ("]" @bracket)) @list)`,
        nameToReplace: "bracket",
        replacement: ({bracket, list})=>{
            const doesntNeedParens = codeToAppend.match(/^(?:true|false|null|\w+|\d+|\d+\.\d+|"[^"]*"|'[^']*')$/)
            let valueAsString
            if (doesntNeedParens) {
                valueAsString = codeToAppend
            } else {
                valueAsString = `(${codeToAppend})`
            }
            const listIsInline = list.text.includes("\n")
            if (listIsInline) {
                return ` ${valueAsString} ]`
            } else {
                let indent = (list.indent || "")
                for (let eachNode of list.children) {
                    if ((eachNode.indent||"").length > indent.length) {
                        indent = eachNode.indent
                    }
                }
                return `${indent.slice(0,bracket.indent.length)}${valueAsString}\n${bracket.indent}]`
            }
        },
    })
}