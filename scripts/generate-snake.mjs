import fs from 'node:fs/promises'

const username = 'Ha1baraA11'
const year = 2026
const token = process.env.GITHUB_TOKEN

if (!token) throw new Error('GITHUB_TOKEN is required')

const query = `query($user:String!, $from:DateTime!, $to:DateTime!) {
  user(login:$user) {
    contributionsCollection(from:$from, to:$to) {
      contributionCalendar {
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
  }
}`

const response = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    authorization: `bearer ${token}`,
    'content-type': 'application/json',
    'user-agent': 'Ha1baraA11-contribution-snake',
  },
  body: JSON.stringify({
    query,
    variables: {
      user: username,
      from: `${year}-01-01T00:00:00Z`,
      to: `${year}-12-31T23:59:59Z`,
    },
  }),
})

const payload = await response.json()
if (!response.ok || payload.errors?.length) throw new Error(JSON.stringify(payload.errors ?? payload))

const weeks = payload.data.user.contributionsCollection.contributionCalendar.weeks
const cells = weeks.flatMap((week, x) => week.contributionDays.map((day, y) => ({ ...day, x, y })))
const levelColor = {
  NONE: '#161b22',
  FIRST_QUARTILE: '#0e4429',
  SECOND_QUARTILE: '#006d32',
  THIRD_QUARTILE: '#26a641',
  FOURTH_QUARTILE: '#39d353',
}

const size = 14
const gap = 4
const margin = 18
const width = margin * 2 + weeks.length * (size + gap) - gap
const height = margin * 2 + 7 * (size + gap) - gap

const ordered = []
for (let x = 0; x < weeks.length; x++) {
  const ys = [...Array(7).keys()]
  if (x % 2) ys.reverse()
  for (const y of ys) {
    const cell = cells.find((item) => item.x === x && item.y === y)
    if (cell) ordered.push(cell)
  }
}

const rects = cells.map((cell) => {
  const x = margin + cell.x * (size + gap)
  const y = margin + cell.y * (size + gap)
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="3" fill="${levelColor[cell.contributionLevel] ?? levelColor.NONE}"><title>${cell.date}: ${cell.contributionCount} contributions</title></rect>`
}).join('')

const points = ordered.map((cell) => `${margin + cell.x * (size + gap) + size / 2},${margin + cell.y * (size + gap) + size / 2}`).join(' ')
const pathLength = Math.max(1, ordered.length * (size + gap))
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#0d1117"/><g>${rects}</g><polyline points="${points}" fill="none" stroke="#bf00ff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${size * 9} ${pathLength}" stroke-dashoffset="0" opacity=".95"><animate attributeName="stroke-dashoffset" from="0" to="-${pathLength}" dur="12s" repeatCount="indefinite"/></polyline></svg>`

await fs.mkdir('dist', { recursive: true })
await fs.writeFile('dist/snake.svg', svg)
await fs.writeFile('dist/snake-dark.svg', svg)
