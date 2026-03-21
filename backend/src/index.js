export default {
    async fetch(request, env, ctx) {
      // 1. CORS Preflight Policy: Permit calls primarily from your live site to prevent abuse
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*", // Change to "https://idontknowwhattosay.net" securely after testing
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      };
  
      if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }
  
      if (request.method !== "POST") {
        return new Response("This proxy only accepts POST requests for Mei's brain.", { status: 405, headers: corsHeaders });
      }
  
      try {
        // 2. Parse the chat history sent from index.html
        const body = await request.json();
  
        // 3. Inject the Secret API Key stored only on Cloudflare's servers
        const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
  
        // 4. Forward the payload to Google Gemini securely
        const geminiResponse = await fetch(GEMINI_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
  
        const geminiData = await geminiResponse.json();
  
        // 5. Send the generated AI answer back down to the user's browser securely
        return new Response(JSON.stringify(geminiData), {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
  
      } catch (error) {
        return new Response(JSON.stringify({ error: "Backend proxy error.", details: error.message }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      }
    }
  };
