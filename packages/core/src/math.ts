import Decimal from 'decimal.js'

export const sum = (values: number[]): number => values.reduce((total, value) => total.plus(value), new Decimal(0)).toNumber()

export const times = (left: number, right: number): number => new Decimal(left).times(right).toNumber()

export const ratio = (numerator: number, denominator: number): number => new Decimal(numerator).div(denominator).toNumber()

/** numerator / denominator * scale, rounded half-up to an integer. */
export const roundedShare = (numerator: number, denominator: number, scale: number): number =>
  new Decimal(numerator).times(scale).div(denominator).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber()
