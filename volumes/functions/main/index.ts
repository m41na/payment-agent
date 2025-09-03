import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { pathname } = new URL(req.url)

  if (pathname === '/') {
    return new Response('Edge Functions are running!', {
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return new Response('Function not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain' },
  })
})
