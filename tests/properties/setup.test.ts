import { describe, it } from 'vitest'
import fc from 'fast-check'

describe('property test tooling', () => {
  it('runs fast-check properties', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => a + b === b + a),
      { numRuns: 100 },
    )
  })
})
