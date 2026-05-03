import fastify from 'fastify'

export default function build() {
  const server = fastify({ logger: true })

  server.get('/', async () => {
    return { hello: 'world' }
  })

  return server
}

const start = async (): Promise<void> => {
  const server = build()
  try {
    const port = parseInt(process.env.PORT || '3001', 10)
    await server.listen({ port, host: '0.0.0.0' })
    server.log.info(`Server listening on port ${port}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start()
}
