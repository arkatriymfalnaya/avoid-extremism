const { XMLParser, XMLBuilder } = require('fast-xml-parser')
const fs = require('fs')
const path = require('path')
const yargs = require('yargs')

let replaceWithToolbar = str => str.replace(/[^\[|\/](meta|instagram|facebook|инстаграм|мета|фейсбук)[а-яА-Я]*/gi, a => {
  let start = a[0]
  let updatedStr = a.substring(1)

  return `${start}[su_tooltip text="Организация признана экстремистской на территории Российской Федерации."]<code> </code>${updatedStr}*<code> </code>[/su_tooltip]`
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

  const builder = new XMLBuilder({ processEntities:false })
  const xmlContent = builder.build(jObj)
  fs.writeFileSync(path.join(__dirname, `output_${fileName}`), xmlContent)
}

const options = yargs
  .usage(`Usage: --fn <fileName>`)
  .option('fn', { alias: 'fileName', describe: 'XML file name', type: 'string', demandOption: true })
  .argv

entry(options.fileName)
