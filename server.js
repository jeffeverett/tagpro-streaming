#!/usr/bin/env node

const Express = require('express')
const puppeteer = require('puppeteer')
const secrets = require('./secrets')

const app = Express()

const Port = process.env.PORT || 8093

const APPROVED_HOSTNAMES = new Set([
  'tagpro.koalabeast.com'
])
let usedTagproUsernames = new Set([])
let usedTwitchKeys = new Set([])

const errFunction = (res, message) => {
  if (res.headersSent) {
    console.log(message)
    res.end()
  }
  else {
    console.log(message)
    res.json({
      err: message,
      data: null
    })
  }
}

const loginToTagpro = async (page) => {
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

app.get('/startstream', async (req, res) => {
  // Ensure URL query argument is correct
  if (!req.query.url) {
    return errFunction(res, 'Error: Must specify URL.')
  }
  try {
    const urlObject = new URL(req.query.url)
    if (!APPROVED_HOSTNAMES.has(urlObject.hostname)) {
      return errFunction(res, 'Hostname not approved.');
    }
  }
  catch {
    return errFunction(res, 'Error: URL is not valid.')
  }
  const url = req.query.url

  // Launch Chromium via Puppeteer
  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    const page = await browser.newPage()
    await loginToTagpro(page)
    await page.goto(url)
    if (page.url() != url) {
      // Immediate redirect indicates group was not valid
      return errFunction(res, 'Error: invalid group')
    }
    await page.waitForSelector('#spectators .player-list')
    await page.click('#spectators .player-list', { clickCount: 2, delay: 10 })
  }
  catch (err) {
    return errFunction(res, err.toString())
  }

  res.send({
    err: null,
    data: {
      url: 'stream link'
    }
  })
})

app.get('/stopstream', async (req, res) => {
  

  res.send({
    err: 'Not implemented',
    data: null
  })
})

app.listen(Port, '0.0.0.0', () => console.log(`Listening on port ${Port}`))
