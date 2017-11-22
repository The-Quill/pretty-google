#!/usr/bin/env node

require('babel-polyfill')

const puppeteer = require('puppeteer')
const { terminal } = require('terminal-kit')
const opn = require('opn')

let args = process.argv.slice(2)
if (args.length === 0){
  throw new Error('No File Provided')
}
const term = args.join(' ').replace(/ /g, '%20')
const icon = `https://www.google.com.au/images/branding/googlelogo/2x/googlelogo_color_120x44dp.png`
const options = {
  shrink: { width: 120 / 2, height: 44 / 3 }
}
terminal.clear()
const exit = (success = false) => {
  terminal.moveTo(0, 20 + (success ? 2 : 0))
  terminal.grabInput(false)
  setTimeout(_ => process.exit(), 100)
}
terminal.on('key', name => name === 'CTRL_C' ? exit() : '')
terminal.drawImage(icon, options, async (...args) => {
  const browser = await puppeteer.launch({
    headless: true
  });
  const page = await browser.newPage();
  page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.79 Safari/537.36')
  await page.goto(`https://google.com.au/search?q=${term}`, {
    waitUntil: "load",
    // timeout: 1000
  })
  const results = await page.evaluate(() => {
    let from = (elems = []) => {
      let finished = []
      elems.forEach(e => finished.push(e))
      return finished
    }
    let elems = from(document.querySelectorAll('#rso .srg div.g:not(.mnr-c)'))
    let titles = []
    return elems.map((elem, index) => {
      let title = elem.querySelector('h3.r a').innerText
      if (titles.indexOf(title) !== -1){
        return null
      }
      titles.push(title)
      return ({
        title,
        url: elem.querySelector('h3.r a').href,
        urlFake: elem.querySelector('cite._Rm').innerText,
        date: (elem.querySelector('span.st span.f') || document.createElement('div')).innerText.replace(/ - $/, ''),
        description: elem.querySelector('span.st').innerText.replace((elem.querySelector('span.st span.f') || document.createElement('div')).innerText, ''),
        links: from(elem.querySelectorAll('div.osl a.fl')).filter(_ => _).map(link => ({
          url: link.href,
          title: link.innerText || ''
        }))
      })
    }).filter(_ => _)
  })
  await browser.close()
  var options = {
      style: terminal.inverse,
      selectedStyle: terminal.dim.blue.bgGreen
  }
  terminal.grabInput({ mouse: 'button' })
  terminal.singleColumnMenu(results.map(_ => _.title), options, (error, response) => {
    terminal('\n').inverse().green(
      "#%s selected: %s\n",
      response.selectedIndex,
      response.selectedText
    )
    opn(results[response.selectedIndex].url).then(_ => exit(true))
  })
})