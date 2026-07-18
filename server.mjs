import { createReadStream } from "node:fs"
import { access, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"

const rootDirectory = path.dirname(fileURLToPath(import.meta.url))
const distDirectory = path.join(rootDirectory, "dist")
const dataFile = path.resolve(process.env.DAYMARK_DATA_FILE || path.join(rootDirectory, "data", "daytracker.json"))
const isDevelopment = process.argv.includes("--dev")
const port = Number(process.env.PORT || 4173)
const host = process.env.HOST || "0.0.0.0"
const emptyData = { version: 1, days: {} }
const maximumBodySize = 2 * 1024 * 1024

function isValidData(value) {
  if (
    !value ||
    typeof value !== "object" ||
    value.version !== 1 ||
    !value.days ||
    typeof value.days !== "object" ||
    Array.isArray(value.days)
  ) {
    return false
  }

  const entries = Object.entries(value.days)
  if (entries.length > 100_000) return false

  return entries.every(([date, entry]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !entry || typeof entry !== "object") return false
    return (
      (entry.score === null || (Number.isInteger(entry.score) && entry.score >= 1 && entry.score <= 10)) &&
      typeof entry.note === "string" &&
      entry.note.length <= 2000 &&
      typeof entry.updatedAt === "string"
    )
  })
}

async function ensureDataFile() {
  await mkdir(path.dirname(dataFile), { recursive: true })
  try {
    await access(dataFile)
  } catch {
    await writeFile(dataFile, `${JSON.stringify(emptyData, null, 2)}\n`, { encoding: "utf8", flag: "wx" }).catch((error) => {
      if (error.code !== "EEXIST") throw error
    })
  }
}

async function readData() {
  const parsed = JSON.parse(await readFile(dataFile, "utf8"))
  if (!isValidData(parsed)) throw new Error(`Invalid Daymark data in ${dataFile}`)
  return parsed
}

let pendingWrite = Promise.resolve()

function writeData(data) {
  const operation = pendingWrite.then(async () => {
    const temporaryFile = `${dataFile}.${process.pid}.tmp`
    await writeFile(temporaryFile, `${JSON.stringify(data, null, 2)}\n`, "utf8")
    await rename(temporaryFile, dataFile)
  })
  pendingWrite = operation.catch(() => {})
  return operation
}

function sendJson(response, statusCode, value) {
  const body = JSON.stringify(value)
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  })
  response.end(body)
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" })
  response.end(message)
}

async function readRequestBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > maximumBodySize) {
      const error = new Error("Request body is too large")
      error.statusCode = 413
      throw error
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString("utf8")
}

async function handleApi(request, response, pathname) {
  if (pathname !== "/api/data") return false

  if (request.method === "GET") {
    sendJson(response, 200, await readData())
    return true
  }

  if (request.method === "PUT") {
    let parsed
    try {
      parsed = JSON.parse(await readRequestBody(request))
    } catch (error) {
      sendText(response, error.statusCode || 400, error.message || "Invalid JSON")
      return true
    }

    if (!isValidData(parsed)) {
      sendText(response, 400, "Invalid Daymark data")
      return true
    }

    await writeData(parsed)
    response.writeHead(204, { "Cache-Control": "no-store" })
    response.end()
    return true
  }

  response.writeHead(405, { Allow: "GET, PUT" })
  response.end()
  return true
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
}

async function serveStatic(request, response, pathname) {
  let relativePath
  try {
    relativePath = decodeURIComponent(pathname).replace(/^\/+/, "") || "index.html"
  } catch {
    sendText(response, 400, "Invalid URL")
    return
  }

  let filePath = path.resolve(distDirectory, relativePath)
  if (filePath !== distDirectory && !filePath.startsWith(`${distDirectory}${path.sep}`)) {
    sendText(response, 403, "Forbidden")
    return
  }

  try {
    if (!(await stat(filePath)).isFile()) throw new Error("Not a file")
  } catch {
    filePath = path.join(distDirectory, "index.html")
  }

  const fileStats = await stat(filePath)
  response.writeHead(200, {
    "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
    "Content-Length": fileStats.size,
  })
  if (request.method === "HEAD") response.end()
  else createReadStream(filePath).pipe(response)
}

await ensureDataFile()

let vite
if (isDevelopment) {
  const { createServer: createViteServer } = await import("vite")
  vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" })
}

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`).pathname
    if (await handleApi(request, response, pathname)) return

    if (vite) {
      vite.middlewares(request, response, (error) => {
        if (error) {
          console.error(error)
          if (!response.headersSent) sendText(response, 500, "Development server error")
        }
      })
      return
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" })
      response.end()
      return
    }
    await serveStatic(request, response, pathname)
  } catch (error) {
    console.error(error)
    if (!response.headersSent) sendText(response, 500, "Internal server error")
    else response.end()
  }
})

server.listen(port, host, () => {
  console.log(`Daymark listening on http://localhost:${port}`)
  console.log(`Data file: ${dataFile}`)
})
