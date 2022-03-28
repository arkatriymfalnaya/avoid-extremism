const { XMLParser, XMLBuilder } = require('fast-xml-parser')
const posthtml = require('posthtml')
const fs = require('fs')
const path = require('path')
const yargs = require('yargs')

const exRegExp = /(meta|instagram|facebook|инстаграм|мета|фейсбук)[а-яА-Я]*/gui

let gotMatchInsideMd = str => {
  let m = str.match(/\[\/[a-zA-Z]\w*/)
  if(m) {
    let tagName = m[0].replace('[/', '')
    let tagContent = str.match(new RegExp('(.*?)' + `\\/${tagName}`, 'ui')) || str.match(new RegExp(`\\[${tagName}` + '.*', 'ui'))

    if(exRegExp.test(tagContent[1])) return true
  }

  return false
}

let replaceWithFootnote = (str, isTitle = false) => str.replace(exRegExp, (subStr, _, subStrIndex) => {
  let nextIndex = subStrIndex + subStr.length
  let nextSymbol = str[nextIndex]

  if(
    subStr.includes('вселен') ||
    subStr.includes('vers')
  ) return subStr

  let space = '<code style="letter-spacing: -7px;"> </code>'

  let start = str[subStrIndex - 1] === ' ' ? space : ''
  let end = nextSymbol === ' ' ? space : ''

  let tooltipText =
    subStr.includes('нстагра') || subStr.includes('ейсб') || subStr.includes('nstagr') || subStr.includes('aceboo')
      ? 'Продукт принадлежит организации, признанной экстремистской на территории Российской Федерации.'
      : 'Организация признана экстремистской на территории Российской Федерации.'

  let res = isTitle ? `${subStr}*` : `${start}[su_tooltip text="${tooltipText}" text_align="center"]${subStr}[/su_tooltip]${end}`
  return res
})

let replaceTreeContentRecursively = node => {
  if(node.content) {
    if(node.content.length) {
      if(node.content.length === 1 && typeof node.content[0] === 'string') {
        node.content[0] = replaceWithFootnote(node.content[0], gotMatchInsideMd(node.content[0]))
      } else {
        for(let i = 0; i <= node.content.length - 1; i++) {
          node.content[i] = replaceTreeContentRecursively(node.content[i])
        }
      }
    }
  } else if (typeof node === 'string') {
    node = replaceWithFootnote(node, gotMatchInsideMd(node)) 
  }

  return node
}

let entry = async (fileName) => {
  const data = fs.readFileSync(path.join(__dirname, fileName), 'utf8')
  const parser = new XMLParser()
  let jObj = parser.parse(data)

  let items = !Array.isArray(jObj.rss.channel.item) ? [ jObj.rss.channel.item ] : jObj.rss.channel.item

  for(let i = 0; i <= items.length - 1; i++) {
    let title = items[i]['title']
    let newTitle = replaceWithFootnote(title, true)
    items[i]['title'] = newTitle
  
    let metasArray = items[i]['wp:postmeta']
    let newMetasArray = metasArray.map(m => {
      if(m['wp:meta_key'] === '_crb_description' || m['wp:meta_key'] === '_crb_short_description') {
        let newMeta = replaceWithFootnote(m['wp:meta_value'])
        m['wp:meta_value'] = newMeta
      }
      
      return m
    })
    items[i]['wp:postmeta'] = newMetasArray
  
    let content = items[i]['content:encoded']
    let newContent = posthtml().use(tree => {
      for(let i = 0; i <= tree.length - 1; i++) {
        tree[i] = replaceTreeContentRecursively(tree[i])
      }

      return tree
    }).process(content, { sync: true }).html
    items[i]['content:encoded'] = newContent
  }

  const itemsBuilder = new XMLBuilder({ arrayNodeName: 'item' })
  const xmlItems = itemsBuilder.build(items)
  fs.writeFileSync(path.join(__dirname, `output_${fileName}`), xmlItems)
}

const options = yargs
  .usage(`Usage: --fn <fileName>`)
  .option('fn', { alias: 'fileName', describe: 'XML file name', type: 'string', demandOption: true })
  .argv

entry(options.fileName)
