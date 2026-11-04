export const normalizeText = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ')

export const normalizeDomain = (domain: string): string => normalizeText(domain).replace(/^www\./, '')

export const normalizeSkill = normalizeText
