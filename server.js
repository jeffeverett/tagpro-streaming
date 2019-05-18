#!/usr/bin/env node

const Express = require('express')
const puppeteer = require('puppeteer')
const { loginToTagpro, joinSpectators, isInGame } = require('./utils/tagpro')
const { startOBSStream } = require('./utils/obs')
const app = Express()

const Port = process.env.PORT || 8093

const APPROVED_HOSTNAMES = new Set([
  'tagpro.koalabeast.com'
])
let activateStreamInfo = {}

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

app.get('/startstream', async (req, res) => {
  // Ensure URL query argument is correct
  if (!req.query.url) {
    return errFunction(res, 'Error: Must specify URL.')
  }
  try {
    const urlObject = new URL(req.query.url)
    if (!APPROVED_HOSTNAMES.has(urlObject.hostname)) {
      return errFunction(res, 'Hostname not approved.')
    }
  }
  catch {
    return errFunction(res, 'Error: URL is not valid.')
  }
  const url = req.query.url
  let groupName = ''
  try {
    groupName = url.split('/groups/')[1]
    if (activateStreamInfo[groupName] !== undefined) {
      return errFunction(res, 'Error: There is already an active stream for this group.')
    }
  }
  catch {
    return errFunction(res, 'Error: Not valid group name.')
  }

  try {
    // Launch Chromium via Puppeteer
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    const page = await browser.newPage()
    await loginToTagpro(page)
    await page.goto(url, { waitUntil: 'networkidle2' })
    if (page.url() != url) {
      // Immediate redirect indicates group was not valid
      return errFunction(res, 'Error: invalid group')
    }
    await joinSpectators(page)

    // Launch OBS
    const PID = page.browser().process().pid
    const obsProcess = startOBSStream(PID)
    
  }
  catch (err) {
    return errFunction(res, err.toString())
  }

  // Check timing conditions:
  // (1) Total time does not exceed 3 hours
  // (2) Time since in game does not exceed 15 minutes
  let totalTime = 0
  let timeSinceInGame = 0
  let wasInGame = false
  const repTime = 1000*60*5           // 5 minutes
  const totalTimeLimit = 1000*60*60*3 // 3 hours
  const waitTimeLimit = 1000*60*15    // 15 minutes
  setTimeout(() => {
    totalTime += repTime
    if (totalTime > totalTimeLimit) {
      shutdownStream(groupName)
    }
    if (!isInGame(page)) {
      if (!wasInGame) {
        timeSinceInGame += repTime;
        if (timeSinceInGame > waitTimeLimit) {
          shutdownStream(groupName)
        }
      }
      wasInGame = false
    }
    else {
      wasInGame = true;
      timeSinceInGame = 0;
    }
  }, repTime)

  // Send result info
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
