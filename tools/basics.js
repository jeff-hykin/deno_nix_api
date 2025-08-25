export const toNixValueSym = Symbol("toNixValueSym")

export const escapeStringForNix = (string)=>{
    return `"${string.replace(/\$\{|[\\"]/g, '\\$&').replace(/\u0000/g, '\\0')}"`
}

export function jsValueToNix(obj) {
    // 
    // custom
    // 
    if (obj[toNixValueSym] instanceof Function) {
        return obj[toNixValueSym]()
    }

    const objectType = typeof obj
    if (obj == null) {
        return `null`
    } else if (objectType == 'boolean') {
        return `${obj}`
    } else if (objectType == 'number') {
        // Nan
        if (obj !== obj) {
            return `null`
        // Infinitys
        } else if (obj*2 === obj) {
            return `"${obj}"`
        // floats and decimals
        } else {
            return `${obj}`
        }
    } else if (objectType == 'string') {
        return escapeStringForNix(obj)
    } else if (obj instanceof Object) {
        // 
        // Array
        // 
        if (obj instanceof Array) {
            if (obj.length == 0) {
                return `[]`
            } else {
                return `[\n${
                    obj.map(
                        each=>indent({string:jsValueToNix(each)})
                    ).join("\n")
                }\n]`
            }
        // 
        // Plain Object
        // 
        } else {
            const entries = Object.entries(obj)
            if (entries.length == 0) {
                return `{}`
            } else {
                let string = "{\n"
                for (const [key, value] of entries) {
                    const valueAsString = jsValueToNix(value)
                    const valueIsSingleLine = !valueAsString.match(/\n/)
                    if (valueIsSingleLine) {
                        string += indent({
                            string: `${escapeStringForNix(key)} = ${jsValueToNix(value)};`
                        }) + "\n"
                    } else {
                        string += indent({
                            string: `${escapeStringForNix(key)} = (\n${
                                indent({
                                    string: jsValueToNix(value)
                                })
                            });`
                        })+"\n"
                    }
                }
                string += "}"
                return string
            }
        }
    // } else { // TODO: add regex support (hard because of escaping)
    } else {
        throw Error(`Unable to convert this value to a Nix representation: ${obj}`)
    }
}