import { zip, enumerate, count, permute, combinations, wrapAroundGet } from "https://deno.land/x/good@1.14.3.0/array.js"
// import { FileSystem } from "https://deno.land/x/quickr@0.7.4/main/file_system.js"
import { Console, red, lightRed, yellow, green, cyan, dim, bold, clearAnsiStylesFrom } from "https://deno.land/x/quickr@0.7.4/main/console.js"
import $ from "https://esm.sh/jsr/@david/dax@0.42.0/mod.ts"
import { capitalize, indent, toCamelCase, digitsToEnglishArray, toPascalCase, toKebabCase, toSnakeCase, toScreamingKebabCase, toScreamingSnakeCase, toRepresentation, toString, regex, findAll, iterativelyFindAll, escapeRegexMatch, escapeRegexReplace, extractFirst, isValidIdentifier, removeCommonPrefix, didYouMean } from "https://deno.land/x/good@1.14.3.0/string.js"
import { FileSystem } from "https://deno.land/x/quickr@0.7.4/main/file_system.js"
import * as yaml from "https://deno.land/std@0.168.0/encoding/yaml.ts"

import { selectOne } from "./input_tools.js"

const $$ = (...args)=>$(...args).noThrow()
export const nixStoreHashPattern = /[0123456789abcdfghijklmnpqrsvwxyz]{32}/

export const nixEval = (string, {hash="aa0e8072a57e879073cee969a780e586dbe57997"}={})=>{
    return $$`nix eval -I 'nixpkgs=https://github.com/NixOS/nixpkgs/archive/${hash}.tar.gz' --impure --expr ${string}`
}

export const nixUrlHash = async (url)=>{
    // getting the hash without trying and failing to fetch is a lot harder than you might think
    return (await nixEval(`builtins.fetchTarball { url="${url}"; sha256="sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="; }`).text("stderr")).split("got: ")[1].trim()
}

export const jsStringToNixString = (string)=>{
    return `"${string.replace(/\$\{|[\\"]/g, '\\$&').replace(/\u0000/g, '\\0')}"`
}
export const listNixPackages =  async ()=>{
    const packageList = await $$`nix --extra-experimental-features nix-command profile list --json`.text()
    const elements = JSON.parse(packageList).elements
    for (const [index, each] of enumerate(elements)) {
        each.Index = index
    }
    return elements
}

let hasFlakesEnabledString
export const checkIfFlakesEnabled = async ({cacheFolder, overrideWith=null})=>{
    let oldOne = await FileSystem.info(`${FileSystem.home}/.local/state/nix/profiles/profile/manifest.nix`)
    let newOne = await FileSystem.info(`${FileSystem.home}/.local/state/nix/profiles/profile/manifest.json`)
    if (newOne.exists || oldOne.exists) {
        return newOne.exists
    // 
    // fallback on the old technique if neither exists
    // 
    } else {
        if (!hasFlakesEnabledString) {
            // 
            // flakes check
            // 
            const flakesCheckPath = `${cacheFolder}/has_flakes_enabled.check.json`
            hasFlakesEnabledString = FileSystem.sync.read(flakesCheckPath)
            if (hasFlakesEnabledString == null) {
                console.warn(`\n${cyan`❄️`} Checking if you use flakes...`)
                console.warn(dim`- (this will only run once)`)
                try {
                    const result = await $$`nix --extra-experimental-features nix-command profile list`.stderr(null).text()
                    hasFlakesEnabledString = !!result.match(/^Flake attribute: /m)
                } catch (error) {
                    hasFlakesEnabledString = false
                }
                if (hasFlakesEnabledString) {
                    console.warn(`${dim`- Okay looks like you do use flakes!`} ${cyan`❄️`}`)
                } else {
                    console.warn(`${dim`- Okay looks like you dont use flakes`} ${red`X`}`)
                }
                console.warn(`${dim`- Saving this preference to disk at:\n    `}${yellow(JSON.stringify(flakesCheckPath))}`)
                hasFlakesEnabledString = JSON.stringify(hasFlakesEnabledString)
                console.warn(`\n`)
                FileSystem.sync.write({
                    data: hasFlakesEnabledString,
                    path: flakesCheckPath,
                })
            }
        }
        return JSON.parse(hasFlakesEnabledString)
    }
}

function packageEntryToNames(packageEntry) {
    const names = []
    if (typeof packageEntry.attrPath == "string") {
        const components = packageEntry.attrPath.split(/\./g)
        if (components[0] == "packages" || components[0] == "legacyPackages") {
            const nameParts = components.slice(2,)
            if (nameParts.slice(-1)[0] == "default") {
                nameParts.pop()
            }
            if (nameParts.length > 0) {
                names.push(nameParts.join("."))
            }
        }
    }
    const storePaths = packageEntry.storePaths.filter(each=>each.length > 0)
    for (const eachStorePath of storePaths) {
        const [ folders, name, ext ] = FileSystem.pathPieces(eachStorePath)
        let match
        let prevFolderNameWasStore = false
        for (const each of folders) {
            if (prevFolderNameWasStore) {
                if (match = each.match(nixStoreHashPattern)) {
                    if (match.index == 0) {
                        // the +1 is for the dash
                        const derivationName = each.slice(match[0].length+1,)
                        if (derivationName) {
                            names.push(derivationName)
                        }
                    }
                }
                break
            }
            prevFolderNameWasStore = each == "store"
        }
    }
    return names
}

export async function remove({name, hasFlakesEnabled}) {
    if (!hasFlakesEnabled) {
        const isInteractive = !name
        if (!isInteractive) {
            const installCommand = `nix-env -e ${escapeNixString(name)}`
            console.log(dim`- running: ${installCommand}`)
            var {code} = await $$`nix-env -e ${name}`
            if (code===0) {
                console.log(`\n - ✅ removed ${name}`)
            } else {
                console.error(`\n - ❌ there was an issue removing ${name}`)
            }
        } else {
            const packagesString = await $$`nix-env -q --installed`.text()
            const cancelOption = "[[cancel]]"
            const choice = await selectOne({
                message: "Which package would you like to uninstall?",
                showList: true,
                showInfo: false,
                options: packagesString.trim()+`\n${cancelOption}`.split("\n"),
            })
            if (choice == cancelOption) {
                return
            } else {
                await remove({name: choice, hasFlakesEnabled})
            }
        }
    } else {
        console.log(`Okay removing ${name}`)
        const packages = await listNixPackages()
        try {
            const uninstallList = []
            for (const eachPackage of packages) {
                const names = packageEntryToNames(eachPackage)
                if (names.some(each=>each.match(regex`${/^/}${name}${/\b/}`.ig))) {
                    uninstallList.push(eachPackage)
                }
            }
            for (const each of uninstallList) {
                if (each.Index!=null) {
                    try {
                        await $$`nix --extra-experimental-features nix-command profile remove ${`${each.Index}`.trim()}`
                    } catch (error) {
                    }
                }
            }
        } catch (error) {
            console.warn(error)
        }
    }
}

export const removeExistingPackage = async ({urlOrPath, storePath, packages})=>{
    packages = packages || await listNixPackages()
    try {
        const uninstallList = []
        for (const eachPackage of packages) {
            const storePaths = packageEntry.storePaths.filter(each=>each.length > 0)
            const storePathMatches = storePaths.some(eachStorePath=>`${storePath}`.startsWith(eachStorePath))
            if (storePath && storePathMatches) {
                uninstallList.push(eachPackage)
            } else if (urlOrPath) {
                if (eachPackage.originalUrl == urlOrPath) {
                    uninstallList.push(eachPackage)
                }
            }
        }
        for (const each of uninstallList) {
            if (each.Index!=null) {
                try {
                    await $$`nix --extra-experimental-features nix-command profile remove ${`${each.Index}`.trim()}`
                } catch (error) {
                }
            }
        }
    } catch (error) {
        console.warn(error)
    }
}

export async function install({hasFlakesEnabled, humanPackageSummary, urlOrPath, force, versionInfo}) {
    if (hasFlakesEnabled) {
        console.log(`Okay installing ${humanPackageSummary}`)
        let noProgressLoopDetection
        install: while (1) {
            let stderrOutput = ""
            const listener = {
                writeSync(chunk) {
                    Deno.stderr.writeSync(chunk)
                    const text = (new TextDecoder()).decode(chunk)
                    stderrOutput += text
                }
            }
            // try the install
            const installCommand = `nix --extra-experimental-features --extra-experimental-features flakes nix-command profile install ${jsStringToNixString(urlOrPath)}`
            console.log(dim`- running: ${installCommand}`)
            var { code } = await $$`nix --extra-experimental-features nix-command --extra-experimental-features flakes profile install ${urlOrPath}`.stderr(listener)
            if (noProgressLoopDetection == stderrOutput) {
                console.error(red(stderrOutput))
                console.error(`\n - ❌ there was an issue installing ${humanPackageSummary}`)
                throw Error(`Sorry, it looks like I was unable to install the package`)
            }
            noProgressLoopDetection = stderrOutput
            const conflictMatch = stderrOutput.match(/error: An existing package already provides the following file:(?:\w|\W)+?(?<existing>\/nix\/store\/.+)(?:\w|\W)+?This is the conflicting file from the new package:(?:\w|\W)+?(?<newPackage>\/nix\/store\/.+)(?:\w|\W)+?To remove the existing package:(?:\w|\W)+?(?<removeExisting>nix profile remove.+)(?:\w|\W)+?To prioritise the new package:(?:\w|\W)+?(?<prioritiseNew>nix profile install.+)(?:\w|\W)+?To prioritise the existing package:(?:\w|\W)+?(?<prioritiseExisting>nix profile install.+)/)
            if (conflictMatch) {
                const { existing, newPackage, removeExisting, prioritiseNew, prioritiseExisting } = conflictMatch.groups
                const [ folders, name, ext ] = FileSystem.pathPieces(existing)
                const simpleName = cyan(folders.slice(4,).join("/"))+cyan("/")+green(name+ext)
                clearScreen()
                const packages = await listNixPackages()
                
                if (force) {
                    const urlOrPath = (removeExisting.slice(("nix --extra-experimental-features nix-command profile remove ").length).match(/(.+?)#/)||"")[1]
                    if (removeExisting) {
                        await removeExistingPackage({urlOrPath, storePath: existing, packages})
                    }
                    continue install
                } else {
                    console.log(bold`Looks like there was a conflict:`)
                    console.log(`    The install adds: ${simpleName}`)
                    console.log(`    Which already exists from:\n        ${yellow((removeExisting||"").trim().slice(("nix --extra-experimental-features nix-command profile remove ").length)||existing)}`)
                    console.log(``)
                    const uninstallOption = "uninstall: remove the old package, install the one you just picked"
                    const newHigherPriorityOption = "higher: install the one you just picked with a higher priority"
                    const installAsLowerOption = "lower: install one you just picked, but have it be lower priority"
                    const choice = await selectOne({
                        message: "Choose an action:",
                        showList: true,
                        showInfo: false,
                        options: [
                            uninstallOption,
                            ...(prioritiseNew ? [newHigherPriorityOption] : []),
                            installAsLowerOption,
                            "cancel",
                        ],
                    })
                    if (choice == "cancel") {
                        throw Error(`cancel`)
                    } else if (choice == newHigherPriorityOption) {
                        await $$`${(prioritiseNew.trim().split(/\s/g))}`
                    } else if (choice == installAsLowerOption) {
                        await $$`${(prioritiseExisting.trim().split(/\s/g))}`
                    } else if (choice == uninstallOption) {
                        const urlOrPath = (removeExisting.slice(("nix --extra-experimental-features nix-command profile remove ").length).match(/(.+?)#/)||"")[1]
                        if (removeExisting) {
                            await removeExistingPackage({urlOrPath, storePath: existing, packages})
                        }
                    }
                    continue install
                }
                console.log(`\n - ✅ ${humanPackageSummary} should now be installed`)
            } else if (code!==0) {
                console.error(red(stderrOutput))
                console.error(`\n - ❌ there was an issue installing ${humanPackageSummary}`)
                throw Error(`Sorry, it looks like I was unable to install the package`)
            } else {
                console.log(`\n - ✅ ${humanPackageSummary} should now be installed`)
            }
            break
        }
    } else {
        try {
            const installCommand = `nix-env -iA ${jsStringToNixString(versionInfo.attrPath)} -f ${jsStringToNixString(`https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz`)}`
            console.log(dim`- running: ${installCommand}`)
            var {code} = await $$`nix-env -iA ${versionInfo.attrPath} -f ${`https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz`}`
            if (code===0) {
                console.log(`\n - ✅ ${versionInfo.attrPath}@${versionInfo.version} should now be installed`)
            } else {
                console.error(`\n - ❌ there was an issue installing ${versionInfo.attrPath}@${versionInfo.version}`)
            }
        } catch (error) {
            console.log(`error is:`,error)
        }
    }
}


// 
// wip needs more testing
// 
function nameToIndicies(name, packageInfo) {
    name = name.toLowerCase() // remove case sensitivity
    const packages = packageInfo.elements.map((each,index)=>[each,index])
    let attrNameIndicies = packages.filter(([each, index])=>each?.attrPath&&each.attrPath.toLowerCase().endsWith(`.${name}`)).map(([each,index])=>index)
    if (attrNameIndicies.length == 0) {
        const indices = []
        packages.reverse()
        for (const [each,index] of packages) {
            if (each?.storePaths) {
                const commonName = each.storePaths.map(each=>each.toLowerCase().slice(storePathBaseLength,)).sort((a,b)=>a.length-b.length)[0]
                if (commonName == name || commonName.startsWith(`${name}-`)) {
                    attrNameIndicies.push(index)
                }
            }
        }
    }
    return attrNameIndicies
}

const storePathBaseLength = ("/nix/store/9i7rbbhxi1nnqibla22s785svlngcnvw-").length

export async function agressiveRemove(name) {
    let deletedSomething = false 
    while (true) {
        const text = await $$`nix --extra-experimental-features nix-command profile list --json`.text()
        var packageInfo = JSON.parse(text)
        const indices = nameToIndicies(name, packageInfo)
        if (indices.length == 0){
            break
        }
        for (const each of indices) {
            console.log(`running: nix --extra-experimental-features nix-command profile remove ${each}`)
            await $$`nix --extra-experimental-features nix-command profile remove ${`${each-0}`}`
            deletedSomething = true
        }
    }
    if (!deletedSomething) {
        const packages = packageInfo.elements.map((each,index)=>[each,index])
        packages.reverse()
        next_package: for (const [each,index] of packages) {
            if (each?.storePaths) {
                const commonName = each.storePaths.map(each=>each.slice(storePathBaseLength,)).sort((a,b)=>a.length-b.length)[0]
                let attrName = `${each?.attrName}`.split(".").slice(2,).join(".")
                if (attrName == "default") {
                    attrName = null
                } else if (attrName.startsWith("default.")) {
                    attrName = attrName.slice(("default.").length,)
                }
                let packageName = ""
                if (attrName && commonName) {
                    packageName = `${attrName} (aka ${commonName})`
                } else {
                    packageName = attrName || commonName
                }
                for (const eachPath of each?.storePaths) {
                    for (const eachBinPath of await FileSystem.listFilePathsIn(`${eachPath}/bin`)) {
                        if (FileSystem.basename(eachBinPath) == name) { 
                            console.log(`This package ${yellow(packageName)} contains ${green(name)} as an executable`)
                            if (await Console.askFor.yesNo(`Do you want to remove the package?`)) {
                                await $$`nix --extra-experimental-features nix-command profile remove ${index-0}`
                                deletedSomething = true
                            }
                            continue next_package
                        }
                    }
                }
            }
        }
    }
    if (!deletedSomething) {
        console.log(`I didn't see anything with ${JSON.stringify(name)} as an attribute name, pname, or with an executable with that name`)
    }
}