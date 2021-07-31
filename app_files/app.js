const qoa = require('qoa');
const colors = require('colors');
const htmlFormatter = require('html-beautify')
const fs = require('fs')
 
const puppeteer = require('puppeteer');
let browserPage = {
  html : async (src) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    let path = `/html/${src.replace('http://', "").replace('https://', "")}`
    page.on('response',async response => {
      if(response.request().resourceType() === 'stylesheet') {
        let css = await response.text() 
        if(!fs.existsSync(`..${path}`)){
          fs.mkdir(`..${path}`, (err) => {
            if(err) return console.log(err)
          })
        }
        fs.writeFile(`..${path}/style.css`, css, (err) => {
          if(err) console.log(err)
        })
      }
    });
    await page.goto(src)
    fs.writeFile(`..${path}/index.html`, htmlFormatter(await page.evaluate(() => document.documentElement.outerHTML)), (err) => {
      if(err) console.log(err)
    })
    return `CLI-Scraper${path}`
  },
  png : async (src, props) => {
    let path = `/png/${src.replace('http://', "").replace('https://', "")}.png`
    const browser = await puppeteer.launch();
    const page = await browser.newPage()
    await page.setViewport(Object.assign({deviceScaleFactor : 1}, props))
    await page.goto(src);
    await page.screenshot({ path: `..${path}` })
    return `CLI-Scraper${path}`
  },

  pdf : async (src, props) => {
    let { format } = props
    let path = `/pdf/${src.replace('http://', "").replace('https://', "")}.pdf`
    const browser = await puppeteer.launch();
    const page = await browser.newPage()
    await page.goto(src)  
    await page.pdf({ path: `..${path}`, format: format })
    return `CLI-Scraper${path}`
  }
}

function askUser(){
  qoa.prompt([{
    type: 'input',
    query: 'De quel site souhaitez vous obtenir un rendu ? \n >',
    handle: 'url',
    symbol: '>',
  }]).then((rs) => {
    if(!rs.url.startsWith('http')) rs.url = `http://${rs.url}`
    qoa.prompt([{
      type: 'input',
      query: 'Quel type de fichier voulez vos obtenir ? (PNG, PDF, HTML) \n >',
      handle: 'renderType',
      symbol: '>',
    }]).then(async (res) => {
      if(browserPage[res.renderType.toLowerCase()]){
        let props = {
          width : 1920,
          height : 1080,
          format : "a4"
        }
        if(res.renderType.toLowerCase() == "png"){
          Object.assign(props, await qoa.input({
            query: "Largeur de l'image (en pixels) : \n >",
            handle: 'width'}),

            await qoa.input({
              query: "Hauteur de l'image (en pixels) : \n >",
              handle: 'height'
            })
          );
        } else if(res.renderType.toLowerCase() == "pdf"){
          Object.assign(props, await qoa.input({
            query: "Format du PDF (a1, a2,..., a6):  \n >",
            handle: 'format'
          }))
        }
        props.height = parseInt(props.height); props.width = parseInt(props.width);
        browserPage[res.renderType.toLowerCase()](rs.url, props).then(async (path) => {
          console.log(colors.green(`Fichier sauvegardé avec succès !`), colors.cyan(`\nChemin d'accès : ${path}`))
          askUser()
        })    
      } else {
        console.log(colors.red('Erreur : Ce type de fichier ne peut pas être utilisé en tant que méthode de rendu'))
        askUser()        
      }
    });
  })
}
askUser()