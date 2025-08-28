import { treeToAstString, parse } from "./parsing_pure.js"
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