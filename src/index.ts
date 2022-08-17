import nodeHtmlToImage from 'node-html-to-image'
import matter from 'gray-matter'
import fs from 'fs'
import { generateBase64ImageUrl } from './utils/http-utils'
import { chunk } from './utils/string-utils'
import { checkAndCreateDirectory } from './utils/file-utils'

interface IOptions {
  contentDir: string,
  outputDir: string,
}

const MAX_CONCURRENT_PUPPETEER_PROCS = 5

async function main(options: IOptions) {
  const filenames = (await fs.promises.readdir(options.contentDir)).filter(filename => filename !== '_index.md')

  console.log(`Generating social cards for (${filenames.length}) articles.`)

  // Process in chunks rather than all at once - each call will spin up a new Puppeteer process.
  const groups: string[][] = chunk(filenames, MAX_CONCURRENT_PUPPETEER_PROCS)

  for (const group of groups) {
    await Promise.all(group.map(async (filename) => {
      return await generateSocialCardForArticle(filename, options)
    }))
  }

  console.log(`Social cards have been successfully written to: ${options.outputDir}`)
}

async function generateSocialCardForArticle(filename: string, options: IOptions) {
  const outputFilename = filename.split('.')[0] + '.png'

  const file = await fs.promises.readFile(`${options.contentDir}/${filename}`)

  const frontMatter = matter(file)

  checkAndCreateDirectory(options.outputDir)

  const html = await generateTemplate(frontMatter)
  
  return nodeHtmlToImage({
    output: options.outputDir + "/" + outputFilename,
    html,
  })
}

async function generateTemplate(frontMatter: matter.GrayMatterFile<Buffer>): Promise<string> {
  const currentDir = process.cwd()
  const readingTimeInMinutes = calculateReadingTime(frontMatter.content)

  const title = frontMatter.data.title
  const author = frontMatter.data.author
  const authorAvatar = frontMatter.data.authoravatar
  const hero = frontMatter.data.hero

  // Puppeteer can't render locally hosted images, so we need to generate base64 images and
  // embed them rather than reference a 'file://' URL
  const logoImage = await generateBase64ImageUrl(`${currentDir}/assets/images/reflect-logo-dark.png`)
  const heroImage = await generateBase64ImageUrl(`${currentDir}/assets/images/${hero}`)
  const authorAvatarImage = await generateBase64ImageUrl(`${currentDir}/assets/images/${authorAvatar}`)

  return `
    <!DOCTYPE html>
    <style>
    html, body {
        width: 540px;
        max-width: 540px;
        height: 450px;
        max-height: 450px;
        margin: 0;
        padding: 0;
        overflow: none;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    }

    body {
        background-image: 
          linear-gradient(0deg, rgba(0,0,0, .51), rgba(0,0,0, .27), rgba(0,0,0,.27), rgba(0,0,0, .51)),
          url('${heroImage}');
        background-size: cover;
        background-position: center center;
        background-repeat: no-repeat;
        font-feature-settings: 'kern';
        -webkit-font-smoothing: antialiased;
    }

    h1 {
        font-size: 42px;
        color: #FFFFFF;
        line-height: 52px;
        text-shadow: 0 2px 1px rgba(0,0,0,0.70);
    }

    .author {
        font-size: 18px;
        font-weight: 500;
        color: #FFFFFF;
        line-height: 1.5;
    }

    .minutes {
        opacity: 0.88;
        font-weight: 500;
        font-size: 18px;
        color: #DEDEDE;
    }

    .flexbox-col {
        display: flex !important;
        flex-direction: column;
        flex-wrap: nowrap;
    }
      
    .flexbox-row {
        display: flex !important;
    }

    .stretch {
        flex-grow: 1;
    }

    .justify-space-between { justify-content: space-between; }

    .justify-end { justify-content: flex-end; }

    </style>
    <html>
      <body class="flexbox-col justify-space-between">
        <div class="stretch" style="margin-top: 24px; margin-left: 24px; margin-right: 24px;">
          <div class="flexbox-row">
            <img src="${authorAvatarImage}" class="mr-1" style="margin-right: 8px; border-radius: 50%; width: 48px; border: 2px solid white;" />
            <div class="flexbox-col">
              <div class="author">${author}</div>
              <div class="minutes">${readingTimeInMinutes} min read</div>
            </div>
          </div>
          <h1>${title}</h1>
        </div>
        <div class="flexbox-row justify-end" style="margin-left: 24px; margin-right: 24px;">
          <img src="${logoImage}" style="margin-bottom: 24px; width: 181px;" />
        </div>
      </body>
    </html>
  `
}

/**
 * This attempts to replicate Hugo's method for calculating "Reading Time". It doesn't exactly match how Hugo does it, so this could be
 * a minute off.
 */
function calculateReadingTime(content: string): number {
  // See https://github.com/gohugoio/hugo/blob/35fa192838ecfa244335fca957e55d3956a48665/hugolib/page__per_output.go#L659
  const wordCount = content.split(' ').length
  return Math.max(Math.round(wordCount / 213), 1)
}

if (process.argv.length !== 4) {
  console.log('Usage: node index.js <content-directory> <output-directory>')
  process.exit(1)
}

const contentDir = process.argv[2]
const outputDir = process.argv[3]

main({
  contentDir,
  outputDir,
})
