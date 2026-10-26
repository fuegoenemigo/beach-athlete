import assert from 'node:assert/strict'
import test from 'node:test'
import { playerCardIdentity } from '../src/playerCardPresentation.js'

test('the card shows the selected sport and saved position without changing its ID', () => {
  assert.deepEqual(playerCardIdentity({ firstName: 'Marc', volleyballDiscipline: 'beach', beachPosition: 'defender' }),
    { discipline: 'beach', name: 'Marc', position: 'Abwehr', code: 'ABW' })
  assert.deepEqual(playerCardIdentity({ firstName: 'Alex', volleyballDiscipline: 'indoor', indoorPosition: 'setter' }),
    { discipline: 'indoor', name: 'Alex', position: 'Zuspieler', code: 'ZUS' })
})
