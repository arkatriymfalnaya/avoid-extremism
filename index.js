const { XMLParser, XMLBuilder } = require('fast-xml-parser')
const fs = require('fs')
const path = require('path')
const yargs = require('yargs')

let replaceWithToolbar = str => str.replace(/[^\[|\/](meta|instagram|facebook|инстаграм|мета|фейсбук)[а-яА-Я]*/gi, (subStr, _, subStrIndex) => {
  let nextSymbol = str[subStrIndex + subStr.length]
  
  if(str[subStrIndex - 3] + str[subStrIndex - 2] + str[subStrIndex - 1] + str[subStrIndex] === 'www.') return subStr

  let space = '<code style="letter-spacing: -7px;"> </code>'

  let start = subStr[0]
  let end = nextSymbol === ' ' ? space : ''
  let updatedStr = subStr.substring(1)

  let tooltipText =
    subStr.includes('нстагра') || subStr.includes('ейсб') || subStr.includes('nstagr') || subStr.includes('aceboo')
      ? 'Продукт принадлежит организации, признанной экстремистской на территории Российской Федерации.'
      : 'Организация признана экстремистской на территории Российской Федерации.'

  return `${start}[su_tooltip text="${tooltipText}"]${space}${updatedStr}*[/su_tooltip]${end}`
})

let entry = async (fileName) => {
  const data = fs.readFileSync(path.join(__dirname, fileName), 'utf8')
  const parser = new XMLParser()
  let jObj = parser.parse(data)
  
  let metasArray = jObj.rss.channel.item['wp:postmeta']
  let newMetasArray = metasArray.map(m => {
    if(m['wp:meta_key'] === '_crb_description' || m['wp:meta_key'] === '_crb_short_description') {
      let newMeta = replaceWithToolbar(m['wp:meta_value'])
      m['wp:meta_value'] = newMeta
    }
    
    return m
  })
  jObj.rss.channel.item['wp:postmeta'] = newMetasArray
  
  let content = jObj.rss.channel.item['content:encoded']
  let newContent = replaceWithToolbar(content)
  jObj.rss.channel.item['content:encoded'] = newContent
  
  jObj.rss.channel.item['wp:status'] = '<![CDATA[draft]]>'
  
  const builder = new XMLBuilder({ processEntities: false })
  const xmlContent = builder.build(jObj)
  fs.writeFileSync(path.join(__dirname, `output_${fileName}`), xmlContent)
}

const options = yargs
  .usage(`Usage: --fn <fileName>`)
  .option('fn', { alias: 'fileName', describe: 'XML file name', type: 'string', demandOption: true })
  .argv

entry(options.fileName)
