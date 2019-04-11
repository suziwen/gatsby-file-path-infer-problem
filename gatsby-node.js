const AdmZip = require('adm-zip')
const path = require(`path`)
const crypto = require(`crypto`)
const { createFileNode } = require(`gatsby-source-filesystem/create-file-node`)
const _ = require(`lodash`)
const CACHE_DIR = `.cache`
const UNZIP_DIR = `unzip`
exports.onCreateNode = async ({ node, getNode, loadNodeContent, actions, createNodeId, reporter, store, pathPrefix, cache}) => {
  if (node.internal.mediaType !== `application/zip`) {
    return
  }
  console.log(`unzip file : ${node.absolutePath}`)
  const { createNode, createParentChildLink } = actions
  const zip = new AdmZip(node.absolutePath)
  const programDir = store.getState().program.directory
  const targetDir = path.join(programDir, CACHE_DIR, UNZIP_DIR, node.relativeDirectory, node.name)
  zip.extractAllTo(targetDir, true)
  const zipEntries = zip.getEntries()
  const fileNodes = await Promise.all(_.map(zipEntries, async (zipEntry)=>{
      const filePath = path.join(targetDir, zipEntry.entryName)
      const fileNode = await createFileNode(filePath, createNodeId, {})
      fileNode.internal.description = `${node.internal.description} / ${filePath}`
      fileNode.parent = node.id
      createNode(fileNode, { name: `gatsby-source-filesystem` })
      createParentChildLink({ parent: node, child: fileNode })
      if (zipEntry.entryName === 'data.json') {
        const jsonContent = zip.readAsText(zipEntry.entryName)
        const jsonObj = JSON.parse(jsonContent)
        const jsonNode = {
          id: createNodeId(`${fileNode.id} >>> CustomJson`),
          children: [],
          parent: fileNode.id,
          title: jsonObj.title,
          cover: jsonObj.cover,
          internal: {
            content: jsonContent,
            type: 'CustomJson'
          }
        }
        jsonNode.internal.contentDigest = crypto.createHash(`md5`).update(JSON.stringify(jsonNode)).digest(`hex`)
        createNode(jsonNode)
        createParentChildLink({ parent: fileNode, child: jsonNode })
      }
      return fileNode
    })
  )
}
