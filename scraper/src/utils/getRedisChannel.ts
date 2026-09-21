import { config } from "../config/index.js"

export default function getRedisChannel() {
    return `${config.ID}_domain`
}

export function getRedisCheckedLinksKey(domain : string){
    return `${domain}_checkedLinks`
}

export function getRedisPauseStatusKey(domain : string){
    return `${domain}_pause_status`
}

export function getRedisResultKey(domain : string){
    return `${domain}_results`
}

export function getRedisDurationKey(domain : string){
    return `${domain}_duration`
}

export function getRedisHealthKey(){
    return `${config.ID}_status`
}

// Per-link progress feed for a domain. The API subscribes with PSUBSCRIBE scan:progress:*
// and fans each frame out to the dashboard over WebSockets; nothing else consumes it, so a
// missing subscriber is a no-op rather than an error.
export function getRedisProgressChannel(domain : string){
    return `scan:progress:${domain}`
}
