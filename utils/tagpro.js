const secrets = require('../secrets')

let usedTagproUsernames = new Set([])

exports.loginToTagpro = async (page) => {
  // Select TagPro username from pool of created accounts
  tagproUsername = secrets.TAGPRO_USERNAMES.find(username => !usedTagproUsernames.has(username))
  if (tagproUsername === undefined) {
    throw new Error('Error: All TagPro accounts being used.')
  }
  usedTagproUsernames.add(tagproUsername)

  // Go to OAuth page
  await page.goto('http://tagpro.koalabeast.com')
  await Promise.all([
    page.waitForNavigation(),
    page.click('#login-btn')
  ])

  // Input username and click "Next"
  await page.waitForSelector('#identifierId')  
  await page.type('#identifierId', tagproUsername)
  await page.waitForSelector('#identifierNext')
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0'}),
    page.click('#identifierNext')
  ])
  
  // Input password and click "Next"
  await page.waitForSelector('#password')
  await page.type('input[type="password"]', secrets.TAGPRO_PASSWORD)
  await page.waitForSelector('#passwordNext')
  await Promise.all([
    page.waitForNavigation(),
    page.click('#passwordNext')
  ])
}

exports.joinSpectators = async (page) => {
  await page.waitForSelector('#spectators .player-list')
  const spectatorsList = await page.$('#spectators .player-list')
  await spectatorsList.click()
  await spectatorsList.click({ clickCount: 2 })
}

exports.isInGame = (page) => {
  // Determine if given page is currently spectating a game
  return page.select('#viewport') !== undefined;
}