import { zip, enumerate, count, permute, combinations, wrapAroundGet } from "https://deno.land/x/good@1.14.3.0/array.js"
import { Input } from "./subrepos/cliffy/prompt/input.ts"
export { Input } from "./subrepos/cliffy/prompt/input.ts"
export { Number } from "./subrepos/cliffy/prompt/number.ts"
import { Checkbox } from "./subrepos/cliffy/prompt/checkbox.ts"
import { parse } from "./subrepos/cliffy/keycode/mod.ts"
import { stripColor } from "./subrepos/cliffy/prompt/deps.ts"
import { distance } from "./subrepos/cliffy/_utils/distance.ts"
import { isValidPathStringForFilePosix } from "https://deno.land/x/good@1.14.3.0/flattened/is_valid_path_string_for_file_posix.js"
import { Console, clearAnsiStylesFrom, black, white, red, green, blue, yellow, cyan, magenta, lightBlack, lightWhite, lightRed, lightGreen, lightBlue, lightYellow, lightMagenta, lightCyan, blackBackground, whiteBackground, redBackground, greenBackground, blueBackground, yellowBackground, magentaBackground, cyanBackground, lightBlackBackground, lightRedBackground, lightGreenBackground, lightYellowBackground, lightBlueBackground, lightMagentaBackground, lightCyanBackground, lightWhiteBackground, bold, reset, italic, underline, inverse, strikethrough, gray, grey, lightGray, lightGrey, grayBackground, greyBackground, lightGrayBackground, lightGreyBackground, } from "https://deno.land/x/quickr@0.7.4/main/console.js"

export const clearScreen = ()=>{
    console.log('\n'.repeat(Deno.consoleSize().rows))
    // console.log('\x1B[2J')
}

const segmenter = new Intl.Segmenter()
// not sure how well this handles emojis
export const terminalStringLength = (str)=>{
    if (str === '') {
		return 0
	}
    str = stripColor(str)

	let length = 0
	for (const _ of segmenter.segment(str)) {
		length++
	}
    return length
}

export async function selectOne({ message, showList=true, mustBeOnList=true, showInfo, options, optionDescriptions, autocompleteOnSubmit=true, descriptionHighlighter=stripColor }) {
    let optionStrings
    if (options instanceof Array) {
        optionStrings = options
        options = Object.fromEntries(optionStrings.map(each=>[each,each]))
    } else {
        optionStrings = Object.keys(options)
    }
    if (Object.values(options).length == 0) {
        console.warn(`[selectOne] I'm suppose to let the user select an option, but no options were given!`)
        return null
    }
    // if there's only one option, its not really a choice so just return it
    if (Object.values(options).length == 1) {
        console.log(`[selectOne] there's only one option, so I'm auto-selecting ${green(JSON.stringify(Object.keys(options)[0]))}`)
        return Object.values(options)[0]
    }
    const { rows, columns } = Deno.consoleSize()
    const maxOptionWidth = columns-3
    const longest = Math.max(...optionStrings.map(each=>clearAnsiStylesFrom(each).length))
    const suggestions = optionStrings
    const suggestionDescriptions = []
    if (optionDescriptions) {
        for (let [suggestion, description] of zip(suggestions, optionDescriptions)) {
            suggestion = clearAnsiStylesFrom(suggestion)
            let offset = 2
            suggestionDescriptions.push(
                descriptionHighlighter(
                    (suggestion.padEnd(longest+offset," ")+": "+description).slice(0,maxOptionWidth).slice(suggestion.length+2)
                )
            )
        }
    }
    while (true) {  
        const answer = await Input.prompt({
            message,
            list: showList,
            info: showInfo,
            suggestions,
            suggestionDescriptions,
            completeOnSubmit: autocompleteOnSubmit,
        })
        const isAlreadyValidOption = optionStrings.includes(answer)
        if (isAlreadyValidOption) {
            return options[answer]
        }

        if (autocompleteOnSubmit) {
            // autocomplete on submit
            // Note: this sort NEEDs to exactly match https://github.com/c4spar/deno-cliffy/blob/aa1311f8d0891f535805395b0fb7d99de0b01b74/prompt/_generic_suggestions.ts#L242
            //       in order for it to work
            //       (this is why we pin versions)
            optionStrings = optionStrings.filter((value) =>
                stripColor(value.toString())
                .toLowerCase()
                .startsWith(answer)
            ).sort((a, b) =>
                distance((a || a).toString(), answer) -
                distance((b || b).toString(), answer)
            )
            // return closest match
            return options[optionStrings[0]]
        }

        if (mustBeOnList) {
            const suggestions = await didYouMean({
                givenWord: answer,
                possibleWords: Object.keys(options),
                suggestionLimit: 1,
            })
            if (await Console.askFor.yesNo(`Did you mean ${suggestions[0]}? (y/n)`)) {
                return options[suggestions[0]]
            } else {
                prompt(`okay, here is the full list again (press enter to continue)`)
            }
            continue
        }
        return answer

        break // sanity check for if more code is added
    }
}
// note: this can go in the options array
// Checkbox.separator("--------"),

export function selectMany({ message, options, ...other}) {
    let optionStrings
    if (options instanceof Array) {
        optionStrings = options
        options = Object.fromEntries(optionStrings.map(each=>[each,each]))
    } else {
        optionStrings = Object.keys(options)
    }
    const { rows, columns } = Deno.consoleSize()
    const maxOptionWidth = columns-3
    const longest = Math.max(...optionStrings.map(each=>each.length))
    const suggestions = optionStrings
    return Checkbox.prompt({
        message,
        options: suggestions,
        ...other,
    }).then((answers)=>answers.map(each=>options[each]))
}

export const askForPath = async (message, other={}) => {
    return Input.prompt({
        message,
        list: true,
        info: true,
        files: true,
        ...other
    })
}

export const askForFilePath = async (message, other={}) => {
    while (true) {
        const response = await askForPath(message, other)
        if (response) {
            if (isValidPathStringForFilePosix(response)) {
                return response
            } else {
                console.log(`Sorry, that's not a valid posix path for a file`)
            }
        }
    }
}

export const askForParagraph = async (message, other={}) => {
    console.log(message, dim(""))
    let lastWasNewline = false
    let paragraph = []
    while (1) {
        const response = await Console.askFor.line("")
        if (response == "") {
            if (lastWasNewline) {
                break
            }
            lastWasNewline = true
            continue
        } else {
            paragraph.push(response)
        }
    }
    // reset the color
    Deno.stdout.writeSync(new TextEncoder().encode(reset``))
    return paragraph.join("\n")
}

export const write = (text)=>Deno.stdout.writeSync(text instanceof Uint8Array ? text : new TextEncoder().encode(text))

/**
 * listenToKeypresses
 *
 * @example
 * ```js
 * for await (const { name, sequence, code, ctrl, meta, shift } of listenToKeypresses()) {
 *     if (ctrl && name === "c") {
 *         console.log("exit")
 *         break
 *     }
 *     console.log(key)
 * }
 * ```
 */
export async function* listenToKeypresses({ stream=Deno.stdin, cbreak=true }={}){
    // example outputs:
    // [
    //     { name: "up", sequence: "\x1b[A", code: "[A", ctrl: false, meta: false, shift: false },
    //     { name: "down", sequence: "\x1b[B", code: "[B", ctrl: false, meta: false, shift: false },
    //     { name: "right", sequence: "\x1b[C", code: "[C", ctrl: false, meta: false, shift: false },
    //     { name: "left", sequence: "\x1b[D", code: "[D", ctrl: false, meta: false, shift: false },
    //     { name: "clear", sequence: "\x1b[E", code: "[E", ctrl: false, meta: false, shift: false },
    //     { name: "end", sequence: "\x1b[F", code: "[F", ctrl: false, meta: false, shift: false },
    //     { name: "home", sequence: "\x1b[H", code: "[H", ctrl: false, meta: false, shift: false }
    // ]
    while (true) {
        const data = new Uint8Array(8)
        
        stream.setRaw(true, { cbreak })
        const numberRead = await stream.read(data)
        stream.setRaw(false)
        
        if (numberRead === null) {
            return
        }

        const keys = parse(data.subarray(0, numberRead))

        for (const key of keys) {
            yield key
        }
    }
}

export function dim(text) {
    return `\x1b[2m${text}`.replace(/\x1b\[0m/g,"\x1b[0m\x1b[2m")
}

export function wordWrap(text, maxLength=80) {
    const { rows, columns } = Deno.consoleSize()
    if (text.length < columns) {
        return text
    }
    if (text.length < maxLength) {
        return text
    }
    if (columns < maxLength) {
        return text
    }
    return text.replace(/\n/g," ").replace(new RegExp(`(.{0,${maxLength}})`, "g"),"$1\n").replace(/\n\s+/g,"\n")
}