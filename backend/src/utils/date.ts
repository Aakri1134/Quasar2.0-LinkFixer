export function isAfter(current : string | Date, compare : string | Date){
    const c = new Date(current)
    const n = new Date(compare)
    return n > c
}