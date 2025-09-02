import { treeToAstString, parse, formatNixCode } from "./parsing_pure.js"
import { FileSystem } from "https://deno.land/x/quickr@0.6.51/main/file_system.js"

export const nixFileToXml = async (path, outputPath=null)=>{
    return await FileSystem.write({
        path: outputPath || `${path}.xml`,
        data: treeToAstString(
            parse(
                await FileSystem.read(path)
            )
        ),
    })
}

// /**
//  * @example
//  * ```js
//  * formatNixCodeImpure({path:"/Users/jeffhykin/repos/deno_nix_api/test_data/unformatted.nix"})
//  * ```
//  *
//  * @param {string} path - file path to overwrite
//  */
// export const formatNixCodeImpure = async ({path})=>{
//     const string = await FileSystem.read(path)
//     let output = formatNixCode({
//         nixCode: string,
//     })
//     console.debug(`output is:`,output)
//     if (string) {
//         await FileSystem.write({
//             path,
//             data: output,
//         })
//     }
// }